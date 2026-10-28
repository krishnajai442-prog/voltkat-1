import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireActor } from "@/lib/auth/guards";
import { jsonError } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ slug: z.string().min(1).max(120) });

export async function POST(req: Request) {
  try {
    const actor = await requireActor();
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid slug." }, { status: 422 });
    }

    const product = await prisma.product.findUnique({
      where: { slug: parsed.data.slug },
      select: { id: true },
    });
    if (!product) return NextResponse.json({ ok: false, error: "Product not found." }, { status: 404 });

    await prisma.recentlyViewed.upsert({
      where: {
        userId_productId: {
          userId: actor.id,
          productId: product.id,
        },
      },
      create: { userId: actor.id, productId: product.id },
      update: { viewedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e, "Could not record recently viewed product.");
  }
}