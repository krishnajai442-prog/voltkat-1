import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireActor } from "@/lib/auth/guards";
import { jsonError, sanitizeText } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { notifyStaff } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  body: z.string().trim().min(2, "Reply is too short").max(2000),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const rl = await rateLimit("form", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const actor = await requireActor();
    const { id } = await ctx.params;

    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid reply" },
        { status: 422 },
      );
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      select: { id: true, userId: true, reference: true, subject: true, status: true },
    });

    if (!ticket) {
      return NextResponse.json({ ok: false, error: "Ticket not found." }, { status: 404 });
    }

    if (ticket.userId !== actor.id) {
      return NextResponse.json({ ok: false, error: "Not allowed." }, { status: 403 });
    }

    await prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        userId: actor.id,
        body: sanitizeText(parsed.data.body, 2000),
        fromStaff: false,
      },
    });

    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? "OPEN" : ticket.status,
        updatedAt: new Date(),
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

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e, "Reply failed.");
  }
}