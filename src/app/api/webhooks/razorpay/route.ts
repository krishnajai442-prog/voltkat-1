import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { notifyStaff } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!verifyWebhookSignature(raw, signature)) {
      return NextResponse.json({ ok: false, error: "Invalid webhook signature." }, { status: 400 });
    }

    const event = JSON.parse(raw) as {
      event?: string;
      payload?: {
        payment?: { entity?: { id?: string; order_id?: string; status?: string; amount?: number } };
        refund?: { entity?: { id?: string; payment_id?: string; status?: string; amount?: number } };
      };
    };

    if (event.event === "payment.captured" && event.payload?.payment?.entity?.order_id) {
      const payment = await prisma.payment.findUnique({
        where: { razorpayOrderId: event.payload.payment.entity.order_id },
        include: { order: { select: { orderNumber: true, status: true } } },
      });

      if (payment && payment.status !== "PAID") {
        await notifyStaff({
          template: "ADMIN_PAYMENT",
          ctx: {
            orderNumber: payment.order?.orderNumber ?? payment.razorpayOrderId ?? "-",
            total: `₹${((event.payload.payment.entity.amount ?? payment.amountPaise) / 100).toLocaleString("en-IN")}`,
            method: payment.method,
            paymentId: event.payload.payment.entity.id ?? "-",
          },
        });
      }
    }

    if (event.event === "refund.processed" && event.payload?.refund?.entity?.payment_id) {
      await prisma.payment.updateMany({
        where: { razorpayPaymentId: event.payload.refund.entity.payment_id },
        data: {
          status: "REFUNDED",
          refundId: event.payload.refund.entity.id ?? null,
          refundedAmountPaise: event.payload.refund.entity.amount ?? undefined,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[razorpay:webhook]", e);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}