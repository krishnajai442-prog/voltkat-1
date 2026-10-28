import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { audit, can, requireStaff } from "@/lib/auth/guards";
import { couponInputSchema } from "@/lib/validators";
import { jsonError } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { ok, validationError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function couponVM(c: any) {
  return {
    id: c.id,
    code: c.code,
    description: c.description,
    type: c.type,
    value: c.value,
    scope: c.scope,
    categoryId: c.categoryId,
    brandId: c.brandId,
    categoryName: c.category?.name ?? null,
    brandName: c.brand?.name ?? null,
    minOrderValue: c.minOrderValue,
    maxDiscount: c.maxDiscount,
    usageLimit: c.usageLimit,
    usedCount: c.usedCount,
    perUserLimit: c.perUserLimit,
    active: c.active,
    startsAt: c.startsAt?.toISOString?.() ?? c.startsAt ?? null,
    endsAt: c.endsAt?.toISOString?.() ?? c.endsAt ?? null,
  };
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const rl = await rateLimit("adminMutation", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const actor = await requireStaff();
    if (!can.manageContent(actor.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const before = await prisma.coupon.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ ok: false, error: "Coupon not found" }, { status: 404 });

    const parsed = couponInputSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return validationError(parsed.error);
    const data = parsed.data;

    if (data.code !== before.code) {
      const dup = await prisma.coupon.findUnique({ where: { code: data.code } });
      if (dup) return NextResponse.json({ ok: false, error: "Coupon code already exists" }, { status: 409 });
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        code: data.code,
        description: data.description || null,
        type: data.type,
        value: data.value,
        scope: data.scope,
        categoryId: data.categoryId || null,
        brandId: data.brandId || null,
        minOrderValue: data.minOrderValue,
        maxDiscount: data.maxDiscount ?? null,
        usageLimit: data.usageLimit ?? null,
        perUserLimit: data.perUserLimit,
        active: data.active,
        startsAt: data.startsAt ? new Date(data.startsAt) : before.startsAt,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
      },
      include: { category: { select: { name: true } }, brand: { select: { name: true } } },
    });

    await audit({
      actorId: actor.id,
      action: "COUPON_UPDATE",
      entity: "Coupon",
      entityId: id,
      ip: clientIp(req),
      before: { code: before.code, active: before.active },
      after: { code: coupon.code, active: coupon.active },
    });

    return ok({ coupon: couponVM(coupon) });
  } catch (e) {
    return jsonError(e, "Coupon update failed");
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const rl = await rateLimit("adminMutation", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const actor = await requireStaff();
    if (!can.destroy(actor.role)) {
      return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const before = await prisma.coupon.findUnique({ where: { id }, select: { id: true, code: true } });
    if (!before) return NextResponse.json({ ok: false, error: "Coupon not found" }, { status: 404 });

    await prisma.coupon.delete({ where: { id } });
    await audit({ actorId: actor.id, action: "COUPON_DELETE", entity: "Coupon", entityId: id, ip: clientIp(req), before: { code: before.code } });
    return ok({ id });
  } catch (e) {
    return jsonError(e, "Coupon delete failed");
  }
}