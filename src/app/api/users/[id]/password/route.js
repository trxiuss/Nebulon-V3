import { NextResponse } from "next/server";
import { queryOne, execute, writeAuditLog } from "@/lib/db";
import { verifyPassword, generateSalt, hashPassword, isWeakPassword } from "@/lib/crypto";
import { requireAuth } from "@/lib/auth";
import { hasPermission, roleRankOf, outranks, SYSTEM_ROLE_SLUG } from "@/lib/permissions";
import { apiMessage } from "@/lib/api-messages";

export const runtime = "edge";

export async function PUT(request, { params }) {
  const { user, response } = await requireAuth(request);
  if (!user) return response;

  const { id } = await params;
  const targetId = Number(id);

  const target = await queryOne(
    "SELECT id, password_hash, salt, role, full_access, token_version FROM users WHERE id = ?",
    [targetId]
  );
  if (!target) {
    return NextResponse.json({ error: apiMessage(request, "notFound") }, { status: 404 });
  }

  const isSelf = Number(user.id) === targetId;
  const actorIsOwner = user.role === SYSTEM_ROLE_SLUG;
  const targetIsOwner = target.role === SYSTEM_ROLE_SLUG;
  const targetHasFullAccess = Number(target.full_access) === 1;

  if (!isSelf) {
    if (!hasPermission(user.permissions, "users.edit")) {
      return NextResponse.json(
        { error: apiMessage(request, "auth.forbidden"), code: "auth.forbidden" },
        { status: 403 }
      );
    }
    if ((targetIsOwner || targetHasFullAccess) && !actorIsOwner) {
      return NextResponse.json(
        { error: apiMessage(request, "auth.ownerOnly"), code: "auth.ownerOnly" },
        { status: 403 }
      );
    }
    if (!actorIsOwner) {
      const targetRoleRow = await queryOne(
        "SELECT slug, is_system, rank FROM roles WHERE slug = ?",
        [target.role]
      );
      if (!outranks(Number(user.roleRank), roleRankOf(targetRoleRow))) {
        return NextResponse.json(
          { error: apiMessage(request, "user.rankTooLow"), code: "user.rankTooLow" },
          { status: 403 }
        );
      }
    }
  }

  const body = await request.json().catch(() => null);
  const newPassword = body?.newPassword;
  const currentPassword = body?.currentPassword;

  if (!newPassword || typeof newPassword !== "string") {
    return NextResponse.json(
      { error: apiMessage(request, "auth.passwordRequired"), code: "auth.passwordRequired" },
      { status: 400 }
    );
  }

  if (isWeakPassword(newPassword)) {
    return NextResponse.json(
      { error: apiMessage(request, "user.passwordWeak"), code: "user.passwordWeak" },
      { status: 400 }
    );
  }

  if (isSelf) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: apiMessage(request, "auth.passwordRequired"), code: "auth.passwordRequired" },
        { status: 400 }
      );
    }
    const valid = await verifyPassword(currentPassword, target.salt, target.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: apiMessage(request, "auth.wrongCurrent"), code: "auth.wrongCurrent" },
        { status: 400 }
      );
    }
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(newPassword, salt);
  const nextTokenVersion = Number(target.token_version || 1) + 1;

  await execute("UPDATE users SET password_hash = ?, salt = ?, token_version = ? WHERE id = ?", [
    passwordHash,
    salt,
    nextTokenVersion,
    targetId
  ]);

  await writeAuditLog(user, "password_change", "user", targetId);
  return NextResponse.json({ ok: true });
}
