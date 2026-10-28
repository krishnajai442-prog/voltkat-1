import crypto from "node:crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validators";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { jsonError } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = await rateLimit("reset", ip);
  if (!rl.success) return tooMany(rl);

  try {
    const parsed = resetPasswordSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid reset request",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const hashed = hashToken(parsed.data.token);

    const user = await prisma.user.findFirst({
      where: {
        resetTokenHash: hashed,
        resetTokenExp: { gt: new Date() },
        active: true,
      },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "This reset link is invalid or has expired." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetTokenHash: null,
        resetTokenExp: null,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e, "Password reset failed.");
  }
}