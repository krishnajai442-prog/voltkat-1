import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { audit, can, requireStaff } from "@/lib/auth/guards";
import { orderStatusSchema } from "@/lib/validators";
import { advanceStatus } from "@/lib/orders";
import { jsonError } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { ok, validationError } from "@/lib/api-response";
import { notifyStatusChange } from "@/lib/notify";
import { generateDeliveryOtp, verifyDeliveryOtp, maskOtp } from "@/lib/delivery-otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ orderNumber: string }> }) {
  const rl = await rateLimit("adminMutation", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const actor = await requireStaff();
    if (!can.manageOrders(actor.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { orderNumber } = await ctx.params;
    const parsed = orderStatusSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return validationError(parsed.error);

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: { id: true, status: true },
    });
    if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });

    if (order.status === "CANCELLED" && parsed.data.status !== "CANCELLED") {
      return NextResponse.json({ ok: false, error: "Cancelled orders cannot be reopened" }, { status: 409 });
    }

    if (parsed.data.status === "DELIVERED") {
      const provided = typeof parsed.data.otp === "string" ? parsed.data.otp : "";
      const v = await verifyDeliveryOtp(order.id, provided);
      if (!v.ok) {
        const msg =
          v.reason === "mismatch" ? "Delivery OTP does not match."
          : v.reason === "no_otp" ? "No delivery OTP on this order yet — ship it first."
          : v.reason === "already_delivered" ? "Already delivered via OTP."
          : "Order not found.";
        return NextResponse.json({ ok: false, error: msg }, { status: 422 });
      }
    }

    const updated = await advanceStatus({
      orderId: order.id,
      status: parsed.data.status,
      actorId: actor.id,
      carrier: parsed.data.carrier ?? null,
      tracking: parsed.data.trackingNumber ?? null,
      note: parsed.data.note ?? null,
      location: parsed.data.location ?? null,
    });

    // ---- Audit timestamps for the customer tracking timeline ----
    // advanceStatus() only writes `status`; the milestone dates are ours to set.
    const now = new Date();
    if (updated.status === "CONFIRMED") {
      await prisma.order.update({ where: { id: updated.id }, data: { confirmedAt: now } });
    } else if (updated.status === "PROCESSING") {
      await prisma.order.update({ where: { id: updated.id }, data: { processedAt: now } });
    } else if (updated.status === "SHIPPED") {
      await prisma.order.update({ where: { id: updated.id }, data: { shippedAt: now } });
    } else if (updated.status === "OUT_FOR_DELIVERY") {
      await prisma.order.update({ where: { id: updated.id }, data: { outForDeliveryAt: now } });
    } else if (updated.status === "DELIVERED") {
      await prisma.order.update({ where: { id: updated.id }, data: { deliveredAt: now, deliveredByOtp: true } });
    } else if (updated.status === "CANCELLED") {
      await prisma.order.update({
        where: { id: updated.id },
        data: {
          cancelledAt: now,
          ...(parsed.data.note ? { cancelReason: parsed.data.note } : {}),
        },
      });
    }

    // Delivery handover: mint an OTP and include it in the customer notification.
    let sentOtp: string | undefined;
    if (parsed.data.status === "SHIPPED" || parsed.data.status === "OUT_FOR_DELIVERY") {
      const gen = await generateDeliveryOtp(updated.id);
      if (gen.ok) sentOtp = gen.otp; // handed to notify ONLY; never logged
    }

    await audit({
      actorId: actor.id,
      action: "ORDER_STATUS_UPDATE",
      entity: "Order",
      entityId: order.id,
      ip: clientIp(req),
      before: { status: order.status },
      after: { status: updated.status },
    });

    notifyStatusChange(updated.id, sentOtp); // <- add the 2nd argument

    return ok({
      order: {
        orderNumber: updated.orderNumber,
        status: updated.status,
        deliveryOtpHint: maskOtp((updated as any).deliveryOtp ?? sentOtp),
      },
    });
  } catch (e) {
    return jsonError(e, "Order status update failed");
  }
}