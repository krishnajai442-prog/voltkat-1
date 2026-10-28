import { NextResponse } from "next/server";
import crypto from "node:crypto";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/notify";          // the export from Move 1
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit"; // verified symbols from your admin route

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const SECRET = process.env.RESET_SECRET;
const TTL_SECONDS = 30 * 60; // link valid 30 min

/** Stateless, signed reset token: userId.expiry.hmac — needs NO db column. */
function mintToken(userId: string): string {
  if (!SECRET) throw new Error("RESET_SECRET not set");
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = `${userId}.${exp}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export async function POST(req: Request) {
  const rl = await rateLimit("forgotPassword", clientIp(req));
  if (!rl.success) return tooMany(rl);

  let email: string | undefined;
  try {
    const body = (await req.json()) as { email?: unknown };
    if (typeof body.email === "string") email = body.email.trim().toLowerCase();
  } catch {
    /* fall through to the generic answer below */
  }

  // Build + send ONLY if the account exists — but the response is identical either way.
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && SECRET) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true },
      });
      if (user) {
        const link = `${APP_URL}/auth/reset-password?token=${encodeURIComponent(mintToken(user.id))}`;
        const hi = user.name ? `Hi ${user.name.split(" ")[0]},` : "Hi,";
        const text =
          `${hi}\n\nWe received a request to reset your VoltKart password.\n` +
          `Open this link within 30 minutes to choose a new one:\n${link}\n\n` +
          `If you didn't request this, ignore this message — your password stays unchanged.`;
        // Fire-and-forget semantics live inside sendEmail (try/catch + dry-run log).
        await sendEmail(email, "Reset your VoltKart password", text);
      }
    } catch {
      /* never leak which step failed; the safe message below is the only output */
    }
  }

  return NextResponse.json({ ok: true });
}