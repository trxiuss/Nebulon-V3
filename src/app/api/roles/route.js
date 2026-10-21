import { NextResponse } from "next/server";
import { query, queryOne, execute, writeAuditLog, bumpPermissionEpoch } from "@/lib/db";
import { requirePermission, isOwnerActor } from "@/lib/auth";
import { apiMessage } from "@/lib/api-messages";
import {
  normalizePermissions,
  normalizeRoleRank,
  SYSTEM_ROLE_SLUG,
  OWNER_ROLE_RANK,
  DEFAULT_ROLE_RANK,
  MIN_ASSIGNABLE_ROLE_RANK,
  exceedsActorPermissions
} from "@/lib/permissions";
import { slugify, safeJsonParse } from "@/lib/utils";

export const runtime = "edge";

function parseRole(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    permissions: safeJsonParse(row.permissions, []),
    rank: Number.isFinite(Number(row.rank)) ? Number(row.rank) : DEFAULT_ROLE_RANK,
    version: Number.isFinite(Number(row.version)) ? Number(row.version) : 1,
    is_system: Number(row.is_system) === 1
  };
}

export async function GET(request) {
  const { user, response } = await requirePermission(request, "roles.view");
  if (!user) return response;

  const rows = await query("SELECT * FROM roles ORDER BY rank ASC, id ASC");
  return NextResponse.json(rows.map(parseRole));
}

export async function POST(request) {
  const { user, response } = await requirePermission(request, "roles.create");
  if (!user) return response;

  const body = await request.json().catch(() => null);
  const name = body?.name?.trim();
  const slug = slugify(body?.slug?.trim() || name || "");
  const actorIsOwner = isOwnerActor(user);
  const privileged = actorIsOwner || Boolean(user.fullAccess);
  const requested = Array.isArray(body?.permissions) ? body.permissions : [];
  const permissions = normalizePermissions(requested, privileged);
  const allowedAll = normalizePermissions(requested, true);
  const rank = normalizeRoleRank(
    body?.rank ?? DEFAULT_ROLE_RANK,
    actorIsOwner
  );

  if (allowedAll.length !== permissions.length) {
    return NextResponse.json(
      { error: apiMessage(request, "role.restrictedPermissions"), code: "role.restrictedPermissions" },
      { status: 400 }
    );
  }

  if (!privileged && exceedsActorPermissions(permissions, user.permissions)) {
    return NextResponse.json(
      { error: apiMessage(request, "role.permissionsExceed"), code: "role.permissionsExceed" },
      { status: 403 }
    );
  }

  if (!actorIsOwner && rank <= OWNER_ROLE_RANK) {
    return NextResponse.json(
      { error: apiMessage(request, "role.restrictedRank"), code: "role.restrictedRank" },
      { status: 400 }
    );
  }

  if (!actorIsOwner && rank < MIN_ASSIGNABLE_ROLE_RANK) {
    return NextResponse.json(
      { error: apiMessage(request, "role.restrictedRank"), code: "role.restrictedRank" },
      { status: 400 }
    );
  }

  if (!privileged && rank <= Number(user.roleRank)) {
    return NextResponse.json(
      { error: apiMessage(request, "role.rankTooHigh"), code: "role.rankTooHigh" },
      { status: 403 }
    );
  }

  if (!name || !slug) {
    return NextResponse.json({ error: apiMessage(request, "role.required") }, { status: 400 });
  }

  if (slug === SYSTEM_ROLE_SLUG) {
    return NextResponse.json({ error: apiMessage(request, "role.systemProtected") }, { status: 400 });
  }

  const duplicate = await queryOne("SELECT id FROM roles WHERE slug = ?", [slug]);
  if (duplicate) {
    return NextResponse.json({ error: apiMessage(request, "role.duplicate") }, { status: 409 });
  }

  const result = await execute(
    "INSERT INTO roles (name, slug, permissions, is_system, rank) VALUES (?, ?, ?, ?, ?)",
    [name, slug, JSON.stringify(permissions), 0, rank]
  );

  await bumpPermissionEpoch();

  await writeAuditLog(user, "create", "role", result.meta?.last_row_id, { name, slug, rank });
  return NextResponse.json({ ok: true, id: result.meta?.last_row_id });
}
