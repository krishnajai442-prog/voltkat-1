import crypto from "node:crypto";
import prisma from "@/lib/prisma";

export const OTP_LENGTH = 6;
const RESEND_COOLDOWN_MS = 60_000; // don't spam a new code within 60s

function generate(): string {
  // crypto.randomInt is uniform — Math.random() would bias the distribution.
  let s = "";
  for (let i = 0; i < OTP_LENGTH; i++) s += crypto.randomInt(0, 10).toString();
  return s;
}

/** Mask for admin display: "482139" -> "••••39". Never returns the full code. */
export function maskOtp(otp: string | null | undefined): string | null {
  if (!otp) return null;
  return "•".repeat(Math.max(0, otp.length - 2)) + otp.slice(-2);
}

type GenResult =
  | { ok: true; otp: string; resent: boolean }
  | { ok: false; reason: "too_soon" | "not_found" };

/**
 * Generate (or regenerate) the delivery OTP for an order and persist it.
 * Returns the plaintext ONCE so the caller can hand it to notify.ts — it is
 * never logged here. Enforces a per-order resend cooldown.
 */
export async function generateDeliveryOtp(orderId: string): Promise<GenResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, deliveryOtpSentAt: true },
  });
  if (!order) return { ok: false, reason: "not_found" };

  const tooSoon =
    !!order.deliveryOtpSentAt &&
    Date.now() - order.deliveryOtpSentAt.getTime() < RESEND_COOLDOWN_MS;
  if (tooSoon) return { ok: false, reason: "too_soon" };

  const otp = generate();
  await prisma.order.update({
    where: { id: orderId },
    data: { deliveryOtp: otp, deliveryOtpSentAt: new Date() },
  });
  return { ok: true, otp, resent: !!order.deliveryOtpSentAt };
}

type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "no_otp" | "mismatch" | "already_delivered" | "not_found" };

/** Constant-time compare so timing can't be used to guess the code digit-by-digit. */
export async function verifyDeliveryOtp(orderId: string, input: string): Promise<VerifyResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, deliveryOtp: true, status: true, deliveredByOtp: true },
  });
  if (!order) return { ok: false, reason: "not_found" };
  if (order.deliveredByOtp) return { ok: false, reason: "already_delivered" };
  if (!order.deliveryOtp) return { ok: false, reason: "no_otp" };

  const a = Buffer.from(order.deliveryOtp.padEnd(OTP_LENGTH, " "));
  const b = Buffer.from(input.trim().padEnd(OTP_LENGTH, " "));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "mismatch" };
  }
  return { ok: true };
}