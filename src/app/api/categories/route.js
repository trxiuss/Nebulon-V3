import { NextResponse } from "next/server";
import { query, queryOne, execute, writeAuditLog } from "@/lib/db";
import { wantsManualEn, canUseManualEn, resolveLocalized } from "@/lib/manual-translate";
import { requirePermission } from "@/lib/auth";
import { apiMessage } from "@/lib/api-messages";
import { slugify } from "@/lib/utils";
import { CATEGORY_ICONS } from "@/lib/preset-icons";

export const runtime = "edge";

export async function GET() {
  const categories = await query(
    "SELECT * FROM categories ORDER BY display_order IS NULL, display_order ASC, id ASC"
  );
  const activeProducts = await query(
    "SELECT category_id FROM products WHERE category_id IS NOT NULL AND is_active = ?",
    [1]
  );

  const counts = {};
  for (const product of activeProducts) {
    counts[product.category_id] = (counts[product.category_id] || 0) + 1;
  }

  const rows = categories.map((category) => ({
    ...category,
    active_product_count: counts[category.id] || 0
  }));

  return NextResponse.json(rows);
}

export async function POST(request) {
  const { user, response } = await requirePermission(request, "categories.create");
  if (!user) return response;

  const body = await request.json().catch(() => null);
  const manual = wantsManualEn(body);
  if (manual && !canUseManualEn(user)) {
    return NextResponse.json({ error: apiMessage(request, "auth.forbidden") }, { status: 403 });
  }
  const nameInput = body?.name_tr?.trim();
  const slug = slugify(body?.slug?.trim() || nameInput || "");
  const displayOrder =
    body?.display_order === "" || body?.display_order === null || body?.display_order === undefined
      ? null
      : Number(body.display_order);
  const descriptionInput = body?.description_tr?.trim() || "";
  const iconKey = CATEGORY_ICONS.includes(body?.icon_key) ? body.icon_key : null;

  if (!nameInput || !slug || !Number.isInteger(displayOrder)) {
    return NextResponse.json({ error: apiMessage(request, "category.required") }, { status: 400 });
  }

  const duplicate = await queryOne("SELECT id FROM categories WHERE slug = ?", [slug]);
  if (duplicate) {
    return NextResponse.json({ error: apiMessage(request, "category.duplicate") }, { status: 409 });
  }

  const name = await resolveLocalized(nameInput, body?.name_en, manual);
  const description = await resolveLocalized(descriptionInput, body?.description_en, manual);

  const result = await execute(
    `INSERT INTO categories (name_tr, name_en, slug, description_tr, description_en, icon_key, display_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name.tr, name.en, slug, description.tr || null, description.en || null, iconKey, displayOrder]
  );

  await writeAuditLog(user, "create", "category", result.meta?.last_row_id, { name: nameInput, slug });
  return NextResponse.json({ ok: true, id: result.meta?.last_row_id });
}
