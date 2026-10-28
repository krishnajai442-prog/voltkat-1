import crypto from "node:crypto";

export const razorpayConfigured = Boolean(
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET,
);

export function publicKeyId(): string | null {
  return process.env.RAZORPAY_KEY_ID ?? null;
}

function basicAuth() {
  const key = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key || !secret) {
    throw new Error("Razorpay is not configured.");
  }

  return Buffer.from(`${key}:${secret}`).toString("base64");
}

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a ?? "", "utf8");
  const bufB = Buffer.from(b ?? "", "utf8");

  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function createRazorpayOrder(input: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}) {
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt,
      notes: input.notes ?? {},
    }),
  });

  const json = (await res.json()) as {
    id?: string;
    error?: { description?: string };
  };

  if (!res.ok || !json.id) {
    throw new Error(json.error?.description ?? "Could not create Razorpay order.");
  }

  return json as { id: string; amount: number; currency: string; status: string };
}

export function verifyPaymentSignature(input: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`)
    .digest("hex");

  return safeEqual(expected, input.razorpay_signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return safeEqual(expected, signature);
}

export async function createRefund(input: {
  paymentId: string;
  amountPaise: number;
  note?: string;
  speed?: "normal" | "optimum";
}) {
  const res = await fetch(`https://api.razorpay.com/v1/payments/${input.paymentId}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      note: input.note ?? "VoltKart refund",
      speed: input.speed ?? "optimum",
    }),
  });

  const json = (await res.json()) as {
    id?: string;
    status?: string;
    error?: { description?: string };
  };

  if (!res.ok || !json.id) {
    throw new Error(json.error?.description ?? "Could not create Razorpay refund.");
  }

  return json as { id: string; status: string; amount: number };
}