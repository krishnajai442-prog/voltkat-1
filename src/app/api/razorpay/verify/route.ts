import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { AppError, jsonError, orderNumber as makeOrderNumber } from "@/lib/utils";
import {
  createRefund,
  razorpayConfigured,
  verifyPaymentSignature,
} from "@/lib/razorpay";
import { notify, notifyStaff } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  razorpay_order_id: z.string().min(10),
  razorpay_payment_id: z.string().min(10),
  razorpay_signature: z.string().min(10),
});

async function refundCapturedPayment(opts: {
  paymentId: string;
  amountPaise: number;
  reason: string;
  orderNumber?: string;
}) {
  if (!razorpayConfigured) return null;

  try {
    const refund = await createRefund({
      paymentId: opts.paymentId,
      amountPaise: opts.amountPaise,
      note: opts.reason,
      speed: "optimum",
    });

    await notifyStaff({
      template: "ADMIN_PAYMENT",
      ctx: {
        orderNumber: opts.orderNumber ?? opts.paymentId,
        total: `₹${(opts.amountPaise / 100).toLocaleString("en-IN")}`,
        method: "AUTO_REFUND",
        paymentId: refund.id,
      },
    });

    return refund;
  } catch (e) {
    console.error("[razorpay:verify:refund]", e);

    await notifyStaff({
      template: "ADMIN_PAYMENT",
      ctx: {
        orderNumber: opts.orderNumber ?? opts.paymentId,
        total: `₹${(opts.amountPaise / 100).toLocaleString("en-IN")}`,
        method: "REFUND_FAILED",
        paymentId: opts.paymentId,
      },
    });

    return null;
  }
}

