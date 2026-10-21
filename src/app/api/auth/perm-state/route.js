import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getPermissionEpoch } from "@/lib/db";
import { permissionStamp } from "@/lib/permissions";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache"
};

export async function GET(request) {
  const { user } = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ authed: false, stamp: "anon", epoch: 0 }, { headers: NO_STORE });
  }
  const epoch = await getPermissionEpoch();
  return NextResponse.json(
    { authed: true, stamp: permissionStamp(user), epoch },
    { headers: NO_STORE }
  );
}
