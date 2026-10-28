import { NextResponse } from "next/server";
import { computeQuote } from "@/lib/quote";
import { getActor } from "@/lib/auth/guards";
import { quoteSchema } from "@/lib/validators";
import { jsonError } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
const rl = await rateLimit("quote", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const parsed = quoteSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid quote request",
        },
        { status: 422 },
      );
    }

    const actor = await getActor();
    const quote = await computeQuote({
      items: parsed.data.items,
      couponCode: parsed.data.couponCode,
      deliveryMode: parsed.data.deliveryMode,
      paymentMethod: parsed.data.paymentMethod,
      userId: actor?.id ?? null,
      pincode: parsed.data.pincode,
    });

    return NextResponse.json({ ok: true, quote });
  } catch (e) {
    return jsonError(e, "Could not calculate cart total.");
  }
}