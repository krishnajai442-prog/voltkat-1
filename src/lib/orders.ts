import { type OrderStatus, type PaymentMethod, Prisma } from "@prisma/client";
import prisma from "./prisma";
import { computeQuote, type Quote } from "./quote";
import { AppError, addDays, inr, orderNumber, trackingNumber } from "./utils";
import { notify, notifyStaff } from "./notifications";

export type CreateOrderInput = {
  userId: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  addressSnapshot: Prisma.JsonObject;
  quote: Quote;
  paymentMethod: PaymentMethod;
  payment?: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    amountPaise: number;
    raw?: Prisma.JsonObject;
  } | null;
  ip?: string | null;
  note?: string | null;
};

export class StockConflictError extends AppError {
  constructor(public conflicts: { productId: string; name: string; available: number }[]) {
    super(409, "Stock levels changed while placing your order. Please review your cart.", "STOCK_CONFLICT");
  }
}

export async function createOrderTx(input: CreateOrderInput) {
  const isCod = input.paymentMethod === "COD";
  const initialStatus: OrderStatus = isCod ? "PENDING" : "CONFIRMED";
  const initialPayment = isCod ? "PENDING" : "PAID";
  const num = orderNumber();

  const result = await prisma.$transaction(
    async (tx) => {
      for (const line of input.quote.lines) {
        const res = await tx.product.updateMany({
          where: { id: line.productId, stock: { gte: line.quantity }, active: true },
          data: {
            stock: { decrement: line.quantity },
            sold: { increment: line.quantity },
          },
        });

        if (res.count !== 1) {
          const p = await tx.product.findUnique({
            where: { id: line.productId },
            select: { name: true, stock: true },
          });

          throw new StockConflictError([
            {
              productId: line.productId,
              name: p?.name ?? line.name,
              available: p?.stock ?? 0,
            },
          ]);
        }
      }

      if (input.quote.coupon) {
        const c = await tx.coupon.findUnique({ where: { id: input.quote.coupon.couponId } });
        if (!c || !c.active) throw new AppError(400, "Coupon is no longer valid.", "COUPON_INVALID");
        if (c.usageLimit && c.usedCount >= c.usageLimit) {
          throw new AppError(409, "Coupon usage limit reached.", "COUPON_EXHAUSTED");
        }
      }

      const order = await tx.order.create({
        data: {
          orderNumber: num,
          userId: input.userId,
          guestEmail: input.guestEmail ?? null,
          guestPhone: input.guestPhone ?? null,
          status: initialStatus,
          paymentMethod: input.paymentMethod,
          paymentStatus: initialPayment,
          subtotalMrp: input.quote.subtotalMrp,
          subtotal: input.quote.subtotal,
          itemDiscount: input.quote.itemDiscount,
          couponDiscount: input.quote.coupon?.discount ?? 0,
          couponCode: input.quote.coupon?.code ?? null,
          deliveryFee: input.quote.deliveryFee,
          codFee: input.quote.codFee,
          total: input.quote.total,
          gstRate: 18,
          gstComponent: input.quote.gstComponent,
          deliveryMode: input.quote.deliveryMode,
          etaFrom: input.quote.etaFrom,
          etaTo: input.quote.etaTo,
          addressSnapshot: input.addressSnapshot,
          note: input.note ?? null,
          ip: input.ip ?? null,
          items: {
            create: input.quote.lines.map((l) => ({
              productId: l.productId,
              name: l.name,
              slug: l.slug,
              brand: l.brand,
              image: l.image,
              unitMrp: l.mrp,
              unitPrice: l.salePrice,
              quantity: l.quantity,
              lineTotal: l.lineTotal,
              warrantyMonths: 12,
            })),
          },
          trackingEvents: {
            create: [
              {
                status: initialStatus,
                title: "Order placed",
                description: isCod
                  ? "We'll confirm your order over SMS/call shortly."
                  : "Payment received. Your order is confirmed.",
                location: "VoltKart Digital",
              },
            ],
          },
          ...(input.payment
            ? {
                payments: {
                  create: {
                    method: input.paymentMethod,
                    status: "PAID",
                    amountPaise: input.payment.amountPaise,
                    razorpayOrderId: input.payment.razorpayOrderId,
                    razorpayPaymentId: input.payment.razorpayPaymentId,
                    razorpaySignature: input.payment.razorpaySignature,
                    capturedAt: new Date(),
                    rawJson: (input.payment.raw ?? undefined) as never,
                  },
                },
              }
            : {}),
          ...(input.quote.coupon
            ? {
                couponLinks: {
                  create: {
                    couponId: input.quote.coupon.couponId,
                    discount: input.quote.coupon.discount,
                  },
                },
              }
            : {}),
        },
        include: { items: true },
      });

      if (input.quote.coupon) {
        await tx.coupon.update({
          where: { id: input.quote.coupon.couponId },
          data: { usedCount: { increment: 1 } },
        });

        await tx.couponRedemption.create({
          data: {
            couponId: input.quote.coupon.couponId,
            userId: input.userId,
            orderId: order.id,
            discount: input.quote.coupon.discount,
          },
        });
      }

      if (input.userId) {
        const cart = await tx.cart.findUnique({ where: { userId: input.userId } });
        if (cart) {
          await tx.cartItem.deleteMany({
            where: { cartId: cart.id, productId: { in: input.quote.lines.map((l) => l.productId) } },
          });
        }
      }

      return order;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 8000, timeout: 20000 },
  );

  try {
    const customerName =
      ((input.addressSnapshot as { fullName?: string }).fullName ?? "there").split(" ")[0] ?? "there";

    await notify({
      template: "ORDER_PLACED",
      userId: input.userId,
      email: input.guestEmail ?? undefined,
      phone: input.guestPhone ?? undefined,
      ctx: {
        name: customerName,
        orderNumber: result.orderNumber,
        total: inr(result.total),
      },
    });

    if (!isCod) {
      await notify({
        template: "PAYMENT_SUCCESS",
        userId: input.userId,
        ctx: {
          orderNumber: result.orderNumber,
          total: inr(result.total),
          paymentId: input.payment?.razorpayPaymentId ?? "-",
        },
      });
    }

    await notifyStaff({
      template: "ADMIN_NEW_ORDER",
      ctx: {
        orderNumber: result.orderNumber,
        total: inr(result.total),
        items: String(result.items.length),
        customer: input.guestEmail ?? "Guest",
        method: input.paymentMethod,
      },
    });
  } catch (e) {
    console.error("[order:notify]", e);
  }

  return result;
}

