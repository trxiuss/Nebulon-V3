const MAX_COUNTER_URL_LENGTH = 2048;
const MAX_REDIRECTS = 3;
const DOH_ENDPOINT = "https://1.1.1.1/dns-query";

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  /\.localdomain$/i,
  /^metadata\.google\.internal$/i
];

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const LOOKS_LIKE_IP_PATTERN = /^(\d+|0x[0-9a-f]+|\d+\.\d+|\d+\.\d+\.\d+|\[.*\])$/i;

function isPrivateIpv4(ip) {
  const match = IPV4_PATTERN.exec(ip);
  if (!match) return true;
  const octets = match.slice(1).map(Number);
  if (octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) return true;
  const [a, b] = octets;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIpv6(ip) {
  const value = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (value === "::" || value === "::1") return true;
  if (value.startsWith("fe80")) return true;
  if (/^f[cd]/.test(value)) return true;
  if (value.startsWith("::ffff:")) {
    const mapped = value.slice(7);
    return IPV4_PATTERN.test(mapped) ? isPrivateIpv4(mapped) : true;
  }
  return false;
}

function isBlockedIpAddress(ip) {
  if (typeof ip !== "string" || !ip) return true;
  if (ip.includes(":")) return isPrivateIpv6(ip);
  return isPrivateIpv4(ip);
}

function isBlockedHostname(hostname) {
  const host = String(hostname || "").trim();
  if (!host) return true;
  if (BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(host))) return true;
  if (host.startsWith("[")) return isPrivateIpv6(host);
  if (IPV4_PATTERN.test(host)) return isPrivateIpv4(host);
  if (LOOKS_LIKE_IP_PATTERN.test(host)) return true;
  if (/^\d+$/.test(host.replace(/\./g, ""))) return true;
  return false;
}

function normalizeCounterApiUrl(value) {
  const input = typeof value === "string" ? value.trim() : "";
  if (!input) return "";
  if (input.length > MAX_COUNTER_URL_LENGTH) return null;

  try {
    const url = new URL(input);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (url.username || url.password) return null;
    if (isBlockedHostname(url.hostname)) return null;
    return url.toString();
  } catch (error) {
    return null;
  }
}

async function resolveHostAddresses(hostname) {
  const types = ["A", "AAAA"];
  const addresses = [];

  for (const type of types) {
    try {
      const res = await fetch(
        `${DOH_ENDPOINT}?name=${encodeURIComponent(hostname)}&type=${type}`,
        { headers: { Accept: "application/dns-json" } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const answer of data?.Answer || []) {
        if (answer?.type === 1 || answer?.type === 28) addresses.push(String(answer.data));
      }
    } catch (err) {
      return null;
    }
  }

  return addresses;
}

async function isPublicCounterApiUrl(value) {
  const normalized = normalizeCounterApiUrl(value);
  if (!normalized) return false;

  const url = new URL(normalized);
  if (IPV4_PATTERN.test(url.hostname) || url.hostname.startsWith("[")) {
    return !isBlockedHostname(url.hostname);
  }

  const addresses = await resolveHostAddresses(url.hostname);
  if (addresses === null) return false;
  if (addresses.length === 0) return false;
  return addresses.every((ip) => !isBlockedIpAddress(ip));
}

export async function validateCounterApiUrl(value) {
  const normalized = normalizeCounterApiUrl(value);
  if (!normalized) return null;
  const safe = await isPublicCounterApiUrl(normalized);
  return safe ? normalized : null;
}

function toSafeCount(value) {
  const count = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(count) || count < 0) return null;
  return Math.floor(count);
}

function extractCounterValue(data, counterType = "download", depth = 0) {
  if (depth > 4 || data === null || data === undefined) return null;

  const direct = toSafeCount(data);
  if (direct !== null) return direct;

  if (Array.isArray(data)) {
    const assetCounts = data
      .flatMap((item) => Array.isArray(item?.assets) ? item.assets : [item])
      .map((item) => toSafeCount(item?.download_count ?? item?.downloads))
      .filter((value) => value !== null);
    if (assetCounts.length) return assetCounts.reduce((total, value) => total + value, 0);

    for (const item of data) {
      const nested = extractCounterValue(item, counterType, depth + 1);
      if (nested !== null) return nested;
    }
    return null;
  }

  if (typeof data !== "object") return null;

  const preferredFields = counterType === "eye"
    ? ["views", "view_count", "viewCount", "total_views", "totalViews", "count", "value"]
    : ["downloads", "download_count", "downloadCount", "total_downloads", "totalDownloads", "count", "value"];

  for (const field of preferredFields) {
    const value = toSafeCount(data[field]);
    if (value !== null) return value;
  }

  for (const field of ["data", "result", "stats", "statistics", "metrics", "releases", "assets"]) {
    if (!(field in data)) continue;
    const nested = extractCounterValue(data[field], counterType, depth + 1);
    if (nested !== null) return nested;
  }

  return null;
}

async function requestCounterJson(url, useNoStore) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const init = {
    headers: {
      Accept: "application/json",
      "User-Agent": "NebulonProject/3.0 (https://nebulonproject.com)"
    },
    redirect: "manual",
    signal: controller.signal
  };
  if (useNoStore) init.cache = "no-store";

  try {
    let currentUrl = url;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const response = await fetch(currentUrl, init);

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return { ok: false, data: null, retry: false };
        const nextUrl = new URL(location, currentUrl).toString();
        const safe = await isPublicCounterApiUrl(nextUrl);
        if (!safe) return { ok: false, data: null, retry: false };
        currentUrl = nextUrl;
        continue;
      }

      if (!response.ok) return { ok: false, data: null, retry: false };
      const data = await response.json();
      return { ok: true, data, retry: false };
    }

    return { ok: false, data: null, retry: false };
  } catch (error) {
    return { ok: false, data: null, retry: useNoStore };
  } finally {
    clearTimeout(timeout);
  }
}

const COUNTER_CACHE_TTL_MS = 60000;
const COUNTER_CACHE_MAX = 200;
const counterCache = new Map();
const counterInflight = new Map();

function pruneCounterCache(now) {
  for (const [key, entry] of counterCache) {
    if (entry.expires <= now) counterCache.delete(key);
  }
  while (counterCache.size >= COUNTER_CACHE_MAX) {
    counterCache.delete(counterCache.keys().next().value);
  }
}

async function loadCounterValue(apiUrl, counterType) {
  const normalizedUrl = await validateCounterApiUrl(apiUrl);
  if (!normalizedUrl) return null;

  let result = await requestCounterJson(normalizedUrl, true);
  if (!result.ok && result.retry) {
    result = await requestCounterJson(normalizedUrl, false);
  }
  if (!result.ok) return null;

  return extractCounterValue(result.data, counterType);
}

export async function fetchCounterValue(apiUrl, counterType = "download") {
  const key = `${counterType}|${apiUrl}`;
  const now = Date.now();
  const cached = counterCache.get(key);
  if (cached && cached.expires > now) return cached.value;
  if (counterInflight.has(key)) return counterInflight.get(key);

  const pending = loadCounterValue(apiUrl, counterType)
    .then((value) => {
      pruneCounterCache(Date.now());
      counterCache.set(key, { value, expires: Date.now() + COUNTER_CACHE_TTL_MS });
      return value;
    })
    .finally(() => counterInflight.delete(key));
  counterInflight.set(key, pending);
  return pending;
}
