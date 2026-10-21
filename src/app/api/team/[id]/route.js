import { NextResponse } from "next/server";
import { queryOne, execute, writeAuditLog } from "@/lib/db";
import { wantsManualEn, canUseManualEn, resolveLocalized } from "@/lib/manual-translate";
import { requirePermission } from "@/lib/auth";
import { apiMessage } from "@/lib/api-messages";
import { normalizeSocials, normalizeHttpUrl } from "@/lib/utils";

export const runtime = "edge";

export async function PUT(request, { params }) {
  const { user, response } = await requirePermission(request, "team.edit");
  if (!user) return response;

  const { id } = await params;
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

  const existing = await queryOne("SELECT id FROM team WHERE id = ?", [id]);
  if (!existing) {
    return NextResponse.json({ error: apiMessage(request, "notFound") }, { status: 404 });
  }

  const role = await resolveLocalized(roleInput, body?.role_en, manual);

  await execute(
    "UPDATE team SET name = ?, role_tr = ?, role_en = ?, avatar_url = ?, socials = ?, display_order = ? WHERE id = ?",
    [name, role.tr || null, role.en || null, avatarUrl || null, JSON.stringify(socials), displayOrder, id]
  );

  await writeAuditLog(user, "update", "team", id, { name });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const { user, response } = await requirePermission(request, "team.delete");
  if (!user) return response;

  const { id } = await params;
  const existing = await queryOne("SELECT id FROM team WHERE id = ?", [id]);
  if (!existing) {
    return NextResponse.json({ error: apiMessage(request, "notFound") }, { status: 404 });
  }

  await execute("DELETE FROM team WHERE id = ?", [id]);

  await writeAuditLog(user, "delete", "team", id);
  return NextResponse.json({ ok: true });
}
