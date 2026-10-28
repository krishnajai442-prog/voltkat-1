import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getActor } from "@/lib/auth/guards";
import { jsonError, normalizeMobile } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  orderNumber: z.string().trim().min(5).max(40),
  identifier: z.string().trim().min(5).max(120),
});

function authorized(
  order: {
    userId: string | null;
    guestEmail?: string | null;
    guestPhone?: string | null;
    user?: { email?: string | null; phone?: string | null } | null;
  },
  identifier: string,
  actorId?: string | null,
  role?: string | null,
) {
  if (actorId && order.userId === actorId) return true;
  if (role && ["ADMIN", "MANAGER", "STAFF"].includes(role)) return true;

  const id = identifier.trim().toLowerCase();
  const mobile = normalizeMobile(id) ?? id;

  return (
    order.user?.email?.toLowerCase() === mobile ||
    order.guestEmail?.toLowerCase() === mobile ||
    order.user?.phone === mobile ||
    order.guestPhone === mobile
  );
}

export async function GET(req: Request) {
  const rl = await rateLimit("track", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const url = new URL(req.url);
    const parsed = schema.safeParse({
      orderNumber: url.searchParams.get("orderNumber") ?? url.searchParams.get("order"),
      identifier: url.searchParams.get("identifier") ?? url.searchParams.get("id"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Order number and email/mobile are required." },
        { status: 422 },
      );
    }

    const actor = await getActor();

    const order = await prisma.order.findUnique({
      where: { orderNumber: parsed.data.orderNumber.toUpperCase() },
      include: {
        user: { select: { email: true, phone: true } },
        trackingEvents: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!order) {
      return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
    }

    if (!authorized(order, parsed.data.identifier, actor?.id, actor?.role)) {
      return NextResponse.json(
        { ok: false, error: "Email/mobile does not match this order." },
        { status: 403 },
      );
    }

    return NextResponse.json({
      ok: true,
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total,
        carrier: order.carrier,
        trackingNumber: order.trackingNumber,
        etaFrom: order.etaFrom?.toISOString() ?? null,
        etaTo: order.etaTo?.toISOString() ?? null,
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
  } catch (e) {
    return jsonError(e, "Tracking lookup failed.");
  }
}

export async function POST(req: Request) {
  return GET(req);
}