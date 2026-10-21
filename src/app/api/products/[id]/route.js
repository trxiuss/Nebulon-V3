import { NextResponse } from "next/server";
import { queryOne, execute, writeAuditLog } from "@/lib/db";
import { wantsManualEn, canUseManualEn, resolveLocalized } from "@/lib/manual-translate";
import { requirePermission } from "@/lib/auth";
import { apiMessage } from "@/lib/api-messages";
import { normalizeHttpUrl } from "@/lib/utils";
import { validateCounterApiUrl } from "@/lib/external-counter";
import { PRODUCT_IMAGE_PRESETS, PRODUCT_TECH_TAGS } from "@/lib/preset-icons";

export const runtime = "edge";

export async function PUT(request, { params }) {
  const { user, response } = await requirePermission(request, "products.edit");
  if (!user) return response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const manual = wantsManualEn(body);
  if (manual && !canUseManualEn(user)) {
    return NextResponse.json({ error: apiMessage(request, "auth.forbidden") }, { status: 403 });
  }
  const titleInput = body?.title_tr?.trim();
  const shortDescInput = body?.short_desc_tr?.trim() || "";
  const categoryId = body?.category_id ? Number(body.category_id) : null;
  const isActive = body?.is_active === false ? 0 : 1;
  const imageType = body?.image_type === "preset" ? "preset" : "url";
  const rawImageValue = body?.image_value?.trim() || "";
  const imageValue = imageType === "preset"
    ? (PRODUCT_IMAGE_PRESETS.includes(rawImageValue) ? rawImageValue : "")
    : normalizeHttpUrl(rawImageValue) || "";
  const counterApiInput = typeof body?.counter_api_url === "string" ? body.counter_api_url.trim() : "";
  const counterApiUrl = counterApiInput ? await validateCounterApiUrl(counterApiInput) : "";
  const countIconType = body?.count_icon_type === "eye" ? "eye" : "download";
  const pricingType = body?.pricing_type === "paid" ? "paid" : "free";
  const actionType = ["download", "view", "purchase", "github"].includes(body?.action_type)
    ? body.action_type
    : "download";
  const actionIconType = ["download", "eye", "purchase", "github"].includes(body?.action_icon_type)
    ? body.action_icon_type
    : "download";
  const actionUrl = normalizeHttpUrl(body?.action_url);
  const techTags = Array.isArray(body?.tech_tags)
    ? body.tech_tags.filter((tag) => PRODUCT_TECH_TAGS.includes(tag)).slice(0, PRODUCT_TECH_TAGS.length)
    : [];

  if (!titleInput) {
    return NextResponse.json({ error: apiMessage(request, "product.required") }, { status: 400 });
  }

  if (!actionUrl) {
    return NextResponse.json({ error: apiMessage(request, "product.actionUrl") }, { status: 400 });
  }

  if (counterApiInput && !counterApiUrl) {
    return NextResponse.json({ error: apiMessage(request, "product.counterApiUrl") }, { status: 400 });
  }

  const existing = await queryOne("SELECT id FROM products WHERE id = ?", [id]);
  if (!existing) {
    return NextResponse.json({ error: apiMessage(request, "notFound") }, { status: 404 });
  }

  if (categoryId) {
    const category = await queryOne("SELECT id FROM categories WHERE id = ?", [categoryId]);
    if (!category) {
      return NextResponse.json({ error: apiMessage(request, "product.category") }, { status: 400 });
    }
  }

  const title = { tr: titleInput, en: titleInput };
  const shortDesc = await resolveLocalized(shortDescInput, body?.short_desc_en, manual);

  await execute(
    `UPDATE products SET
       category_id = ?, title_tr = ?, title_en = ?, short_desc_tr = ?, short_desc_en = ?, is_active = ?,
       image_type = ?, image_value = ?, download_count = ?, counter_api_url = ?, count_icon_type = ?, pricing_type = ?,
       action_type = ?, action_icon_type = ?, action_url = ?, tech_tags = ?
     WHERE id = ?`,
    [
      categoryId,
      title.tr,
      title.en,
      shortDesc.tr || null,
      shortDesc.en || null,
      isActive,
      imageType,
      imageValue || null,
      null,
      counterApiUrl || null,
      countIconType,
      pricingType,
      actionType,
      actionIconType,
      actionUrl || null,
      JSON.stringify(techTags),
      id
    ]
  );

  await writeAuditLog(user, "update", "product", id, { title: titleInput, categoryId });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const { user, response } = await requirePermission(request, "products.delete");
  if (!user) return response;

  const { id } = await params;

  const existing = await queryOne("SELECT id FROM products WHERE id = ?", [id]);
  if (!existing) {
    return NextResponse.json({ error: apiMessage(request, "notFound") }, { status: 404 });
  }

  await execute("DELETE FROM products WHERE id = ?", [id]);

  await writeAuditLog(user, "delete", "product", id);
  return NextResponse.json({ ok: true });
}
