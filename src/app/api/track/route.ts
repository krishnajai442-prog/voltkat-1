import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { trackLookupSchema } from "@/lib/validators";
import { normalizeMobile } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import {createGuestTrackToken } from "@/lib/track-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rl = await rateLimit("track", clientIp(req));
  if (!rl.success) return tooMany(rl);

  const parsed = trackLookupSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "We couldn’t find an order with those details." },
      { status: 404 },
    );
  }

  const { orderNumber, identifier } = parsed.data;
  const isEmail = identifier.includes("@");
  const mobile = isEmail ? null : normalizeMobile(identifier);

  if (!isEmail && !mobile) {
    return NextResponse.json(
      { ok: false, error: "We couldn’t find an order with those details." },
      { status: 404 },
    );
  }

  const order = await prisma.order.findFirst({
    where: {
      orderNumber: orderNumber.toUpperCase(),
      OR: isEmail
        ? [
            { guestEmail: identifier.toLowerCase() },
            { user: { email: identifier.toLowerCase() } },
          ]
        : [
            { guestPhone: mobile! },
            { user: { phone: mobile! } },
          ],
    },
    include: {
      items: {
        select: {
          name: true,
          quantity: true,
          image: true,
        },
      },
      trackingEvents: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) {
    return NextResponse.json(
      { ok: false, error: "We couldn’t find an order with those details." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    result: {
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      etaFrom: order.etaFrom?.toISOString() ?? null,
      etaTo: order.etaTo?.toISOString() ?? null,
      carrier: order.carrier,
      trackingNumber: order.trackingNumber,
      token: createGuestTrackToken(order.orderNumber),
      items: order.items,
      events: order.trackingEvents.map((e) => ({
        id: e.id,
        status: e.status,
        title: e.title,
        description: e.description,
        location: e.location,
        createdAt: e.createdAt.toISOString(),
      })),
    },
  });
}