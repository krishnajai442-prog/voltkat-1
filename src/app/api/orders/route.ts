import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getActor } from "@/lib/auth/guards";
import { orderCreateSchema } from "@/lib/validators";
import { computeQuote } from "@/lib/quote";
import { createOrderTx } from "@/lib/orders";
import { jsonError, sanitizeText } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function snapshotAddress(
  userId: string | null,
  addressId?: string,
  address?: Record<string, unknown>,
): Promise<Prisma.JsonObject | null> {
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

  return null;
}

export async function POST(req: Request) {
  const rl = await rateLimit("order", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const parsed = orderCreateSchema.safeParse(
      await req.json().catch(() => ({})),
    );

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid order request",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const body = parsed.data;
    const actor = await getActor();

    const guestEmail = body.guestEmail?.trim() || null;
    const guestPhone = body.guestPhone?.trim() || null;

    if (!actor && !guestEmail && !guestPhone) {
      return NextResponse.json(
        { ok: false, error: "Guest orders require an email or mobile number." },
        { status: 422 },
      );
    }

    if (body.paymentMethod && body.paymentMethod !== "COD") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Online payments must start from /api/razorpay/order. This endpoint is for COD.",
        },
        { status: 400 },
      );
    }

    const quote = await computeQuote({
      items: body.items,
      couponCode: body.couponCode,
      deliveryMode: body.deliveryMode,
      paymentMethod: "COD",
      userId: actor?.id ?? null,
      pincode: body.pincode,
    });

    if (quote.stockIssues.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          code: "STOCK_CONFLICT",
          error: "Stock changed while placing your order.",
          conflicts: quote.stockIssues,
        },
        { status: 409 },
      );
    }

    const addressSnapshot = await snapshotAddress(
      actor?.id ?? null,
      body.addressId,
      body.address as Record<string, unknown> | undefined,
    );

    if (!addressSnapshot || typeof addressSnapshot.line1 !== "string") {
      return NextResponse.json(
        { ok: false, error: "A valid delivery address is required." },
        { status: 422 },
      );
    }

    const order = await createOrderTx({
      userId: actor?.id ?? null,
      guestEmail: actor ? null : guestEmail,
      guestPhone: actor ? null : guestPhone,
      addressSnapshot,
      quote,
      paymentMethod: "COD",
      payment: null,
      ip: clientIp(req),
      note: body.note ? sanitizeText(body.note, 300) : null,
    });

    return NextResponse.json({
      ok: true,
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
      },
    });
  } catch (e) {
    return jsonError(e, "Could not place COD order.");
  }
}