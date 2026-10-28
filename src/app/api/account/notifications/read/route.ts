import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActor } from "@/lib/auth/guards";
import { jsonError } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const actor = await requireActor();

    await prisma.notification.updateMany({
      where: { userId: actor.id, read: false },
      data: { read: true },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e, "Could not mark notifications read.");
  }
}