export async function refundForConflict(opts: {
  razorpayPaymentId: string;
  amountPaise: number;
  reason: string;
  orderNumber?: string;
}) {
  const { createRefund } = await import("./razorpay");

  try {
    const refund = await createRefund({
      paymentId: opts.razorpayPaymentId,
      amountPaise: opts.amountPaise,
      note: opts.reason,
      speed: "optimum",
    });

    await prisma.notification.create({
      data: {
        audience: "STAFF",
        title: "Auto-refund issued",
        body: `${opts.reason}. Refund ${refund.id} for ₹${(opts.amountPaise / 100).toLocaleString("en-IN")}.`,
        channel: "SYSTEM",
        href: "/admin/orders",
      },
    });

    return refund;
  } catch (e) {
    console.error("[refund:conflict]", e);

    await prisma.notification.create({
      data: {
        audience: "STAFF",
        title: "Manual refund required",
        body: `Auto-refund failed for ${opts.orderNumber ?? opts.razorpayPaymentId}: ${String(e)}`,
        channel: "SYSTEM",
        href: "/admin/orders",
      },
    });

    return null;
  }
}

const STATUS_TITLES: Record<OrderStatus, string> = {
  PENDING: "Order placed",
  CONFIRMED: "Order confirmed",
  PROCESSING: "Processing at fulfilment centre",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Order cancelled",
};

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export async function advanceStatus(opts: {
  orderId: string;
  status: OrderStatus;
  actorId?: string | null;
  carrier?: string | null;
  tracking?: string | null;
  note?: string | null;
  location?: string | null;
}) {
  const order = await prisma.order.findUnique({
    where: { id: opts.orderId },
    include: {
      items: true,
      user: { select: { id: true, name: true, email: true, phone: true, whatsappOptIn: true } },
      payments: { where: { status: "PAID" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!order) throw new AppError(404, "Order not found.", "NOT_FOUND");

  const current = order.status;
  const next = opts.status;

  if (current !== next && !ALLOWED_TRANSITIONS[current]?.includes(next)) {
    throw new AppError(409, `Cannot move order from ${current} to ${next}.`, "INVALID_STATUS_TRANSITION");
  }

  const carrier = opts.carrier ?? order.carrier ?? null;
  const trk = next === "SHIPPED" && !opts.tracking ? trackingNumber() : opts.tracking ?? order.trackingNumber ?? null;

  const updated = await prisma.$transaction(async (tx) => {
    if (next === "CANCELLED") {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    const o = await tx.order.update({
      where: { id: order.id },
      data: {
        status: next,
        carrier,
        trackingNumber: trk,
        deliveredAt: next === "DELIVERED" ? new Date() : order.deliveredAt,
        cancelledAt: next === "CANCELLED" ? new Date() : order.cancelledAt,
        cancelReason: next === "CANCELLED" ? opts.note ?? "Cancelled" : order.cancelReason,
      },
      include: { items: true },
    });

    await tx.trackingEvent.create({
      data: {
        orderId: o.id,
        status: next,
        title: STATUS_TITLES[next],
        description:
          opts.note ??
          (next === "SHIPPED"
            ? `Shipped via ${carrier ?? "partner network"}. Tracking ID ${trk ?? "-"}.`
            : next === "CANCELLED"
              ? "Order cancelled. Stock restored."
              : undefined),
        location: opts.location ?? (next === "CANCELLED" ? "VoltKart Digital" : undefined),
        actorId: opts.actorId ?? null,
      },
    });

    return o;
  });

  try {
    const templateMap: Partial<Record<OrderStatus, Parameters<typeof notify>[0]["template"]>> = {
      CONFIRMED: "ORDER_CONFIRMED",
      PROCESSING: "PROCESSING",
      SHIPPED: "SHIPPED",
      OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
      DELIVERED: "DELIVERED",
      CANCELLED: "CANCELLED",
    };

    const template = templateMap[next];

    if (template) {
      await notify({
        template,
        userId: order.userId,
        email: order.user?.email ?? order.guestEmail ?? undefined,
        phone: order.user?.phone ?? order.guestPhone ?? undefined,
        whatsappOptIn: order.user?.whatsappOptIn,
        ctx: {
          name: order.user?.name?.split(" ")[0] ?? "there",
          orderNumber: order.orderNumber,
          total: inr(order.total),
          carrier: carrier ?? "VoltKart Partner",
          trackingNumber: trk ?? "-",
          reason: opts.note ?? "Not specified",
          date: updated.etaTo ? addDays(updated.etaTo, 0).toLocaleDateString("en-IN") : "soon",
        },
      });
    }

    if (next === "CANCELLED") {
      await notifyStaff({
        template: "ADMIN_CANCELLATION",
        ctx: {
          orderNumber: order.orderNumber,
          customer: order.user?.name ?? order.guestEmail ?? "Guest",
          reason: opts.note ?? "Cancelled",
        },
      });

      const payment = order.payments[0];

      if (payment?.razorpayPaymentId && order.paymentStatus === "PAID") {
        const { createRefund, razorpayConfigured } = await import("./razorpay");

        if (razorpayConfigured) {
          try {
            const refund = await createRefund({
              paymentId: payment.razorpayPaymentId,
              amountPaise: payment.amountPaise,
              note: `Order cancelled ${order.orderNumber}`,
              speed: "optimum",
            });

            await prisma.payment.update({
              where: { id: payment.id },
              data: {
                status: "REFUNDED",
                refundId: refund.id,
                refundedAmountPaise: payment.amountPaise,
              },
            });

            await prisma.order.update({
              where: { id: order.id },
              data: { paymentStatus: "REFUNDED" },
            });

            await notify({
              template: "REFUND_PROCESSED",
              userId: order.userId,
              email: order.user?.email ?? order.guestEmail ?? undefined,
              ctx: {
                orderNumber: order.orderNumber,
                amount: inr(order.total),
              },
            });
          } catch (e) {
            console.error("[order:cancel:refund]", e);

            await notifyStaff({
              template: "ADMIN_PAYMENT",
              ctx: {
                orderNumber: order.orderNumber,
                total: inr(order.total),
                method: "REFUND_FAILED",
                paymentId: payment.razorpayPaymentId,
              },
            });
          }
        }
      }
    }
  } catch (e) {
    console.error("[order:status:notify]", e);
  }

  return updated;
}