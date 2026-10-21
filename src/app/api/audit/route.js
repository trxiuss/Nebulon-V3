import { NextResponse } from "next/server";
import { query, execute, writeAuditLog } from "@/lib/db";
import { requirePermission } from "@/lib/auth";

export const runtime = "edge";

export async function GET(request) {
  const { user, response } = await requirePermission(request, "audit.view");
  if (!user) return response;
  const rows = await query(
    `SELECT audit_logs.*, users.username FROM audit_logs LEFT JOIN users ON users.id = audit_logs.user_id ORDER BY audit_logs.id DESC LIMIT 1000`
  );
  return NextResponse.json(rows);
}

export async function DELETE(request) {
  const { user, response } = await requirePermission(request, "audit.clear");
  if (!user) return response;
  const countRow = await query("SELECT COUNT(*) as c FROM audit_logs");
  const total = Number(countRow?.[0]?.c || 0);
  await execute("DELETE FROM audit_logs");
  await writeAuditLog(user, "audit_clear", "audit_logs", null, { cleared: total });
  return NextResponse.json({ ok: true, cleared: total });
}
