import { NextResponse } from "next/server";
import { execute, query, queryOne, writeAuditLog } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { normalizeHttpUrl } from "@/lib/utils";
import { FOOTER_ICONS } from "@/lib/preset-icons";

export const runtime = "edge";

export async function GET() {
  return NextResponse.json(await query("SELECT * FROM footer_icons ORDER BY display_order ASC, id ASC"));
}

export async function POST(request) {
  const { user, response } = await requirePermission(request, "footer_icons.create");
  if (!user) return response;
  const body = await request.json().catch(() => null);
  const url = normalizeHttpUrl(body?.url);
  const order = Number(body?.display_order);
  if (!FOOTER_ICONS.includes(body?.icon_key) || !url || !Number.isInteger(order)) return NextResponse.json({ error: "Geçerli ikon, link ve sıra girin." }, { status: 400 });
  const countRow = await queryOne("SELECT COUNT(*) AS count FROM footer_icons");
  if (Number(countRow?.count || 0) >= 9) return NextResponse.json({ error: "En fazla 9 alt sayfa ikonu eklenebilir." }, { status: 400 });
  const result = await execute("INSERT INTO footer_icons (icon_key, url, display_order) VALUES (?, ?, ?)", [body.icon_key, url, order]);
  await writeAuditLog(user, "create", "footer_icon", result.meta?.last_row_id, { icon: body.icon_key });
  return NextResponse.json({ ok: true, id: result.meta?.last_row_id });
}
