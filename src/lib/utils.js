const TR_MAP = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u" };

export function slugify(text) {
  if (!text) return "";
  return String(text)
    .split("")
    .map((ch) => TR_MAP[ch] || ch)
    .join("")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const SOCIAL_KEYS = ["github", "modrinth", "discord", "instagram"];

export const SOCIAL_ICON_META = {
  discord: { icon: "fa-brands fa-discord", label: "Discord" },
  github: { icon: "fa-brands fa-github", label: "GitHub" },
  modrinth: { icon: "fa-solid fa-code-branch", label: "Modrinth" },
  instagram: { icon: "fa-brands fa-instagram", label: "Instagram" }
};

export function normalizeSocials(input) {
  const source = input && typeof input === "object" ? input : {};
  const result = {};
  for (const key of Object.keys(source)) {
    if (!SOCIAL_KEYS.includes(key)) continue;
    const value = source[key];
    result[key] = typeof value === "string" ? value.trim() : "";
  }
  for (const key of SOCIAL_KEYS) {
    if (!(key in result)) result[key] = "";
  }
  return result;
}

export function safeJsonParse(data, fallback) {
  if (data === null || data === undefined) return fallback;
  if (typeof data !== "string") return data;
  try {
    const parsed = JSON.parse(data);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (err) {
    return fallback;
  }
}

export function normalizeHttpUrl(value, { allowEmpty = true } = {}) {
  const input = typeof value === "string" ? value.trim() : "";
  if (!input) return allowEmpty ? "" : null;
  try {
    const url = new URL(input);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch (err) {
    return null;
  }
}
