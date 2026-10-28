import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireActor } from "@/lib/auth/guards";
import { jsonError } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  productId: z.string().min(1),
});

async function ensureWishlist(userId: string) {
  return prisma.wishlist.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function GET() {
  try {
    const actor = await requireActor();
    const wishlist = await prisma.wishlist.findUnique({
      where: { userId: actor.id },
      include: { items: { select: { productId: true } } },
    });

    return NextResponse.json({
      ok: true,
      ids: wishlist?.items.map((i) => i.productId) ?? [],
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireActor();

    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid wishlist request." }, { status: 422 });
    }

    const product = await prisma.product.findUnique({
      where: { id: parsed.data.productId },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json({ ok: false, error: "Product not found." }, { status: 404 });
    }

    const wishlist = await ensureWishlist(actor.id);

    const existing = await prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId: product.id,
        },
      },
    });

    if (existing) {
      await prisma.wishlistItem.delete({ where: { id: existing.id } });
      return NextResponse.json({ ok: true, added: false });
    }

    await prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        productId: product.id,
      },
    });

    return NextResponse.json({ ok: true, added: true });
  } catch (e) {
    return jsonError(e);
  }
}