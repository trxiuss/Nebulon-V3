import { NextResponse } from "next/server";
import { getSetting, setSetting, writeAuditLog } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { apiMessage } from "@/lib/api-messages";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import {
  getTurnstileConfig,
  checkTurnstileSecret,
  isValidTurnstileKey,
  TURNSTILE_SITE_KEY_SETTING,
  TURNSTILE_SECRET_KEY_SETTING
} from "@/lib/turnstile";

export const runtime = "edge";

function maskKey(value) {
  if (!value || typeof value !== "string") return "";
  const v = value.trim();
  if (v.length <= 8) return "********";
  return `${v.slice(0, 4)}********${v.slice(-4)}`;
}

export async function GET(request) {
  const { user, response } = await requirePermission(request, "settings.view");
  if (!user) return response;

  const stored = await getSetting("deepl_api_key");
  const key = await decryptSecret(stored);
  const canEdit = user.permissions.includes("*") || user.permissions.includes("settings.edit");

  const turnstile = await getTurnstileConfig();

  return NextResponse.json({
    deepl_api_key_set: Boolean(key && String(key).trim()),
    deepl_api_key_masked: canEdit && key ? maskKey(String(key)) : key ? "********" : "",
    turnstile_enabled: turnstile.enabled,
    turnstile_source: turnstile.source,
    turnstile_site_key_masked: canEdit && turnstile.enabled ? maskKey(turnstile.siteKey) : turnstile.enabled ? "********" : "",
    turnstile_secret_set: turnstile.enabled,
    turnstile_secret_masked: canEdit && turnstile.enabled ? maskKey(turnstile.secret) : turnstile.enabled ? "********" : "",
    can_edit: canEdit
  });
}

export async function PUT(request) {
  const { user, response } = await requirePermission(request, "settings.edit");
  if (!user) return response;

  const body = await request.json().catch(() => null);

  if (body && typeof body.turnstile === "object" && body.turnstile) {
    const tb = body.turnstile;

    if (tb.disable === true) {
      await setSetting(TURNSTILE_SITE_KEY_SETTING, "");
      await setSetting(TURNSTILE_SECRET_KEY_SETTING, "");
      await writeAuditLog(user, "update", "settings", null, { turnstile: "disabled" });
      return NextResponse.json({ ok: true });
    }

    const siteInput = typeof tb.site_key === "string" ? tb.site_key.trim() : "";
    const secretInput = typeof tb.secret_key === "string" ? tb.secret_key.trim() : "";
    const existing = await getTurnstileConfig();
    const siteKey = siteInput || existing.siteKey;
    const secret = secretInput || existing.secret;

    if ((!siteInput && !secretInput && existing.enabled) || !isValidTurnstileKey(siteKey) || !isValidTurnstileKey(secret)) {
      return NextResponse.json(
        { error: apiMessage(request, "settings.turnstileInvalid") },
        { status: 400 }
      );
    }

    if (secretInput) {
      const check = await checkTurnstileSecret(secretInput);
      if (!check.ok) {
        return NextResponse.json(
          {
            error: apiMessage(
              request,
              check.reason === "unreachable" ? "settings.turnstileUnreachable" : "settings.turnstileRejected"
            )
          },
          { status: 400 }
        );
      }
    }

    await setSetting(TURNSTILE_SITE_KEY_SETTING, await encryptSecret(siteKey));
    await setSetting(TURNSTILE_SECRET_KEY_SETTING, await encryptSecret(secret));
    await writeAuditLog(user, "update", "settings", null, { turnstile: "enabled" });
    return NextResponse.json({ ok: true });
  }

  if (body && body.deepl_clear === true) {
    await setSetting("deepl_api_key", "");
    await writeAuditLog(user, "update", "settings", null, { deepl_api_key: false });
    return NextResponse.json({ ok: true });
  }

  const deepl = typeof body?.deepl_api_key === "string" ? body.deepl_api_key.trim() : null;

  if (!deepl) {
    return NextResponse.json({ error: apiMessage(request, "settings.required") }, { status: 400 });
  }

  const stored = deepl ? await encryptSecret(deepl) : "";
  await setSetting("deepl_api_key", stored);
  await writeAuditLog(user, "update", "settings", null, { deepl_api_key: Boolean(deepl) });
  return NextResponse.json({ ok: true });
}
