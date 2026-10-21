export const PERMISSION_GROUPS = [
  {
    key: "categories",
    perms: ["categories.view", "categories.create", "categories.edit", "categories.delete"]
  },
  {
    key: "products",
    perms: ["products.view", "products.create", "products.edit", "products.delete"]
  },
  {
    key: "team",
    perms: ["team.view", "team.create", "team.edit", "team.delete"]
  },
  {
    key: "contact",
    perms: ["contact.view", "contact.create", "contact.edit", "contact.delete"]
  },
  {
    key: "footerIcons",
    perms: ["footer_icons.view", "footer_icons.create", "footer_icons.edit", "footer_icons.delete"]
  },
  {
    key: "users",
    perms: ["users.view", "users.create", "users.edit", "users.delete"]
  },
  {
    key: "roles",
    perms: ["roles.view", "roles.create", "roles.edit", "roles.delete"]
  },
  {
    key: "settings",
    perms: ["settings.view", "settings.edit"]
  },
  {
    key: "audit",
    perms: ["audit.view", "audit.auth.view", "audit.delete", "audit.clear"]
  },
  {
    key: "translate",
    perms: ["translate.use", "translate.manual"]
  }

];

export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((g) => g.perms);

export const SYSTEM_ROLE_SLUG = "yonetici";

export const OWNER_ROLE_RANK = 0;
export const MIN_ASSIGNABLE_ROLE_RANK = 1;
export const FULL_ACCESS_ROLE_RANK = 1;
export const MAX_ROLE_RANK = 999;
export const DEFAULT_ROLE_RANK = 100;

const ELEVATED_PERMISSION_PREFIXES = ["users.", "roles.", "settings."];

export function hasPermission(userPermissions, permission) {
  if (!Array.isArray(userPermissions)) return false;
  if (userPermissions.includes("*")) return true;
  return userPermissions.includes(permission);
}

function isElevatedPermission(permission) {
  return ELEVATED_PERMISSION_PREFIXES.some((prefix) => String(permission).startsWith(prefix));
}

export function normalizePermissions(input, isOwnerActor = true) {
  if (!Array.isArray(input)) return [];
  const set = new Set(ALL_PERMISSION_KEYS);
  const valid = input.filter((p) => typeof p === "string" && set.has(p));
  if (isOwnerActor) return valid;
  return valid.filter((p) => !isElevatedPermission(p));
}

export function normalizeRoleRank(value, isOwnerActor = true) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_ROLE_RANK;
  const rounded = Math.floor(parsed);
  const floor = isOwnerActor ? OWNER_ROLE_RANK : MIN_ASSIGNABLE_ROLE_RANK;
  if (rounded < floor) return floor;
  if (rounded > MAX_ROLE_RANK) return MAX_ROLE_RANK;
  return rounded;
}

export function roleRankOf(roleRow) {
  if (!roleRow) return MAX_ROLE_RANK;
  if (roleRow.slug === SYSTEM_ROLE_SLUG || Number(roleRow.is_system) === 1) return OWNER_ROLE_RANK;
  const rank = Number(roleRow.rank);
  return Number.isFinite(rank) ? rank : DEFAULT_ROLE_RANK;
}

function actorPermissionSet(actorPermissions) {
  if (!Array.isArray(actorPermissions)) return [];
  if (actorPermissions.includes("*")) return [...ALL_PERMISSION_KEYS];
  return ALL_PERMISSION_KEYS.filter((key) => actorPermissions.includes(key));
}

export function exceedsActorPermissions(requested, actorPermissions) {
  const allowed = new Set(actorPermissionSet(actorPermissions));
  return (Array.isArray(requested) ? requested : []).some((key) => !allowed.has(key));
}

export function outranks(actorRank, targetRank) {
  return Number(actorRank) < Number(targetRank);
}

export function permissionStamp(user) {
  if (!user) return "anon";
  const list = Array.isArray(user.permissions) ? [...user.permissions].sort() : [];
  return [
    user.id,
    user.role,
    user.roleRank,
    user.fullAccess ? 1 : 0,
    user.token_version,
    user.roleVersion ?? 0,
    list.join(",")
  ].join("|");
}

function permissionDelta(previous, next) {
  const before = new Set(Array.isArray(previous) ? previous : []);
  const after = new Set(Array.isArray(next) ? next : []);
  const changed = new Set();
  before.forEach((key) => {
    if (!after.has(key)) changed.add(key);
  });
  after.forEach((key) => {
    if (!before.has(key)) changed.add(key);
  });
  return [...changed];
}

export function deltaExceedsActorPermissions(previous, next, actorPermissions) {
  const allowed = new Set(actorPermissionSet(actorPermissions));
  return permissionDelta(previous, next).some((key) => !allowed.has(key));
}
