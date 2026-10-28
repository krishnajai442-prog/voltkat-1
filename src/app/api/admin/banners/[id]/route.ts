import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { audit, can, requireStaff } from "@/lib/auth/guards";
import { bannerInputSchema } from "@/lib/validators";
import { jsonError } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { ok, validationError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const rl = await rateLimit("adminMutation", clientIp(req));
  if (!rl.success) return tooMany(rl);
  try {
    const actor = await requireStaff();
    if (!can.manageContent(actor.role)) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { id } = await ctx.params;
    const parsed = bannerInputSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return validationError(parsed.error);

    const banner = await prisma.banner.update({ where: { id }, data: parsed.data });
    await audit({ actorId: actor.id, action: "BANNER_UPDATE", entity: "Banner", entityId: id, ip: clientIp(req), after: { title: banner.title } });
    return ok({ banner });
  } catch (e) {
    return jsonError(e, "Banner update failed");
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const rl = await rateLimit("adminMutation", clientIp(req));
  if (!rl.success) return tooMany(rl);
  try {
    const actor = await requireStaff();
    if (!can.destroy(actor.role)) return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });

    const { id } = await ctx.params;
    await prisma.banner.delete({ where: { id } });
    await audit({ actorId: actor.id, action: "BANNER_DELETE", entity: "Banner", entityId: id, ip: clientIp(req) });
    return ok();
  } catch (e) {
    return jsonError(e, "Banner delete failed");
  }
}