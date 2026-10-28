import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { audit, can, requireStaff } from "@/lib/auth/guards";
import { jsonError } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { ok, validationError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ active: z.boolean() });

/**
 * PATCH /api/admin/slides/:id/active — flip a slide's active flag without
 * touching any other field (no re-validation of content, no join-row churn).
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const rl = await rateLimit("adminMutation", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const actor = await requireStaff();
    if (!can.manageContent(actor.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return validationError(parsed.error);

    await prisma.heroSlide.update({ where: { id }, data: { active: parsed.data.active } });

    await audit({
      actorId: actor.id,
      action: "SLIDE_UPDATE",
      entity: "HeroSlide",
      entityId: id,
      ip: clientIp(req),
      after: { active: parsed.data.active },
    });

    return ok({ active: parsed.data.active });
  } catch (e) {
    return jsonError(e, "Slide active toggle failed");
  }
}