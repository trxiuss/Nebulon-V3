import { getEnv } from "@/lib/env";

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_PREFIX = "pbkdf2$";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const SESSION_COOKIE_NAME = "nebulon_session";
export { SESSION_MAX_AGE_SECONDS };

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function toBase64Url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function generateSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return toHex(bytes.buffer);
}

async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}

async function pbkdf2Hex(password, salt, iterations = PBKDF2_ITERATIONS) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: fromHex(salt), iterations },
    key,
    256
  );
  return toHex(bits);
}

export async function hashPassword(password, salt) {
  const derived = await pbkdf2Hex(password, salt);
  return `${PBKDF2_PREFIX}${PBKDF2_ITERATIONS}$${derived}`;
}

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const maxLen = Math.max(a.length, b.length);
  let mismatch = a.length === b.length ? 0 : 1;
  for (let i = 0; i < maxLen; i++) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    mismatch |= ca ^ cb;
  }
  return mismatch === 0;
}

function isLegacyHash(storedHash) {
  return typeof storedHash === "string" && !storedHash.startsWith(PBKDF2_PREFIX);
}
export { isLegacyHash };

export async function verifyPassword(password, salt, storedHash) {
  if (!storedHash) return false;

  if (isLegacyHash(storedHash)) {
    const legacy = await sha256Hex(`${salt}${password}`);
    return timingSafeEqual(legacy, storedHash);
  }

  const parts = storedHash.split("$");
  const iterations = Number(parts[1]) || PBKDF2_ITERATIONS;
  const expected = parts[2] || "";
  const derived = await pbkdf2Hex(password, salt, iterations);
  return timingSafeEqual(derived, expected);
}

const MIN_PASSWORD_LENGTH = 8;

const COMMON_PASSWORDS = [
  "password", "password1", "password123", "123456", "1234567", "12345678",
  "123456789", "1234567890", "qwerty", "qwerty123", "admin", "admin123",
  "administrator", "letmein", "welcome", "iloveyou", "abc12345", "111111",
  "000000", "nebulon", "nebulon123", "yonetici", "sifre123", "parola123"
];

export function isWeakPassword(password) {
  if (typeof password !== "string") return true;
  if (password.length < MIN_PASSWORD_LENGTH) return true;
  return COMMON_PASSWORDS.includes(password.toLowerCase().trim());
}

function resolveSessionSecret() {
  const env = getEnv();
  const secret = typeof env?.SESSION_SECRET === "string" ? env.SESSION_SECRET.trim() : "";
  if (secret) return secret;

  console.error(
    "[nebulon] SESSION_SECRET ortam degiskeni tanimli degil. " +
      "Cloudflare/uretim ortaminda oturum anahtari uretilemez, istek reddediliyor."
  );
  throw new Error("SESSION_SECRET_MISSING");
}

async function getSessionKey() {
  const secret = resolveSessionSecret();

  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

const SECRET_PREFIX = "enc.v1.";

async function getEncryptionKey() {
  const env = getEnv();
  const explicit = typeof env?.ENCRYPTION_KEY === "string" ? env.ENCRYPTION_KEY.trim() : "";
  const base = explicit || resolveSessionSecret();

  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(base),
    { name: "HKDF" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new TextEncoder().encode("nebulon-settings-encryption"),
      info: new TextEncoder().encode("aes-gcm-256")
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function isEncryptedSecret(value) {
  return typeof value === "string" && value.startsWith(SECRET_PREFIX);
}

export async function encryptSecret(plainText) {
  const text = typeof plainText === "string" ? plainText : "";
  if (!text) return "";

  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(text)
  );

  return `${SECRET_PREFIX}${toBase64Url(iv)}.${toBase64Url(new Uint8Array(cipher))}`;
}

export async function decryptSecret(storedValue) {
  const value = typeof storedValue === "string" ? storedValue.trim() : "";
  if (!value) return "";
  if (!isEncryptedSecret(value)) return value;

  try {
    const [rawIv, rawData] = value.slice(SECRET_PREFIX.length).split(".");
    if (!rawIv || !rawData) return "";
    const key = await getEncryptionKey();
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64Url(rawIv) },
      key,
      fromBase64Url(rawData)
    );
    return new TextDecoder().decode(plain);
  } catch (err) {
    console.error("[nebulon] sifreli ayar cozulemedi:", err?.message || err);
    return "";
  }
}

const EMAIL_INDEX_SALT = "nebulon-email-index";

function resolveEncryptionBase() {
  const env = getEnv();
  const explicit = typeof env?.ENCRYPTION_KEY === "string" ? env.ENCRYPTION_KEY.trim() : "";
  return explicit || resolveSessionSecret();
}

async function getEmailIndexKey() {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(resolveEncryptionBase()),
    { name: "HKDF" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new TextEncoder().encode(EMAIL_INDEX_SALT),
      info: new TextEncoder().encode("hmac-sha256")
    },
    material,
    { name: "HMAC", hash: "SHA-256", length: 256 },
    false,
    ["sign"]
  );
}

function normalizeEmail(value) {
  const text = typeof value === "string" ? value.trim().toLowerCase() : "";
  return text || null;
}

export async function emailFingerprint(value) {
  const normalized = normalizeEmail(value);
  if (!normalized) return null;
  const key = await getEmailIndexKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(normalized));
  return toHex(signature);
}

export async function encryptEmail(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  return encryptSecret(text);
}

export async function decryptEmail(value) {
  if (!value) return "";
  return decryptSecret(value);
}

export async function createSessionToken(payload) {
  const key = await getSessionKey();
  const body = { ...payload, exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 };
  const encodedBody = toBase64Url(new TextEncoder().encode(JSON.stringify(body)));
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encodedBody));
  const encodedSignature = toBase64Url(new Uint8Array(signature));
  return `${encodedBody}.${encodedSignature}`;
}

export async function verifySessionToken(token) {
  if (!token || !token.includes(".")) return null;
  const [encodedBody, encodedSignature] = token.split(".");
  const key = await getSessionKey();
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    fromBase64Url(encodedSignature),
    new TextEncoder().encode(encodedBody)
  );
  if (!valid) return null;
  const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encodedBody)));
  if (!payload.exp || payload.exp < Date.now()) return null;
  return payload;
}
