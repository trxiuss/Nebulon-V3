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
    return NextResponse.json({ user: null, epoch: 0 }, { status: 200, headers: NO_STORE });
  }
  const epoch = await getPermissionEpoch();
  return NextResponse.json(
    {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
        roleRank: user.roleRank,
        fullAccess: Boolean(user.fullAccess),
        isSystemAdmin: user.isSystemAdmin,
        roleVersion: user.roleVersion,
        stamp: permissionStamp(user)
      },
      epoch
    },
    { headers: NO_STORE }
  );
}
