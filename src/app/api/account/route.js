import { NextResponse } from "next/server";
import { queryOne, execute, writeAuditLog } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { apiMessage } from "@/lib/api-messages";
import { encryptEmail, decryptEmail, emailFingerprint } from "@/lib/crypto";

export const runtime = "edge";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function GET(request) {
  const { user, response } = await requireAuth(request);
  if (!user) return response;

  const row = await queryOne("SELECT id, username, email FROM users WHERE id = ?", [user.id]);
  if (!row) {
    return NextResponse.json({ error: apiMessage(request, "notFound") }, { status: 404 });
  }

  const email = await decryptEmail(row.email);

  return NextResponse.json({ id: row.id, username: row.username, email: email || "" });
}

export async function PUT(request) {
  const { user, response } = await requireAuth(request);
  if (!user) return response;

  const body = await request.json().catch(() => null);
  const raw = typeof body?.email === "string" ? body.email.trim() : "";
  const email = raw === "" ? null : raw;

  if (email && !EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { error: apiMessage(request, "account.emailInvalid"), code: "account.emailInvalid" },
      { status: 400 }
    );
  }

  const emailHash = await emailFingerprint(email);

  if (emailHash) {
    const duplicate = await queryOne("SELECT id FROM users WHERE email_hash = ? AND id != ?", [
      emailHash,
      user.id
    ]);
    if (duplicate) {
      return NextResponse.json(
        { error: apiMessage(request, "account.emailDuplicate"), code: "account.emailDuplicate" },
        { status: 409 }
      );
    }
  }

  const encryptedEmail = await encryptEmail(email);

  await execute("UPDATE users SET email = ?, email_hash = ? WHERE id = ?", [
    encryptedEmail,
    emailHash,
    user.id
  ]);
  await writeAuditLog(user, "update", "user", user.id, { email: emailHash ? "***" : null });

  return NextResponse.json({ ok: true, email: email || "" });
}
