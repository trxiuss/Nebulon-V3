import { NextResponse } from "next/server";
import { query, execute, writeAuditLog } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { apiMessage } from "@/lib/api-messages";
import { safeJsonParse, normalizeSocials, normalizeHttpUrl } from "@/lib/utils";
import { wantsManualEn, canUseManualEn, resolveLocalized } from "@/lib/manual-translate";

export const runtime = "edge";

function parseRow(row) {
  return { ...row, socials: normalizeSocials(safeJsonParse(row.socials, {})) };
}

export async function GET() {
  const rows = await query(
    "SELECT * FROM team ORDER BY display_order IS NULL, display_order ASC, id ASC"
  );
  return NextResponse.json(rows.map(parseRow));
}

export async function POST(request) {
  const { user, response } = await requirePermission(request, "team.create");
  if (!user) return response;

  const body = await request.json().catch(() => null);
  const manual = wantsManualEn(body);
  if (manual && !canUseManualEn(user)) {
    return NextResponse.json({ error: apiMessage(request, "auth.forbidden") }, { status: 403 });
  }
  const name = body?.name?.trim();
  const roleInput = body?.role_tr?.trim() || "";
  const avatarUrl = normalizeHttpUrl(body?.avatar_url);
  const socials = normalizeSocials(body?.socials);
  if (avatarUrl === null || Object.values(socials).some((url) => url && !normalizeHttpUrl(url))) {
    return NextResponse.json({ error: apiMessage(request, "generic.error") }, { status: 400 });
  }
  for (const key of Object.keys(socials)) socials[key] = normalizeHttpUrl(socials[key]) || "";
  const rawOrder = body?.display_order;
  const displayOrder =
    rawOrder === "" || rawOrder === null || rawOrder === undefined ? NaN : Number(rawOrder);

  if (!name || !Number.isFinite(displayOrder)) {
    return NextResponse.json({ error: apiMessage(request, "team.required") }, { status: 400 });
  }

  const role = await resolveLocalized(roleInput, body?.role_en, manual);

  const result = await execute(
    "INSERT INTO team (name, role_tr, role_en, avatar_url, socials, display_order) VALUES (?, ?, ?, ?, ?, ?)",
    [name, role.tr || null, role.en || null, avatarUrl || null, JSON.stringify(socials), displayOrder]
  );

  await writeAuditLog(user, "create", "team", result.meta?.last_row_id, { name, manual_en: manual });
  return NextResponse.json({ ok: true, id: result.meta?.last_row_id });
}
