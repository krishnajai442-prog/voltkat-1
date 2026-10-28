import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActor } from "@/lib/auth/guards";
import { addressSchema } from "@/lib/validators";
import { jsonError, sanitizeText } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateSchema = addressSchema.partial();

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const rl = await rateLimit("form", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const actor = await requireActor();
    const { id } = await ctx.params;

    const parsed = updateSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid address update",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const data = parsed.data;

    const existing = await prisma.address.findFirst({
      where: { id, userId: actor.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Address not found." }, { status: 404 });
    }

    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId: actor.id },
        data: { isDefault: false },
      });
    }

    const update: Record<string, unknown> = {};

    if (data.label !== undefined) update.label = sanitizeText(data.label, 40);
    if (data.fullName !== undefined) update.fullName = sanitizeText(data.fullName, 80);
    if (data.phone !== undefined) update.phone = data.phone;
    if (data.altPhone !== undefined) update.altPhone = data.altPhone || null;
    if (data.pincode !== undefined) update.pincode = data.pincode;
    if (data.line1 !== undefined) update.line1 = sanitizeText(data.line1, 160);
    if (data.line2 !== undefined) update.line2 = data.line2 ? sanitizeText(data.line2, 160) : null;
    if (data.city !== undefined) update.city = sanitizeText(data.city, 80);
    if (data.state !== undefined) update.state = sanitizeText(data.state, 80);
    if (data.isDefault !== undefined) update.isDefault = Boolean(data.isDefault);

    const address = await prisma.address.update({
      where: { id: existing.id },
      data: update,
    });

    return NextResponse.json({ ok: true, address });
  } catch (e) {
    return jsonError(e, "Could not update address.");
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const rl = await rateLimit("form", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const actor = await requireActor();
    const { id } = await ctx.params;

    const deleted = await prisma.address.deleteMany({
      where: { id, userId: actor.id },
    });

    if (deleted.count !== 1) {
      return NextResponse.json({ ok: false, error: "Address not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e, "Could not delete address.");
  }
}