import { NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/session";
import { recordAuthEvent } from "@/lib/auth-logs";

export const runtime = "edge";

export async function POST(request) {
  try {
    const session = await getSession();
    if (session) {
      await recordAuthEvent(request, {
        userId: session.uid ?? null,
        username: session.username || null,
        event: "logout",
        status: "success"
      });
    }
    await clearSessionCookie();
  } catch (err) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
