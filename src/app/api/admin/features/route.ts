import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { audit, can, requireStaff } from "@/lib/auth/guards";
import { featureInputSchema } from "@/lib/validators";
import { jsonError } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { ok, validationError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  const rl = await rateLimit("adminMutation", clientIp(req));
  if (!rl.success) return tooMany(rl);
  try {
    const actor = await requireStaff();
    if (!can.manageContent(actor.role)) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const parsed = featureInputSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return validationError(parsed.error);
    const { section, productIds } = parsed.data;

    if (productIds.length) {
      const count = await prisma.product.count({ where: { id: { in: productIds }, active: true } });
      if (count !== productIds.length) return NextResponse.json({ ok: false, error: "Invalid product selection" }, { status: 422 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.productFeature.deleteMany({ where: { section } });
      if (productIds.length) {
        await tx.productFeature.createMany({
          data: productIds.map((productId, position) => ({ section, productId, position })),
        });
      }
    });

    await audit({ actorId: actor.id, action: "FEATURE_UPDATE", entity: "ProductFeature", entityId: section, ip: clientIp(req), after: { count: productIds.length } });
    return ok();
  } catch (e) {
    return jsonError(e, "Feature update failed");
  }
}