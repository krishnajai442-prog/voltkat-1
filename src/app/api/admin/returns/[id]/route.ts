import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { audit, can, requireStaff } from "@/lib/auth/guards";
import { returnDecisionSchema } from "@/lib/validators";
import { addDays, jsonError, paise, sanitizeText } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { notify } from "@/lib/notifications";
import { createRefund, razorpayConfigured } from "@/lib/razorpay";
import { ok, validationError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const rl = await rateLimit("adminMutation", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const actor = await requireStaff();
    const { id } = await ctx.params;

    const parsed = returnDecisionSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return validationError(parsed.error);
    const { status, adminNote } = parsed.data;

    if (status === "REFUNDED" && !can.refund(actor.role)) {
      return NextResponse.json({ ok: false, error: "Refunds require ADMIN role" }, { status: 403 });
    }

    const ret = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true, whatsappOptIn: true } },
            payments: { where: { status: "PAID" }, orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
        orderItem: { include: { product: { select: { id: true, name: true, stock: true } } } },
      },
    });

    if (!ret) return NextResponse.json({ ok: false, error: "Return not found" }, { status: 404 });

    if (status === "REPLACED") {
      const res = await prisma.product.updateMany({
        where: { id: ret.orderItem.productId, stock: { gte: 1 } },
        data: { stock: { decrement: 1 } },
      });
      if (res.count !== 1) {
        return NextResponse.json({ ok: false, error: "Replacement blocked: product out of stock" }, { status: 409 });
      }
    }

    let refundNote = "";
    if (status === "REFUNDED") {
      const payment = ret.order.payments[0];
      const amountPaise = Math.min(paise(ret.orderItem.lineTotal), Math.max(0, payment?.amountPaise ?? 0) - (payment?.refundedAmountPaise ?? 0));

      if (payment && razorpayConfigured && payment.razorpayPaymentId && amountPaise > 0) {
        try {
          const refund = await createRefund({
            paymentId: payment.razorpayPaymentId,
            amountPaise,
            note: `Return ${ret.id}`,
            speed: "optimum",
          });
          const newRefunded = (payment.refundedAmountPaise ?? 0) + amountPaise;
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              refundId: refund.id,
              refundedAmountPaise: newRefunded,
              status: newRefunded >= payment.amountPaise ? "REFUNDED" : "PARTIALLY_REFUNDED",
            },
          });
          if (newRefunded >= payment.amountPaise) {
            await prisma.order.update({ where: { id: ret.orderId }, data: { paymentStatus: "REFUNDED" } });
          } else {
            await prisma.order.update({ where: { id: ret.orderId }, data: { paymentStatus: "PARTIALLY_REFUNDED" } });
          }
          refundNote = `Refund ${refund.id} initiated.`;
        } catch (e) {
          refundNote = "Refund API failed; mark manually after gateway review.";
          console.error("[return:refund]", e);
        }
      } else {
        refundNote = "No capturable online payment found; refund marked operationally.";
      }
    }

    const updated = await prisma.returnRequest.update({
      where: { id },
      data: {
        status,
        adminNote: adminNote ? sanitizeText(adminNote, 600) : ret.adminNote,
        pickupEta: status === "APPROVED" ? addDays(new Date(), 5) : ret.pickupEta,
      },
    });

    const ctxNotify = {
      orderNumber: ret.order.orderNumber,
      status: status.replace(/_/g, " "),
      note: adminNote ?? refundNote ?? "",
      date: status === "APPROVED" ? "in 3–5 days" : "soon",
    };

    await notify({
      template:
        status === "APPROVED"
          ? "RETURN_APPROVED"
          : status === "REJECTED"
            ? "RETURN_REJECTED"
            : status === "REFUNDED"
              ? "REFUND_PROCESSED"
              : "RETURN_STATUS",
      userId: ret.userId,
      email: ret.order.user?.email,
      phone: ret.order.user?.phone,
      whatsappOptIn: ret.order.user?.whatsappOptIn,
      ctx: {
        ...ctxNotify,
        amount: status === "REFUNDED" ? `₹${ret.orderItem.lineTotal.toLocaleString("en-IN")}` : "",
      },
    });

    await audit({
      actorId: actor.id,
      action: "RETURN_DECISION",
      entity: "ReturnRequest",
      entityId: id,
      ip: clientIp(req),
      before: { status: ret.status },
      after: { status: updated.status, note: adminNote },
    });

    return ok({ return: { id: updated.id, status: updated.status } });
  } catch (e) {
    return jsonError(e, "Return decision failed");
  }
}