import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getActor } from "@/lib/auth/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(1).max(2000),
  // Customer photos for THIS review. Mirrors reviewSchema.images (validators.ts:155):
  // up to 5 URLs, each <=1000 chars. The route's z.object is non-strict, so before this
  // line an incoming `images` key was silently STRIPPED (not a 422) and never persisted.
  images: z.array(z.string().trim().max(1000)).max(5).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ ok: false, error: "Sign in to leave a review." }, { status: 401 });
  const { id: productId } = await ctx.params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Please add a rating and some text." }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });

  try {
    // productId/userId/rating/body required; title nullable. `images` is a real column
    // (String[] @default([])), so passing it is safe — the old "unknown key would throw"
    // note was wrong for images (it IS known). verified/helpfulCount still use defaults.
    const row = await prisma.review.create({
      data: {
        productId,
        userId: actor.id,
        rating: parsed.data.rating,
        title: parsed.data.title || null,
        body: parsed.data.body,
        images: parsed.data.images ?? [],
      },
      include: { user: { select: { name: true } } },
    });
    return NextResponse.json({ ok: true, review: toVM(row) });
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ ok: false, error: "You've already reviewed this product." }, { status: 409 });
    console.error("review create failed", e);
    return NextResponse.json({ ok: false, error: "Could not save your review. Try again." }, { status: 500 });
  }
}

function toVM(r: any) {
  return {
    id: r.id,
    rating: r.rating,
    title: r.title ?? null,
    body: r.body,
    images: Array.isArray(r.images) ? r.images : [],
    author: r.user?.name ?? "Verified Buyer",
    // Honour the column if it exists; a signed-in post counts as verified.
    verified: typeof r.verified === "boolean" ? r.verified : true,
    at: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    helpful: r.helpfulCount ?? 0,
  };
}