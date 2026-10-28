import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { contactSchema } from "@/lib/validators";
import { excerpt, jsonError, sanitizeText } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { notifyStaff } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rl = await rateLimit("form", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const parsed = contactSchema.safeParse(await req.json().catch(() => ({})));

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid contact request",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const data = parsed.data;

    if (data.honeypot) {
      return NextResponse.json({ ok: true });
    }

    await prisma.contactMessage.create({
      data: {
        name: sanitizeText(data.name, 80),
        email: data.email,
        phone: data.phone ?? null,
        topic: data.topic,
        message: sanitizeText(data.message, 2000),
      },
    });

    await notifyStaff({
      template: "ADMIN_MESSAGE",
      ctx: {
        name: data.name,
        topic: data.topic,
        preview: excerpt(data.message, 120),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e, "Could not send message.");
  }
}