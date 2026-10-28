import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { createSession } from "@/lib/auth/session";
import { notify } from "@/lib/notifications";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { jsonError, sanitizeText } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = await rateLimit("register", ip);
  if (!rl.success) return tooMany(rl);

  try {
    const parsed = registerSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid registration",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const data = parsed.data;

    if (data.honeypot) {
      return NextResponse.json({ ok: true });
    }

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ ok: false, error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: sanitizeText(data.name, 80),
        email: data.email,
        phone: data.phone || null,
        passwordHash,
        role: "CUSTOMER",
        whatsappOptIn: Boolean(data.whatsappOptIn),
        marketingOptIn: true,
        active: true,
        cart: { create: {} },
        wishlist: { create: {} },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        whatsappOptIn: true,
      },
    });

    await createSession(user);

    await notify({
      template: "WELCOME",
      userId: user.id,
      email: user.email,
      ctx: { name: user.name.split(" ")[0] ?? "there" },
    }).catch((e) => console.error("[auth:welcome]", e));

    return NextResponse.json({ ok: true, user, redirect: "/account" });
  } catch (e) {
    return jsonError(e, "Registration failed.");
  }
}