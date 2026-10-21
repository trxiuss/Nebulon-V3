import { NextResponse } from "next/server";
import { query, queryOne, execute, writeAuditLog } from "@/lib/db";
import {
  generateSalt,
  hashPassword,
  isLegacyHash,
  isWeakPassword,
  encryptEmail,
  decryptEmail,
  emailFingerprint
} from "@/lib/crypto";
import { requirePermission, isOwnerActor } from "@/lib/auth";
import { apiMessage } from "@/lib/api-messages";
import { SYSTEM_ROLE_SLUG, roleRankOf, outranks } from "@/lib/permissions";

export const runtime = "edge";

export async function GET(request) {
  const { user, response } = await requirePermission(request, "users.view");
  if (!user) return response;

  const rows = await query(
    "SELECT id, username, email, role, full_access, password_hash, created_at FROM users ORDER BY id ASC"
  );

  const decoded = await Promise.all(rows.map((row) => decryptEmail(row.email)));

  return NextResponse.json(
    rows.map((row, index) => ({
      id: row.id,
      username: row.username,
      email: decoded[index] || null,
      role: row.role,
      full_access: Number(row.full_access) === 1,
      created_at: row.created_at,
      needs_password_upgrade: isLegacyHash(row.password_hash)
    }))
  );
}

export async function POST(request) {
  const { user, response } = await requirePermission(request, "users.create");
  if (!user) return response;

  const body = await request.json().catch(() => null);
  const username = body?.username?.trim();
  const email = body?.email?.trim() || null;
  const password = body?.password;
  const roleSlug = body?.role?.trim() || "yonetici";
  const wantsFullAccess = body?.fullAccess === true;

  if (wantsFullAccess && !isOwnerActor(user)) {
    return NextResponse.json(
      { error: apiMessage(request, "user.fullAccessOwnerOnly"), code: "user.fullAccessOwnerOnly" },
      { status: 403 }
    );
  }

  if (!username || !password) {
    return NextResponse.json({ error: apiMessage(request, "user.required") }, { status: 400 });
  }

  if (isWeakPassword(password)) {
    return NextResponse.json({ error: apiMessage(request, "user.passwordWeak") }, { status: 400 });
  }

  const roleRow = await queryOne(
    "SELECT slug, is_system, rank FROM roles WHERE slug = ?",
    [roleSlug]
  );
  if (!roleRow) {
    return NextResponse.json({ error: apiMessage(request, "user.invalidRole") }, { status: 400 });
  }

  if (roleSlug === SYSTEM_ROLE_SLUG && !isOwnerActor(user)) {
    return NextResponse.json({ error: apiMessage(request, "auth.ownerOnly"), code: "auth.ownerOnly" }, { status: 403 });
  }

  if (!isOwnerActor(user) && !outranks(Number(user.roleRank), roleRankOf(roleRow))) {
    return NextResponse.json(
      { error: apiMessage(request, "user.rankTooLow"), code: "user.rankTooLow" },
      { status: 403 }
    );
  }

  const existing = await queryOne("SELECT id FROM users WHERE username = ?", [username]);
  if (existing) {
    return NextResponse.json({ error: apiMessage(request, "user.duplicate") }, { status: 409 });
  }

  const emailHash = await emailFingerprint(email);
  if (emailHash) {
    const duplicateEmail = await queryOne("SELECT id FROM users WHERE email_hash = ?", [emailHash]);
    if (duplicateEmail) {
      return NextResponse.json(
        { error: apiMessage(request, "account.emailDuplicate"), code: "account.emailDuplicate" },
        { status: 409 }
      );
    }
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);
  const encryptedEmail = await encryptEmail(email);

  const result = await execute(
    "INSERT INTO users (username, email, email_hash, password_hash, salt, role, token_version, full_access) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [username, encryptedEmail, emailHash, passwordHash, salt, roleSlug, 1, roleSlug === SYSTEM_ROLE_SLUG || wantsFullAccess ? 1 : 0]
  );

  await writeAuditLog(user, "create", "user", result.meta?.last_row_id, { username, role: roleSlug, full_access: wantsFullAccess ? 1 : 0 });
  return NextResponse.json({ ok: true, id: result.meta?.last_row_id });
}
