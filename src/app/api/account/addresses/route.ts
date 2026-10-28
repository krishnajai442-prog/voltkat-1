import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActor } from "@/lib/auth/guards";
import { addressSchema } from "@/lib/validators";
import { jsonError, sanitizeText } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireActor();

    const addresses = await prisma.address.findMany({
      where: { userId: actor.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ ok: true, addresses });
  } catch (e) {
    return jsonError(e, "Could load addresses.");
  }
}

export async function POST(req: Request) {
  const rl = await rateLimit("form", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const actor = await requireActor();

    const parsed = addressSchema.safeParse(await req.json().catch(() => ({})));

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid address",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const data = parsed.data;

    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId: actor.id },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId: actor.id,
        label: data.label || "Home",
        fullName: sanitizeText(data.fullName, 80),
        phone: data.phone,
        altPhone: data.altPhone || null,
        pincode: data.pincode,
        line1: sanitizeText(data.line1, 160),
        line2: data.line2 ? sanitizeText(data.line2, 160) : null,
        city: sanitizeText(data.city, 80),
        state: sanitizeText(data.state, 80),
        isDefault: Boolean(data.isDefault),
      },
    });

    return NextResponse.json({ ok: true, address });
  } catch (e) {
    return jsonError(e, "Could create address.");
  }
}