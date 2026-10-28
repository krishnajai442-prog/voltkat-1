import { NextResponse } from "next/server";
import { z } from "zod";
import { computeQuote } from "@/lib/quote";
import { getActor } from "@/lib/auth/guards";
import { jsonError } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  code: z.string().trim().min(3).max(24),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(10),
      }),
    )
    .min(1)
    .max(50),
});

export async function POST(req: Request) {
  const rl = await rateLimit("form", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid coupon code." },
        { status: 422 },
      );
    }

    const actor = await getActor();
    const quote = await computeQuote({
      items: parsed.data.items,
      couponCode: parsed.data.code.toUpperCase(),
      userId: actor?.id ?? null,
    });

    if (!quote.coupon) {
      return NextResponse.json(
        {
          ok: false,
          error: quote.couponError ?? "Coupon is not valid for this cart.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      ok: true,
      coupon: quote.coupon,
    });
  } catch (e) {
    return jsonError(e, "Coupon validation failed.");
  }
}