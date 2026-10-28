import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";
import { createSession, isStaffRole } from "@/lib/auth/session";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { jsonError } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = await rateLimit("login", ip);
  if (!rl.success) return tooMany(rl);

  try {
    const parsed = loginSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid credentials" },
        { status: 422 },
      );
    }

    const { email, password, admin } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.active) {
      return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json(
        { ok: false, error: "Too many failed attempts. Please try again later." },
        { status: 429 },
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      const failed = user.failedLoginCount + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: failed,
          lockedUntil: failed >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
        },
      });

      return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
    }

    if (admin && !isStaffRole(user.role)) {
      return NextResponse.json({ ok: false, error: "Admin access restricted." }, { status: 403 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    await createSession(user);

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        whatsappOptIn: user.whatsappOptIn,
      },
      redirect: admin ? "/admin/dashboard" : isStaffRole(user.role) ? "/admin/dashboard" : "/account",
    });
  } catch (e) {
    return jsonError(e, "Login failed.");
  }
}