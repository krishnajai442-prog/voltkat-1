import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireActor } from "@/lib/auth/guards";
import { jsonError } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z
  .object({
    id: z.string().min(1).optional(),
    all: z.boolean().optional(),
  })
  .refine((v) => Boolean(v.id || v.all), {
    message: "Provide notification id or all=true",
  });

export async function PATCH(req: Request) {
  try {
    const actor = await requireActor();
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 422 });
    }

    if (parsed.data.all) {
      await prisma.notification.updateMany({
        where: { userId: actor.id, read: false },
        data: { read: true },
      });
    } else if (parsed.data.id) {
      await prisma.notification.updateMany({
        where: { userId: actor.id, id: parsed.data.id },
        data: { read: true },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e, "Could not update notifications.");
  }
}