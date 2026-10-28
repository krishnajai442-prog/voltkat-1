import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { newsletterSchema } from "@/lib/validators";
import { jsonError, normalizeMobile } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rl = await rateLimit("form", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const parsed = newsletterSchema.safeParse(await req.json().catch(() => ({})));

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid subscription",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const data = parsed.data;

    if (data.honeypot) {
      return NextResponse.json({ ok: true });
    }

    const phone = normalizeMobile(data.phone ?? undefined);

    await prisma.subscriber.upsert({
      where: { email: data.email },
      update: {
        phone,
        whatsappOptIn: Boolean(data.whatsappOptIn),
        active: true,
      },
      create: {
        email: data.email,
        phone,
        whatsappOptIn: Boolean(data.whatsappOptIn),
        source: "FOOTER",
        active: true,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e, "Subscription failed.");
  }
}