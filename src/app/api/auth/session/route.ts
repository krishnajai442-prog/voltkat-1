import { NextResponse } from "next/server";
import { getActor } from "@/lib/auth/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getActor();
  return NextResponse.json({ ok: true, user });
}