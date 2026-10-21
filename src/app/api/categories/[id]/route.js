import { NextResponse } from "next/server";
import { queryOne, execute, writeAuditLog } from "@/lib/db";
import { wantsManualEn, canUseManualEn, resolveLocalized } from "@/lib/manual-translate";
import { requirePermission } from "@/lib/auth";
import { apiMessage } from "@/lib/api-messages";
import { slugify } from "@/lib/utils";
import { CATEGORY_ICONS } from "@/lib/preset-icons";

export const runtime = "edge";

export async function PUT(request, { params }) {
  const { user, response } = await requirePermission(request, "categories.edit");
  if (!user) return response;

  const { id } = await params;
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

  const existing = await queryOne("SELECT id FROM categories WHERE id = ?", [id]);
  if (!existing) {
    return NextResponse.json({ error: apiMessage(request, "notFound") }, { status: 404 });
  }

  const duplicate = await queryOne("SELECT id FROM categories WHERE slug = ? AND id != ?", [slug, id]);
  if (duplicate) {
    return NextResponse.json({ error: apiMessage(request, "category.duplicate") }, { status: 409 });
  }

  const name = await resolveLocalized(nameInput, body?.name_en, manual);
  const description = await resolveLocalized(descriptionInput, body?.description_en, manual);

  await execute(
    `UPDATE categories
     SET name_tr = ?, name_en = ?, slug = ?, description_tr = ?, description_en = ?, icon_key = ?, display_order = ?
     WHERE id = ?`,
    [name.tr, name.en, slug, description.tr || null, description.en || null, iconKey, displayOrder, id]
  );

  await writeAuditLog(user, "update", "category", id, { name: nameInput, slug });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const { user, response } = await requirePermission(request, "categories.delete");
  if (!user) return response;

  const { id } = await params;

  const existing = await queryOne("SELECT id FROM categories WHERE id = ?", [id]);
  if (!existing) {
    return NextResponse.json({ error: apiMessage(request, "notFound") }, { status: 404 });
  }

  await execute("UPDATE products SET category_id = ? WHERE category_id = ?", [null, id]);
  await execute("DELETE FROM categories WHERE id = ?", [id]);

  await writeAuditLog(user, "delete", "category", id);
  return NextResponse.json({ ok: true });
}
