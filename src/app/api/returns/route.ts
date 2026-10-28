import { NextResponse } from "next/server";
import { ReturnReason, ReturnStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireActor } from "@/lib/auth/guards";
import { returnSchema } from "@/lib/validators";
import { jsonError, sanitizeText } from "@/lib/utils";
import { notify, notifyStaff } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const actor = await requireActor();

    const parsed = returnSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid return request",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const data = parsed.data;

    const item = await prisma.orderItem.findUnique({
      where: { id: data.orderItemId },
      include: {
        order: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true, whatsappOptIn: true } },
          },
        },
        product: { select: { id: true, name: true, returnableDays: true } },
      },
    });

    if (!item) {
      return NextResponse.json({ ok: false, error: "Order item not found." }, { status: 404 });
    }

    if (item.order.userId !== actor.id) {
      return NextResponse.json({ ok: false, error: "Not allowed." }, { status: 403 });
    }

    if (item.order.status !== "DELIVERED" || !item.order.deliveredAt) {
      return NextResponse.json(
        { ok: false, error: "Returns are allowed only after delivery." },
        { status: 409 },
      );
    }

    const daysSinceDelivery =
      (Date.now() - new Date(item.order.deliveredAt).getTime()) / 86400000;

    const window = item.product?.returnableDays ?? 7;

    if (daysSinceDelivery > window) {
      return NextResponse.json(
        { ok: false, error: `Return window of ${window} days has passed.` },
        { status: 409 },
      );
    }

    const existing = await prisma.returnRequest.findUnique({
      where: { orderItemId: item.id },
      select: { id: true, status: true },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "A return request already exists for this item." },
        { status: 409 },
      );
    }

    const ret = await prisma.returnRequest.create({
      data: {
        orderItemId: item.id,
        orderId: item.orderId,
        userId: actor.id,
        reason: data.reason as ReturnReason,
        details: data.details ? sanitizeText(data.details, 1000) : null,
        status: ReturnStatus.REQUESTED,
        resolution: data.resolution,
      },
    });

    await notify({
      template: "RETURN_STATUS",
      userId: actor.id,
      email: item.order.user?.email ?? undefined,
      phone: item.order.user?.phone ?? undefined,
      whatsappOptIn: item.order.user?.whatsappOptIn,
      ctx: {
        orderNumber: item.order.orderNumber,
        status: "REQUESTED",
        note: "Our team will review your return request shortly.",
      },
    });

    await notifyStaff({
      template: "ADMIN_RETURN",
      ctx: {
        orderNumber: item.order.orderNumber,
        product: item.product?.name ?? item.name,
        reason: data.reason,
      },
    });

    return NextResponse.json({
      ok: true,
      return: {
        id: ret.id,
        status: ret.status,
      },
    });
  } catch (e) {
    return jsonError(e, "Could not create return request.");
  }
}