import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActor } from "@/lib/auth/guards";
import { supportTicketSchema } from "@/lib/validators";
import { jsonError, reference, sanitizeText } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { notify, notifyStaff } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rl = await rateLimit("form", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const actor = await requireActor();

    const parsed = supportTicketSchema.safeParse(await req.json().catch(() => ({})));

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid ticket",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const data = parsed.data;

    if (data.orderId) {
      const order = await prisma.order.findFirst({
        where: { id: data.orderId, userId: actor.id },
        select: { id: true },
      });

      if (!order) {
        return NextResponse.json({ ok: false, error: "Related order not found." }, { status: 404 });
      }
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        reference: reference("VKSUP"),
        userId: actor.id,
        email: actor.email,
        subject: sanitizeText(data.subject, 120),
        category: data.category,
        status: "OPEN",
        orderId: data.orderId || null,
        messages: {
          create: {
            userId: actor.id,
            body: sanitizeText(data.message, 2000),
            fromStaff: false,
          },
        },
      },
      include: {
        messages: true,
      },
    });

    await notify({
      template: "TICKET_CREATED",
      userId: actor.id,
      email: actor.email,
      ctx: {
        reference: ticket.reference,
      },
    });

    await notifyStaff({
      template: "ADMIN_TICKET",
      ctx: {
        reference: ticket.reference,
        customer: actor.name,
        subject: ticket.subject,
      },
    });

    return NextResponse.json({
      ok: true,
      ticket: {
        id: ticket.id,
        reference: ticket.reference,
        subject: ticket.subject,
        category: ticket.category,
        status: ticket.status,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        messages: ticket.messages.map((m) => ({
          id: m.id,
          body: m.body,
          fromStaff: m.fromStaff,
          createdAt: m.createdAt.toISOString(),
        })),
      },
    });
  } catch (e) {
    return jsonError(e, "Could create support ticket.");
  }
}