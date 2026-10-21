import { NextResponse } from "next/server";
import { query, execute, writeAuditLog } from "@/lib/db";
import { wantsManualEn, canUseManualEn, resolveLocalized } from "@/lib/manual-translate";
import { requirePermission } from "@/lib/auth";
import { apiMessage } from "@/lib/api-messages";
import { normalizeHttpUrl } from "@/lib/utils";
import { CONTACT_ICONS } from "@/lib/preset-icons";

export const runtime = "edge";

export async function GET() {
  const rows = await query(
    "SELECT * FROM contact_section ORDER BY display_order IS NULL, display_order ASC, id ASC"
  );
  return NextResponse.json(rows);
}

export async function POST(request) {
  const { user, response } = await requirePermission(request, "contact.create");
  if (!user) return response;

  const body = await request.json().catch(() => null);
  const manual = wantsManualEn(body);
  if (manual && !canUseManualEn(user)) {
    return NextResponse.json({ error: apiMessage(request, "auth.forbidden") }, { status: 403 });
  }
  const titleInput = body?.title_tr?.trim() || "";
  const descriptionInput = body?.description_tr?.trim() || "";
  const buttonTextInput = body?.button_text_tr?.trim() || "";
  const buttonUrl = normalizeHttpUrl(body?.button_url);
  const iconKey = typeof body?.icon_key === "string" ? body.icon_key : "";
  const rawOrder = body?.display_order;
  const displayOrder =
    rawOrder === "" || rawOrder === null || rawOrder === undefined ? NaN : Number(rawOrder);

  if (
    !titleInput ||
    !descriptionInput ||
    !buttonTextInput ||
    !buttonUrl ||
    !CONTACT_ICONS.includes(iconKey) ||
    !Number.isFinite(displayOrder)
  ) {
    return NextResponse.json({ error: apiMessage(request, "contact.required") }, { status: 400 });
  }

  const title = await resolveLocalized(titleInput, body?.title_en, manual);
  const description = await resolveLocalized(descriptionInput, body?.description_en, manual);
  const buttonText = await resolveLocalized(buttonTextInput, body?.button_text_en, manual);

  const result = await execute(
    `INSERT INTO contact_section
      (icon_key, title_tr, title_en, description_tr, description_en, button_text_tr, button_text_en, button_url, display_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      iconKey,
      title.tr,
      title.en,
      description.tr,
      description.en,
      buttonText.tr,
      buttonText.en,
      buttonUrl,
      displayOrder
    ]
  );

  await writeAuditLog(user, "create", "contact", result.meta?.last_row_id, { title: title.tr });
  return NextResponse.json({ ok: true, id: result.meta?.last_row_id });
}
