import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { queryOne } from "@/lib/db";
import { apiMessage } from "@/lib/api-messages";
import {
  hasPermission,
  permissionStamp,
  SYSTEM_ROLE_SLUG,
  roleRankOf,
  MAX_ROLE_RANK,
  ALL_PERMISSION_KEYS,
  FULL_ACCESS_ROLE_RANK
} from "@/lib/permissions";
import { safeJsonParse } from "@/lib/utils";

function unauthorized(request) {
  return {
    user: null,
    response: NextResponse.json(
      { error: apiMessage(request, "auth.unauthorized"), code: "auth.unauthorized" },
      { status: 401 }
    )
  };
}

function forbidden(request) {
  return {
    user: null,
    response: NextResponse.json(
      { error: apiMessage(request, "auth.forbidden"), code: "auth.forbidden" },
      { status: 403 }
    )
  };
}

export async function loadUserWithPermissions(userId) {
  const user = await queryOne(
    "SELECT id, username, role, token_version, full_access FROM users WHERE id = ?",
    [userId]
  );
  if (!user) return null;

  const roleRow = await queryOne(
    "SELECT slug, permissions, is_system, rank, version FROM roles WHERE slug = ?",
    [user.role]
  );

  let permissions = [];
  if (roleRow) {
    permissions = safeJsonParse(roleRow.permissions, []);
    if (roleRow.slug === SYSTEM_ROLE_SLUG || Number(roleRow.is_system) === 1) {
      permissions = ["*"];
    }
  }

  const isSystemAdmin = user.role === SYSTEM_ROLE_SLUG;
  const fullAccess = isSystemAdmin || Number(user.full_access) === 1;
  let roleRank = roleRow ? roleRankOf(roleRow) : MAX_ROLE_RANK;

  if (fullAccess && !isSystemAdmin) {
    permissions = [...ALL_PERMISSION_KEYS];
    roleRank = Math.min(Number(roleRank), FULL_ACCESS_ROLE_RANK);
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    token_version: user.token_version,
    permissions,
    roleRank,
    fullAccess,
    isSystemAdmin,
    roleVersion: roleRow && Number.isFinite(Number(roleRow.version)) ? Number(roleRow.version) : 0
  };
}

function requestMeta(request) {
  const headers = request?.headers;
  const ip =
    headers?.get("cf-connecting-ip") ||
    headers?.get("x-real-ip") ||
    (headers?.get("x-forwarded-for") || "").split(",")[0].trim() ||
    null;
  return { ip: ip || null, userAgent: headers?.get("user-agent") || null };
}

const PERMISSION_STAMP_HEADER = "x-perm-stamp";

function staleSession(request, stamp) {
  return {
    user: null,
    response: NextResponse.json(
      { error: apiMessage(request, "perm.stale"), code: "perm.stale", stamp },
      { status: 409 }
    )
  };
}

export async function requireAuth(request) {
  const session = await getSession();
  if (!session) return unauthorized(request);

  const user = await loadUserWithPermissions(session.uid);
  if (!user) return unauthorized(request);
  if (Number(user.token_version) !== Number(session.tv)) return unauthorized(request);

  const method = String(request?.method || "GET").toUpperCase();
  const clientStamp = request?.headers?.get?.(PERMISSION_STAMP_HEADER);
  const currentStamp = permissionStamp(user);
  if (method !== "GET" && method !== "HEAD" && clientStamp && clientStamp !== currentStamp) {
    return staleSession(request, currentStamp);
  }

  const meta = requestMeta(request);
  user.ip = meta.ip;
  user.userAgent = meta.userAgent;

  return { user, response: null };
}

export async function requirePermission(request, permission) {
  const { user, response } = await requireAuth(request);
  if (!user) return { user: null, response };
  if (!hasPermission(user.permissions, permission)) return forbidden(request);
  return { user, response: null };
}

export function isOwnerActor(user) {
  return Boolean(user) && user.role === SYSTEM_ROLE_SLUG;
}

export function forbidSelfRoleChange(request, actor, targetId, nextRoleSlug) {
  if (!actor) return null;
  if (isOwnerActor(actor)) return null;
  if (Number(actor.id) !== Number(targetId)) return null;
  if (!nextRoleSlug || nextRoleSlug === actor.role) return null;

  return NextResponse.json(
    { error: apiMessage(request, "user.selfRole"), code: "user.selfRole" },
    { status: 403 }
  );
}
