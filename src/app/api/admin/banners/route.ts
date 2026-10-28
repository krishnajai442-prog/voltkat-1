import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { audit, can, requireStaff } from "@/lib/auth/guards";
import { bannerInputSchema } from "@/lib/validators";
import { jsonError } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { ok, validationError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rl = await rateLimit("adminMutation", clientIp(req));
  if (!rl.success) return tooMany(rl);
  try {
    const actor = await requireStaff();
    if (!can.manageContent(actor.role)) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const parsed = bannerInputSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return validationError(parsed.error);

    const banner = await prisma.banner.create({ data: parsed.data });
    await audit({ actorId: actor.id, action: "BANNER_CREATE", entity: "Banner", entityId: banner.id, ip: clientIp(req), after: { title: banner.title } });
    return ok({ banner });
  } catch (e) {
    return jsonError(e, "Banner creation failed");
  }
}