import { NextResponse } from "next/server";
import { query, queryOne, execute, batch, writeAuditLog, bumpPermissionEpoch } from "@/lib/db";
import { requirePermission, isOwnerActor } from "@/lib/auth";
import { apiMessage } from "@/lib/api-messages";
import {
  normalizePermissions,
  normalizeRoleRank,
  roleRankOf,
  outranks,
  SYSTEM_ROLE_SLUG,
  OWNER_ROLE_RANK,
  DEFAULT_ROLE_RANK,
  MIN_ASSIGNABLE_ROLE_RANK,
  deltaExceedsActorPermissions
} from "@/lib/permissions";
import { slugify, safeJsonParse } from "@/lib/utils";

export const runtime = "edge";

export async function PUT(request, { params }) {
  const { user, response } = await requirePermission(request, "roles.edit");
  if (!user) return response;

  const { id } = await params;
  const existing = await queryOne("SELECT * FROM roles WHERE id = ?", [id]);
  if (!existing) {
    return NextResponse.json({ error: apiMessage(request, "notFound") }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const name = body?.name?.trim();
  const slug = slugify(body?.slug?.trim() || name || "");
  const actorIsOwner = isOwnerActor(user);
  const privileged = actorIsOwner || Boolean(user.fullAccess);
  const requested = Array.isArray(body?.permissions) ? body.permissions : [];
  const permissions = normalizePermissions(requested, privileged);
  const allowedAll = normalizePermissions(requested, true);
  const rank = normalizeRoleRank(body?.rank ?? existing.rank ?? DEFAULT_ROLE_RANK, actorIsOwner);

  if (!privileged && existing.slug === user.role) {
    return NextResponse.json(
      { error: apiMessage(request, "role.ownRole"), code: "role.ownRole" },
      { status: 403 }
    );
  }

  if (allowedAll.length !== permissions.length) {
    return NextResponse.json(
      { error: apiMessage(request, "role.restrictedPermissions"), code: "role.restrictedPermissions" },
      { status: 400 }
    );
  }

  const currentPermissions = safeJsonParse(existing.permissions, []);

  if (body?.version !== undefined && Number(body.version) !== Number(existing.version ?? 1)) {
    return NextResponse.json(
      { error: apiMessage(request, "role.stale"), code: "role.stale" },
      { status: 409 }
    );
  }

  if (!privileged && deltaExceedsActorPermissions(currentPermissions, permissions, user.permissions)) {
    return NextResponse.json(
      { error: apiMessage(request, "role.permissionsExceed"), code: "role.permissionsExceed" },
      { status: 403 }
    );
  }

  if (!actorIsOwner) {
    if (rank <= OWNER_ROLE_RANK || rank < MIN_ASSIGNABLE_ROLE_RANK) {
      return NextResponse.json(
        { error: apiMessage(request, "role.restrictedRank"), code: "role.restrictedRank" },
        { status: 400 }
      );
    }
  }

  if (!privileged) {
    if (!outranks(Number(user.roleRank), roleRankOf(existing))) {
      return NextResponse.json(
        { error: apiMessage(request, "role.restrictedRank"), code: "role.restrictedRank" },
        { status: 400 }
      );
    }
    if (rank <= Number(user.roleRank)) {
      return NextResponse.json(
        { error: apiMessage(request, "role.rankTooHigh"), code: "role.rankTooHigh" },
        { status: 403 }
      );
    }
  }

  if (!name || !slug) {
    return NextResponse.json({ error: apiMessage(request, "role.required") }, { status: 400 });
  }

  if (Number(existing.is_system) === 1 || existing.slug === SYSTEM_ROLE_SLUG) {
    return NextResponse.json({ error: apiMessage(request, "role.systemProtected") }, { status: 400 });
  }

  if (slug === SYSTEM_ROLE_SLUG) {
    return NextResponse.json({ error: apiMessage(request, "role.systemProtected") }, { status: 400 });
  }

  const duplicate = await queryOne("SELECT id FROM roles WHERE slug = ? AND id != ?", [slug, id]);
  if (duplicate) {
    return NextResponse.json({ error: apiMessage(request, "role.duplicate") }, { status: 409 });
  }

  const oldSlug = existing.slug;
  const expectedVersion = Number(existing.version ?? 1);
  const statements = [
    [
      "UPDATE roles SET name = ?, slug = ?, permissions = ?, rank = ?, version = ?, updated_at = datetime('now') WHERE id = ? AND COALESCE(version, 1) = ?",
      [name, slug, JSON.stringify(permissions), rank, expectedVersion + 1, id, expectedVersion]
    ]
  ];
  if (oldSlug !== slug) {
    statements.push([
      "UPDATE users SET role = ? WHERE role = ? AND EXISTS (SELECT 1 FROM roles WHERE id = ? AND slug = ?)",
      [slug, oldSlug, id, slug]
    ]);
  }

  const results = await batch(statements);
  if (!results[0]?.meta?.changes) {
    return NextResponse.json(
      { error: apiMessage(request, "role.stale"), code: "role.stale" },
      { status: 409 }
    );
  }

  await bumpPermissionEpoch();

  await writeAuditLog(user, "update", "role", id, { name, slug, rank });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const { user, response } = await requirePermission(request, "roles.delete");
  if (!user) return response;

  const { id } = await params;
  const existing = await queryOne("SELECT * FROM roles WHERE id = ?", [id]);
  if (!existing) {
    return NextResponse.json({ error: apiMessage(request, "notFound") }, { status: 404 });
  }

  if (Number(existing.is_system) === 1 || existing.slug === SYSTEM_ROLE_SLUG) {
    return NextResponse.json({ error: apiMessage(request, "role.systemProtected") }, { status: 400 });
  }

  const inUse = await query("SELECT id FROM users WHERE role = ?", [existing.slug]);
  if (inUse.length > 0) {
    return NextResponse.json({ error: apiMessage(request, "role.inUse") }, { status: 400 });
  }

  await execute("DELETE FROM roles WHERE id = ?", [id]);
  await bumpPermissionEpoch();
  await writeAuditLog(user, "delete", "role", id);
  return NextResponse.json({ ok: true });
}
