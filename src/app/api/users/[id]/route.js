import { NextResponse } from "next/server";
import { query, queryOne, execute, writeAuditLog, bumpPermissionEpoch } from "@/lib/db";
import { requirePermission, forbidSelfRoleChange, isOwnerActor } from "@/lib/auth";
import { apiMessage } from "@/lib/api-messages";
import { SYSTEM_ROLE_SLUG, roleRankOf, outranks } from "@/lib/permissions";
import { encryptEmail, emailFingerprint } from "@/lib/crypto";

export const runtime = "edge";

export async function PUT(request, { params }) {
  const { user, response } = await requirePermission(request, "users.edit");
  if (!user) return response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const username = body?.username?.trim();
  const email = body?.email?.trim() || null;
  const roleSlug = body?.role?.trim();

  if (!username) {
    return NextResponse.json({ error: apiMessage(request, "user.nameRequired") }, { status: 400 });
  }

  const existing = await queryOne("SELECT id, role, full_access, token_version FROM users WHERE id = ?", [id]);
  if (!existing) {
    return NextResponse.json({ error: apiMessage(request, "notFound") }, { status: 404 });
  }

  const roleRow = await queryOne(
    "SELECT slug, is_system, rank FROM roles WHERE slug = ?",
    [roleSlug]
  );
  if (!roleRow) {
    return NextResponse.json({ error: apiMessage(request, "user.invalidRole") }, { status: 400 });
  }

  const selfRoleBlock = forbidSelfRoleChange(request, user, existing.id, roleSlug);
  if (selfRoleBlock) return selfRoleBlock;

  const actorIsOwner = isOwnerActor(user);
  const currentFullAccess = Number(existing.full_access) === 1;
  const requestedFullAccess =
    typeof body?.fullAccess === "boolean" ? body.fullAccess : currentFullAccess;

  if (requestedFullAccess !== currentFullAccess && !actorIsOwner) {
    return NextResponse.json(
      { error: apiMessage(request, "user.fullAccessOwnerOnly"), code: "user.fullAccessOwnerOnly" },
      { status: 403 }
    );
  }

  if (currentFullAccess && !actorIsOwner) {
    return NextResponse.json(
      { error: apiMessage(request, "auth.ownerOnly"), code: "auth.ownerOnly" },
      { status: 403 }
    );
  }

  const nextFullAccess = roleSlug === SYSTEM_ROLE_SLUG ? 1 : requestedFullAccess ? 1 : 0;

  if (existing.role === SYSTEM_ROLE_SLUG && !actorIsOwner) {
    return NextResponse.json(
      { error: apiMessage(request, "auth.ownerOnly"), code: "auth.ownerOnly" },
      { status: 403 }
    );
  }

  if (roleSlug === SYSTEM_ROLE_SLUG && !actorIsOwner) {
    return NextResponse.json(
      { error: apiMessage(request, "auth.ownerOnly"), code: "auth.ownerOnly" },
      { status: 403 }
    );
  }

  if (!actorIsOwner) {
    const currentRoleRow = await queryOne(
      "SELECT slug, is_system, rank FROM roles WHERE slug = ?",
      [existing.role]
    );
    const actorRank = Number(user.roleRank);
    const targetRank = roleRankOf(currentRoleRow);
    const nextRank = roleRankOf(roleRow);

    if (!outranks(actorRank, targetRank) || !outranks(actorRank, nextRank)) {
      return NextResponse.json(
        { error: apiMessage(request, "user.rankTooLow"), code: "user.rankTooLow" },
        { status: 403 }
      );
    }
  }

  const duplicate = await queryOne("SELECT id FROM users WHERE username = ? AND id != ?", [
    username,
    id
  ]);
  if (duplicate) {
    return NextResponse.json({ error: apiMessage(request, "user.duplicate") }, { status: 409 });
  }

  if (
    existing.role === SYSTEM_ROLE_SLUG && roleSlug !== SYSTEM_ROLE_SLUG
  ) {
    const otherAdmins = await query(
      "SELECT id FROM users WHERE role = ? AND id != ?",
      [SYSTEM_ROLE_SLUG, id]
    );
    if (otherAdmins.length === 0) {
      return NextResponse.json({ error: apiMessage(request, "user.last") }, { status: 400 });
    }
  }

  const emailHash = await emailFingerprint(email);
  if (emailHash) {
    const duplicateEmail = await queryOne("SELECT id FROM users WHERE email_hash = ? AND id != ?", [
      emailHash,
      id
    ]);
    if (duplicateEmail) {
      return NextResponse.json(
        { error: apiMessage(request, "account.emailDuplicate"), code: "account.emailDuplicate" },
        { status: 409 }
      );
    }
  }

  const encryptedEmail = await encryptEmail(email);
  const securityChanged = existing.role !== roleSlug || Number(existing.full_access || 0) !== nextFullAccess;

  await execute(
    "UPDATE users SET username = ?, email = ?, email_hash = ?, role = ?, full_access = ? WHERE id = ?",
    [username, encryptedEmail, emailHash, roleSlug, nextFullAccess, id]
  );

  if (securityChanged) await bumpPermissionEpoch();

  await writeAuditLog(user, "update", "user", id, {
    username,
    role: roleSlug,
    full_access: nextFullAccess
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const { user, response } = await requirePermission(request, "users.delete");
  if (!user) return response;

  const { id } = await params;

  if (Number(id) === Number(user.id)) {
    return NextResponse.json({ error: apiMessage(request, "user.self") }, { status: 400 });
  }

  const target = await queryOne("SELECT id, role, full_access FROM users WHERE id = ?", [id]);
  if (!target) {
    return NextResponse.json({ error: apiMessage(request, "notFound") }, { status: 404 });
  }

  if (Number(target.full_access) === 1 && !isOwnerActor(user)) {
    return NextResponse.json(
      { error: apiMessage(request, "auth.ownerOnly"), code: "auth.ownerOnly" },
      { status: 403 }
    );
  }

  if (target.role === SYSTEM_ROLE_SLUG && !isOwnerActor(user)) {
    return NextResponse.json(
      { error: apiMessage(request, "auth.ownerOnly"), code: "auth.ownerOnly" },
      { status: 403 }
    );
  }

  if (!isOwnerActor(user)) {
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

  if (target.role === SYSTEM_ROLE_SLUG) {
    const otherAdmins = await query(
      "SELECT id FROM users WHERE role = ? AND id != ?",
      [SYSTEM_ROLE_SLUG, id]
    );
    if (otherAdmins.length === 0) {
      return NextResponse.json({ error: apiMessage(request, "user.last") }, { status: 400 });
    }
  }

  await execute("DELETE FROM users WHERE id = ?", [id]);
  await bumpPermissionEpoch();
  await writeAuditLog(user, "delete", "user", id);
  return NextResponse.json({ ok: true });
}
