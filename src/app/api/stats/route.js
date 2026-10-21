import { NextResponse } from "next/server";
import { getPublicStats } from "@/lib/public-data";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getPublicStats());
}
