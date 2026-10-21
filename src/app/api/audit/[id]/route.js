import { NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { apiMessage } from "@/lib/api-messages";

export const runtime = "edge";

export async function DELETE(request, { params }) {
  const { user, response } = await requirePermission(request, "audit.delete");
  if (!user) return response;

  const { id } = await params;
  const existing = await queryOne("SELECT id FROM audit_logs WHERE id = ?", [id]);
  if (!existing) {
    return NextResponse.json({ error: apiMessage(request, "generic.error") }, { status: 404 });
  }

  await execute("DELETE FROM audit_logs WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
