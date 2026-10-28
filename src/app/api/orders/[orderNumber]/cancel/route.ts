import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireActor } from "@/lib/auth/guards";
import { advanceStatus } from "@/lib/orders";
import { jsonError, sanitizeText } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  reason: z.string().trim().max(300).optional().or(z.literal("")),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ orderNumber: string }> },
) {
  const rl = await rateLimit("order", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const actor = await requireActor();
    const { orderNumber } = await ctx.params;

    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid cancellation." }, { status: 422 });
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: { id: true, userId: true, status: true },
    });

    if (!order) {
      return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
    }

    const isOwner = actor.id === order.userId;
    const isStaff = ["ADMIN", "MANAGER", "STAFF"].includes(actor.role);

    if (!isOwner && !isStaff) {
      return NextResponse.json({ ok: false, error: "Not allowed." }, { status: 403 });
    }

    if (!["PENDING", "CONFIRMED"].includes(order.status)) {
      return NextResponse.json(
        { ok: false, error: "This order can no longer be cancelled online." },
        { status: 409 },
      );
    }

    const updated = await advanceStatus({
      orderId: order.id,
      status: "CANCELLED",
      actorId: actor.id,
      note: parsed.data.reason ? sanitizeText(parsed.data.reason, 300) : "Customer requested cancellation",
      location: "VoltKart Digital",
    });

    return NextResponse.json({
      ok: true,
      order: {
        orderNumber: updated.orderNumber,
        status: updated.status,
      },
    });
  } catch (e) {
    return jsonError(e, "Could not cancel order.");
  }
}