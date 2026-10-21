import { getSetting } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";

const ENDPOINT = "https://api-free.deepl.com/v2/translate";
const TIMEOUT_MS = 3000;

async function deeplTranslate(text, targetLang, apiKey) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text: [text], target_lang: targetLang }),
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`DeepL HTTP ${res.status}`);
    const data = await res.json();
    const translation = data?.translations?.[0];
    if (!translation || typeof translation.text !== "string") throw new Error("DeepL bos yanit");
    return {
      text: translation.text,
      detectedSourceLang: (translation.detected_source_lang || "").toUpperCase()
    };
  } finally {
    clearTimeout(timer);
  }
}

async function resolveApiKey() {
  try {
    const fromDb = await decryptSecret(await getSetting("deepl_api_key"));
    if (fromDb && fromDb.trim()) return fromDb.trim();
  } catch (err) {}

  return "";
}

export async function translateBidirectional(inputText) {
  const text = typeof inputText === "string" ? inputText.trim() : "";
  if (!text) return { tr: "", en: "", ok: true };

  const apiKey = await resolveApiKey();

  if (!apiKey) {
    return { tr: text, en: text, ok: false, error: "missing_api_key" };
  }

  try {
    const toEn = await deeplTranslate(text, "EN-US", apiKey);

    if (toEn.detectedSourceLang === "EN") {
      const toTr = await deeplTranslate(text, "TR", apiKey);
      return { en: text, tr: toTr.text, ok: true };
    }

    return { tr: text, en: toEn.text, ok: true };
  } catch (err) {
    return { tr: text, en: text, ok: false, error: err?.message || "translate_failed" };
  }
}
