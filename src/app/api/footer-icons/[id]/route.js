import { NextResponse } from "next/server";
import { execute, queryOne, writeAuditLog } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { normalizeHttpUrl } from "@/lib/utils";
import { FOOTER_ICONS } from "@/lib/preset-icons";

export const runtime = "edge";

export async function PUT(request, { params }) {
  const { user, response } = await requirePermission(request, "footer_icons.edit");
  if (!user) return response;
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const url = normalizeHttpUrl(body?.url);
  const order = Number(body?.display_order);
  if (!FOOTER_ICONS.includes(body?.icon_key) || !url || !Number.isInteger(order)) return NextResponse.json({ error: "Geçerli ikon, link ve sıra girin." }, { status: 400 });
  if (!(await queryOne("SELECT id FROM footer_icons WHERE id = ?", [id]))) return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 });
  await execute("UPDATE footer_icons SET icon_key = ?, url = ?, display_order = ?, updated_at = datetime('now') WHERE id = ?", [body.icon_key, url, order, id]);
  await writeAuditLog(user, "update", "footer_icon", id, { icon: body.icon_key });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const { user, response } = await requirePermission(request, "footer_icons.delete");
  if (!user) return response;
  const { id } = await params;
  if (!(await queryOne("SELECT id FROM footer_icons WHERE id = ?", [id]))) return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 });
  await execute("DELETE FROM footer_icons WHERE id = ?", [id]);
  await writeAuditLog(user, "delete", "footer_icon", id);
  return NextResponse.json({ ok: true });
}
