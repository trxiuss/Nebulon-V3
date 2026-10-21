import { getEnv } from "@/lib/env";

const KV_BINDING = "RATE_LIMIT_KV";

export function clientKey(request, scope = "default") {
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `${scope}:${ip}`;
}

function resolveStore() {
  const env = getEnv();
  const kv = env && env[KV_BINDING];
  if (kv && typeof kv.get === "function" && typeof kv.put === "function") {
    return { kv };
  }

  console.error(
    `[nebulon] ${KV_BINDING} binding tanimli degil. Uretim ortaminda dagitik rate limit zorunludur.`
  );
  throw new Error("RATE_LIMIT_KV_MISSING");
}

export async function rateLimit(key, limit = 8, windowMs = 60000) {
  const { kv } = resolveStore();

  const now = Date.now();
  const storageKey = `rl:${key}`;
  let entry = null;

  try {
    entry = await kv.get(storageKey, "json");
  } catch (err) {
    console.error("[nebulon] rate limit okunamadi:", err?.message || err);
  }

  if (!entry || typeof entry.resetAt !== "number" || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
  } else {
    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
    }
    entry.count += 1;
  }

  const ttl = Math.max(60, Math.ceil((entry.resetAt - now) / 1000));

  try {
    await kv.put(storageKey, JSON.stringify(entry), { expirationTtl: ttl });
  } catch (err) {
    console.error("[nebulon] rate limit yazilamadi:", err?.message || err);
  }

  return { allowed: true, remaining: Math.max(0, limit - entry.count), retryAfter: 0 };
}

export async function resetRateLimit(key) {
  let store = null;
  try {
    store = resolveStore();
  } catch (err) {
    return;
  }

  try {
    await store.kv.delete(`rl:${key}`);
  } catch (err) {
    console.error("[nebulon] rate limit sifirlanamadi:", err?.message || err);
  }
}
