import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActor } from "@/lib/auth/guards";
import { profileSchema } from "@/lib/validators";
import { jsonError, sanitizeText } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const rl = await rateLimit("form", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const actor = await requireActor();

    const parsed = profileSchema.safeParse(await req.json().catch(() => ({})));

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid profile update",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const data = parsed.data;
    const update: Record<string, unknown> = {};

    if (data.name) update.name = sanitizeText(data.name, 80);
    if (data.phone !== undefined) update.phone = data.phone || null;
    if (typeof data.whatsappOptIn === "boolean") update.whatsappOptIn = data.whatsappOptIn;
    if (typeof data.marketingOptIn === "boolean") update.marketingOptIn = data.marketingOptIn;

    const user = await prisma.user.update({
      where: { id: actor.id },
      data: update,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        whatsappOptIn: true,
        marketingOptIn: true,
      },
    });

    return NextResponse.json({ ok: true, user });
  } catch (e) {
    return jsonError(e, "Could update profile.");
  }
}