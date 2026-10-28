import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { audit, can, requireStaff } from "@/lib/auth/guards";
import { jsonError } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { ok, validationError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ ids: z.array(z.string()).min(1).max(200) });

export async function POST(req: Request) {
  const rl = await rateLimit("adminMutation", clientIp(req));
  if (!rl.success) return tooMany(rl);
  try {
    const actor = await requireStaff();
    if (!can.manageContent(actor.role)) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return validationError(parsed.error);

    await prisma.$transaction(
      parsed.data.ids.map((id, index) =>
        prisma.heroSlide.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );

    await audit({ actorId: actor.id, action: "SLIDE_REORDER", entity: "HeroSlide", ip: clientIp(req), after: { count: parsed.data.ids.length } });
    return ok();
  } catch (e) {
    return jsonError(e, "Reorder failed");
  }
}