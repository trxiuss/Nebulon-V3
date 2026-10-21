import { getSetting } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const TURNSTILE_SITE_KEY_SETTING = "turnstile_site_key";
export const TURNSTILE_SECRET_KEY_SETTING = "turnstile_secret_key";

const KEY_PATTERN = /^[A-Za-z0-9_-]{8,200}$/;

export function isValidTurnstileKey(value) {
  return typeof value === "string" && KEY_PATTERN.test(value.trim());
}

export async function getTurnstileConfig() {
  try {
    const storedSite = await getSetting(TURNSTILE_SITE_KEY_SETTING);
    const dbSite = storedSite ? String((await decryptSecret(storedSite)) || "").trim() : "";
    const storedSecret = await getSetting(TURNSTILE_SECRET_KEY_SETTING);
    const dbSecret = storedSecret ? String((await decryptSecret(storedSecret)) || "").trim() : "";
    if (dbSite && dbSecret) {
      return { enabled: true, siteKey: dbSite, secret: dbSecret, source: "dashboard" };
    }
  } catch (err) {
    console.error("[nebulon] turnstile ayarlari okunamadi:", err?.message || err);
  }

  return { enabled: false, siteKey: "", secret: "", source: "" };
}

async function callSiteverify(secret, token, remoteIp) {
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (remoteIp) form.append("remoteip", remoteIp);
  const res = await fetch(VERIFY_URL, { method: "POST", body: form });
  return res.json();
}

export async function verifyTurnstile(request, token) {
  const config = await getTurnstileConfig();
  if (!config.enabled) return { ok: true, skipped: true };

  if (typeof token !== "string" || !token || token.length > 2048) {
    return { ok: false, reason: "missing_token" };
  }

  try {
    const data = await callSiteverify(config.secret, token, request.headers.get("cf-connecting-ip"));
    if (data && data.success === true) return { ok: true };
    const codes = Array.isArray(data?.["error-codes"]) ? data["error-codes"].join(",") : "";
    return { ok: false, reason: codes || "rejected" };
  } catch (err) {
    console.error("[nebulon] turnstile dogrulama hatasi:", err?.message || err);
    return { ok: false, reason: "unreachable" };
  }
}

export async function checkTurnstileSecret(secret) {
  try {
    const data = await callSiteverify(secret, "nebulon-secret-check", null);
    const codes = Array.isArray(data?.["error-codes"]) ? data["error-codes"] : [];
    if (codes.includes("invalid-input-secret")) return { ok: false, reason: "rejected" };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: "unreachable" };
  }
}
