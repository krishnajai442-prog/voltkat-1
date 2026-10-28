import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { audit, can, requireStaff } from "@/lib/auth/guards";
import { couponInputSchema } from "@/lib/validators";
import { formatDate, jsonError } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { broadcast } from "@/lib/notifications";
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

export async function POST(req: Request) {
  const rl = await rateLimit("adminMutation", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const actor = await requireStaff();
    if (!can.manageContent(actor.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const parsed = couponInputSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return validationError(parsed.error);
    const data = parsed.data;

    const existing = await prisma.coupon.findUnique({ where: { code: data.code } });
    if (existing) return NextResponse.json({ ok: false, error: "Coupon code already exists" }, { status: 409 });

    const coupon = await prisma.coupon.create({
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
        startsAt: data.startsAt ? new Date(data.startsAt) : new Date(),
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
      },
      include: { category: { select: { name: true } }, brand: { select: { name: true } } },
    });

    await audit({
      actorId: actor.id,
      action: "COUPON_CREATE",
      entity: "Coupon",
      entityId: coupon.id,
      ip: clientIp(req),
      after: { code: coupon.code, value: coupon.value, type: coupon.type },
    });

    if (data.broadcast) {
      await broadcast({
        template: "COUPON_BROADCAST",
        ctx: {
          code: coupon.code,
          description: coupon.description ?? "New coupon live",
          date: coupon.endsAt ? formatDate(coupon.endsAt) : "limited period",
        },
      }).catch((e) => console.error("[coupon:broadcast]", e));
    }

    return ok({ coupon: couponVM(coupon) });
  } catch (e) {
    return jsonError(e, "Coupon creation failed");
  }
}