import { NextResponse } from "next/server";
import { translateBidirectional } from "@/lib/translate";
import { requirePermission } from "@/lib/auth";
import { apiMessage } from "@/lib/api-messages";

export const runtime = "edge";

const MAX_TRANSLATE_LENGTH = 5000;

export async function POST(request) {
  const { user, response } = await requirePermission(request, "translate.use");
  if (!user) return response;

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (!text) {
    return NextResponse.json({ error: apiMessage(request, "validation.required") }, { status: 400 });
  }

  if (text.length > MAX_TRANSLATE_LENGTH) {
    return NextResponse.json({ error: apiMessage(request, "validation.tooLong") }, { status: 413 });
  }

  const result = await translateBidirectional(text);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: apiMessage(request, "translate.failed"),
        tr: result.tr,
        en: result.en,
        code: result.error || "translate_failed"
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ tr: result.tr, en: result.en, ok: true });
}