export async function POST(req: Request) {
  try {
    const parsed = schema.safeParse(await req.json().catch(() => ({})));

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid payment verification payload." },
        { status: 422 },
      );
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = parsed.data;

    const valid = verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!valid) {
      return NextResponse.json(
        { ok: false, error: "Payment signature verification failed." },
        { status: 400 },
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId: razorpay_order_id },
      include: {
        order: {
          include: {
            items: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                whatsappOptIn: true,
              },
            },
          },
        },
      },
    });

    if (!payment || !payment.order) {
      return NextResponse.json(
        { ok: false, error: "Payment intent not found." },
        { status: 404 },
      );
    }

    const order = payment.order;

    if (
      payment.status === "PAID" &&
      !order.orderNumber.startsWith("VKINT")
    ) {
      return NextResponse.json({
        ok: true,
        orderNumber: order.orderNumber,
        alreadyVerified: true,
      });
    }

    if (payment.amountPaise !== order.total * 100) {
      await notifyStaff({
        template: "ADMIN_PAYMENT",
        ctx: {
          orderNumber: order.orderNumber,
          total: `Expected ₹${order.total}, got ₹${payment.amountPaise / 100}`,
          method: payment.method,
          paymentId: razorpay_payment_id,
        },
      });

      return NextResponse.json(
        { ok: false, error: "Payment amount mismatch." },
        { status: 400 },
      );
    }

    const conflicts: { productId: string; name: string; available: number }[] = [];

    for (const item of order.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { id: true, name: true, stock: true, active: true },
      });

      if (!product || !product.active || product.stock < item.quantity) {
        conflicts.push({
          productId: item.productId,
          name: product?.name ?? item.name,
          available: product?.stock ?? 0,
        });
      }
    }

    if (conflicts.length > 0) {
      const refund = await refundCapturedPayment({
        paymentId: razorpay_payment_id,
        amountPaise: payment.amountPaise,
        reason: `Stock conflict for order ${order.orderNumber}`,
        orderNumber: order.orderNumber,
      });

      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: refund ? "REFUNDED" : "FAILED",
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            failureReason: "Stock conflict after payment capture",
            refundId: refund?.id ?? null,
            refundedAmountPaise: refund ? payment.amountPaise : 0,
          },
        });

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "CANCELLED",
            paymentStatus: refund ? "REFUNDED" : "FAILED",
            cancelledAt: new Date(),
            cancelReason: "Stock conflict after payment capture",
          },
        });

        await tx.trackingEvent.create({
          data: {
            orderId: order.id,
            status: "CANCELLED",
            title: "Order cancelled",
            description: refund
              ? "Stock became unavailable after payment. Refund initiated."
              : "Stock became unavailable after payment. Manual refund required.",
            location: "VoltKart Digital",
          },
        });
      });

      await notify({
        template: "CANCELLED",
        userId: order.userId,
        email: order.user?.email ?? order.guestEmail ?? undefined,
        phone: order.user?.phone ?? order.guestPhone ?? undefined,
        whatsappOptIn: order.user?.whatsappOptIn,
        ctx: {
          name: order.user?.name?.split(" ")[0] ?? "there",
          orderNumber: order.orderNumber,
          total: `₹${order.total.toLocaleString("en-IN")}`,
          reason: "Stock conflict after payment",
        },
      });

      return NextResponse.json(
        {
          ok: false,
          code: refund ? "STOCK_REFUNDED" : "STOCK_CONFLICT_MANUAL_REFUND",
          error: refund
            ? "Stock became unavailable. Payment has been refunded."
            : "Stock became unavailable. Our team will process refund manually.",
          conflicts,
        },
        { status: 409 },
      );
    }

    const realOrderNumber = makeOrderNumber();

    try {
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          const res = await tx.product.updateMany({
            where: {
              id: item.productId,
              stock: { gte: item.quantity },
              active: true,
            },
            data: {
              stock: { decrement: item.quantity },
              sold: { increment: item.quantity },
            },
          });

          if (res.count !== 1) {
            throw new AppError(409, "Stock conflict", "STOCK_CONFLICT");
          }
        }

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "PAID",
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            capturedAt: new Date(),
          },
        });

        await tx.order.update({
          where: { id: order.id },
          data: {
            orderNumber: realOrderNumber,
            status: "CONFIRMED",
            paymentStatus: "PAID",
          },
        });

        await tx.trackingEvent.create({
          data: {
            orderId: order.id,
            status: "CONFIRMED",
            title: "Payment received",
            description: "Online payment verified. Order confirmed.",
            location: "VoltKart Digital",
          },
        });

        if (order.couponCode) {
          const coupon = await tx.coupon.findUnique({
            where: { code: order.couponCode },
            select: { id: true, usedCount: true, usageLimit: true },
          });

          if (coupon && (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit)) {
            await tx.coupon.update({
              where: { id: coupon.id },
              data: { usedCount: { increment: 1 } },
            });

            await tx.couponRedemption.create({
              data: {
                couponId: coupon.id,
                userId: order.userId,
                orderId: order.id,
                discount: order.couponDiscount,
              },
            });
          }
        }

        if (order.userId) {
          const cart = await tx.cart.findUnique({
            where: { userId: order.userId },
            select: { id: true },
          });

          if (cart) {
            await tx.cartItem.deleteMany({
              where: {
                cartId: cart.id,
                productId: { in: order.items.map((i) => i.productId) },
              },
            });
          }
        }
      });
    } catch (e) {
      if (e instanceof AppError && e.code === "STOCK_CONFLICT") {
        const refund = await refundCapturedPayment({
          paymentId: razorpay_payment_id,
          amountPaise: payment.amountPaise,
          reason: `Stock conflict for order ${order.orderNumber}`,
          orderNumber: order.orderNumber,
        });

        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: refund ? "REFUNDED" : "FAILED",
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            failureReason: "Stock conflict during order confirmation",
            refundId: refund?.id ?? null,
            refundedAmountPaise: refund ? payment.amountPaise : 0,
          },
        });

        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: "CANCELLED",
            paymentStatus: refund ? "REFUNDED" : "FAILED",
            cancelledAt: new Date(),
            cancelReason: "Stock conflict during order confirmation",
          },
        });

        return NextResponse.json(
          {
            ok: false,
            code: refund ? "STOCK_REFUNDED" : "STOCK_CONFLICT_MANUAL_REFUND",
            error: refund
              ? "Stock became unavailable. Payment has been refunded."
              : "Stock became unavailable. Our team will process refund manually.",
          },
          { status: 409 },
        );
      }

      throw e;
    }

    await notify({
      template: "ORDER_PLACED",
      userId: order.userId,
      email: order.user?.email ?? order.guestEmail ?? undefined,
      phone: order.user?.phone ?? order.guestPhone ?? undefined,
      whatsappOptIn: order.user?.whatsappOptIn,
      ctx: {
        name: order.user?.name?.split(" ")[0] ?? "there",
        orderNumber: realOrderNumber,
        total: `₹${order.total.toLocaleString("en-IN")}`,
      },
    });

    await notify({
      template: "PAYMENT_SUCCESS",
      userId: order.userId,
      email: order.user?.email ?? order.guestEmail ?? undefined,
      phone: order.user?.phone ?? order.guestPhone ?? undefined,
      whatsappOptIn: order.user?.whatsappOptIn,
      ctx: {
        orderNumber: realOrderNumber,
        total: `₹${order.total.toLocaleString("en-IN")}`,
        paymentId: razorpay_payment_id,
      },
    });

    await notifyStaff({
      template: "ADMIN_NEW_ORDER",
      ctx: {
        orderNumber: realOrderNumber,
        total: `₹${order.total.toLocaleString("en-IN")}`,
        items: String(order.items.length),
        customer: order.user?.email ?? order.guestEmail ?? "Guest",
        method: payment.method,
      },
    });

    return NextResponse.json({
      ok: true,
      orderNumber: realOrderNumber,
    });
  } catch (e) {
    return jsonError(e, "Payment verification failed.");
  }
}