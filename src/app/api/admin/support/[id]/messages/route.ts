import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { audit, requireStaff } from "@/lib/auth/guards";
import { supportReplySchema } from "@/lib/validators";
import { jsonError, sanitizeText } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { notify } from "@/lib/notifications";
import { ok, validationError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const rl = await rateLimit("adminMutation", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const actor = await requireStaff();
    const { id } = await ctx.params;

    const parsed = supportReplySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return validationError(parsed.error);

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true, phone: true, whatsappOptIn: true } } },
    });
    if (!ticket) return NextResponse.json({ ok: false, error: "Ticket not found" }, { status: 404 });

    const message = await prisma.supportMessage.create({
      data: {
        ticketId: id,
        staffId: actor.id,
        body: sanitizeText(parsed.data.body, 2000),
        fromStaff: true,
      },
    });

    await prisma.supportTicket.update({
      where: { id },
      data: { status: parsed.data.status ?? (ticket.status === "OPEN" ? "UNDER_REVIEW" : ticket.status), updatedAt: new Date() },
    });

    await notify({
      template: "SUPPORT_REPLY",
      userId: ticket.userId,
      email: ticket.user?.email ?? ticket.email,
      phone: ticket.user?.phone,
      whatsappOptIn: ticket.user?.whatsappOptIn,
      ctx: { reference: ticket.reference, staff: actor.name, message: sanitizeText(parsed.data.body, 180) },
    });

    await audit({ actorId: actor.id, action: "SUPPORT_REPLY", entity: "SupportTicket", entityId: id, ip: clientIp(req) });

    return ok({
      message: {
        id: message.id,
        body: message.body,
        fromStaff: message.fromStaff,
        createdAt: message.createdAt.toISOString(),
      },
    });
  } catch (e) {
    return jsonError(e, "Support reply failed");
  }
}