import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getActor } from "@/lib/auth/guards";
import { orderCreateSchema } from "@/lib/validators";
import { computeQuote } from "@/lib/quote";
import {
  createRazorpayOrder,
  publicKeyId,
  razorpayConfigured,
} from "@/lib/razorpay";
import { jsonError, sanitizeText } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function intentOrderNumber(): string {
  return `VKINT${Date.now().toString(36).toUpperCase().slice(-8)}${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

async function snapshotAddress(
  userId: string | null,
  addressId?: string,
  address?: Record<string, unknown>,
): Promise<Prisma.JsonObject> {
  if (addressId && userId) {
    const a = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (a) {
      const { id: _id, userId: _u, createdAt: _c, ...rest } = a;
      return rest as Prisma.JsonObject;
    }
  }

  if (address) {
    const { id: _id, userId: _u, createdAt: _c, ...rest } = address;
    return rest as Prisma.JsonObject;
  }

  return { note: "address provided at confirmation" } as Prisma.JsonObject;
}

export async function POST(req: Request) {
  const rl = await rateLimit("order", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    if (!razorpayConfigured) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Online payments are not configured. Please use Cash on Delivery or contact support.",
        },
        { status: 503 },
      );
    }

    const parsed = orderCreateSchema.safeParse(
      await req.json().catch(() => ({})),
    );
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid checkout request",
        },
        { status: 422 },
      );
    }

    const body = parsed.data;

    if (body.paymentMethod === "COD") {
      return NextResponse.json(
        { ok: false, error: "COD does not require a payment gateway order." },
        { status: 400 },
      );
    }

    const actor = await getActor();

    const quote = await computeQuote({
      items: body.items,
      couponCode: body.couponCode,
      deliveryMode: body.deliveryMode,
      paymentMethod: body.paymentMethod,
      userId: actor?.id ?? null,
      pincode: body.pincode,
    });

    if (quote.stockIssues.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          code: "STOCK_CONFLICT",
          error: "Stock changed while starting payment.",
          conflicts: quote.stockIssues,
        },
        { status: 409 },
      );
    }

    if (quote.total <= 0) {
      return NextResponse.json(
        { ok: false, error: "Order total is invalid." },
        { status: 400 },
      );
    }

    const addressSnapshot = await snapshotAddress(
      actor?.id ?? null,
      body.addressId,
      body.address as Record<string, unknown> | undefined,
    );

    const intent = await prisma.order.create({
      data: {
        orderNumber: intentOrderNumber(),
        userId: actor?.id ?? null,
        guestEmail: actor ? null : body.guestEmail || null,
        guestPhone: actor ? null : body.guestPhone || null,
        status: "PENDING",
        paymentMethod: body.paymentMethod ?? "UPI",
        paymentStatus: "PENDING",
        subtotalMrp: quote.subtotalMrp,
        subtotal: quote.subtotal,
        itemDiscount: quote.itemDiscount,
        couponDiscount: quote.coupon?.discount ?? 0,
        couponCode: quote.coupon?.code ?? null,
        deliveryFee: quote.deliveryFee,
        codFee: 0,
        total: quote.total,
        gstRate: 18,
        gstComponent: quote.gstComponent,
        deliveryMode: quote.deliveryMode,
        etaFrom: quote.etaFrom,
        etaTo: quote.etaTo,
        addressSnapshot,
        ip: clientIp(req),
        note: body.note ? sanitizeText(body.note, 300) : null,
        items: {
          create: quote.lines.map((l) => ({
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
      },
    });

    try {
      const rzpOrder = await createRazorpayOrder({
        amountPaise: quote.total * 100,
        receipt: intent.orderNumber,
        notes: {
          intentId: intent.id,
          itemCount: String(quote.itemCount),
        },
      });

      await prisma.payment.create({
        data: {
          orderId: intent.id,
          method: body.paymentMethod ?? "UPI",
          status: "PENDING",
          amountPaise: quote.total * 100,
          gateway: "RAZORPAY",
          razorpayOrderId: rzpOrder.id,
        },
      });

      return NextResponse.json({
        ok: true,
        intentId: intent.id,
        rzp: {
          key: publicKeyId(),
          order_id: rzpOrder.id,
          amount: quote.total * 100,
          currency: "INR",
          name: "VoltKart",
          description: `${quote.itemCount} item(s) · ${intent.orderNumber}`,
          timeout: 300,
          notes: {
            intentId: intent.id,
          },
          prefill: {
            name: actor?.name ?? "",
            email: actor?.email ?? body.guestEmail ?? "",
            contact: actor?.phone ?? body.guestPhone ?? "",
          },
          theme: {
            color: "#2563ff",
          },
        },
      });
    } catch (e) {
      await prisma.order.delete({ where: { id: intent.id } }).catch(() => undefined);
      throw e;
    }
  } catch (e) {
    return jsonError(e, "Could not start payment.");
  }
}