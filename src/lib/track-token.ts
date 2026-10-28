import crypto from "node:crypto";

function secretKey(): Uint8Array | null {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) return null;
  return new TextEncoder().encode(value);
}

export function createGuestTrackToken(orderNumber: string): string {
  const key = secretKey();
  if (!key) return "";

  return crypto
    .createHmac("sha256", key)
    .update(`voltkart:track:${orderNumber}`)
    .digest("base64url");
}

export function verifyGuestTrackToken(
  orderNumber: string,
  token?: string | null,
): boolean {
  const key = secretKey();
  if (!key || !token) return false;

  const expected = crypto
    .createHmac("sha256", key)
    .update(`voltkart:track:${orderNumber}`)
    .digest();

  const actual = Buffer.from(token, "base64url");

  if (expected.length !== actual.length) return false;

  return crypto.timingSafeEqual(expected, actual);
}