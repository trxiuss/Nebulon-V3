import { NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { verifyPassword, isLegacyHash, generateSalt, hashPassword } from "@/lib/crypto";
import { setSessionCookie } from "@/lib/session";
import { apiMessage } from "@/lib/api-messages";
import { rateLimit, resetRateLimit, clientKey } from "@/lib/rate-limit";
import { recordAuthEvent } from "@/lib/auth-logs";
import { verifyTurnstile } from "@/lib/turnstile";

export const runtime = "edge";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request) {
  try {
    const key = clientKey(request, "login");
    const limit = await rateLimit(key, 8, 60000);

    if (!limit.allowed) {
      return NextResponse.json(
        { error: apiMessage(request, "auth.rateLimited"), code: "auth.rateLimited" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }

    const body = await request.json().catch(() => null);
    const username = body?.username?.trim();
    const password = body?.password;

    if (typeof body?.website === "string" && body.website.trim() !== "") {
      await sleep(800);
      return NextResponse.json(
        { error: apiMessage(request, "auth.invalid"), code: "auth.invalid" },
        { status: 401 }
      );
    }

    const captcha = await verifyTurnstile(request, body?.cfTurnstile);
    if (!captcha.ok) {
      await recordAuthEvent(request, {
        username: username || null,
        event: "login",
        status: "failed",
        details: { reason: "captcha_failed", captcha: captcha.reason }
      });
      return NextResponse.json(
        { error: apiMessage(request, "auth.captcha"), code: "auth.captcha" },
        { status: 403 }
      );
    }

    if (!username || !password) {
      await sleep(800);
      return NextResponse.json(
        { error: apiMessage(request, "auth.missing"), code: "auth.missing" },
        { status: 400 }
      );
    }

    const user = await queryOne(
      "SELECT id, username, password_hash, salt, role, token_version FROM users WHERE username = ?",
      [username]
    );

    if (!user) {
      await recordAuthEvent(request, {
        username,
        event: "login",
        status: "failed",
        details: { reason: "unknown_user" }
      });
      await sleep(800);
      return NextResponse.json(
        { error: apiMessage(request, "auth.invalid"), code: "auth.invalid" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.salt, user.password_hash);

    if (!valid) {
      await recordAuthEvent(request, {
        userId: user.id,
        username: user.username,
        event: "login",
        status: "failed",
        details: { reason: "invalid_password" }
      });
      await sleep(800);
      return NextResponse.json(
        { error: apiMessage(request, "auth.invalid"), code: "auth.invalid" },
        { status: 401 }
      );
    }

    if (isLegacyHash(user.password_hash)) {
      const salt = generateSalt();
      const upgraded = await hashPassword(password, salt);
      await execute("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?", [
        upgraded,
        salt,
        user.id
      ]);
    }

    await resetRateLimit(key);
    await setSessionCookie(user);
    await recordAuthEvent(request, {
      userId: user.id,
      username: user.username,
      event: "login",
      status: "success",
      details: { role: user.role }
    });

    return NextResponse.json({ ok: true, username: user.username, role: user.role });
  } catch (err) {
    console.error("[nebulon] login route hatasi:", err?.stack || err?.message || err);
    return NextResponse.json(
      { error: apiMessage(request, "auth.serverError"), code: "auth.serverError" },
      { status: 500 }
    );
  }
}
