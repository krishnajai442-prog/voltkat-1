import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActor } from "@/lib/auth/guards";
import { reviewSchema } from "@/lib/validators";
import { jsonError, sanitizeText } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { notifyStaff } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rl = await rateLimit("form", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const actor = await requireActor();

    const parsed = reviewSchema.safeParse(await req.json().catch(() => ({})));

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid review",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const data = parsed.data;

    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      select: { id: true, name: true, active: true },
    });

    if (!product || !product.active) {
      return NextResponse.json({ ok: false, error: "Product not found." }, { status: 404 });
    }

    const purchased = await prisma.orderItem.findFirst({
      where: {
        productId: product.id,
        order: {
          userId: actor.id,
          status: "DELIVERED",
        },
      },
      select: { id: true },
    });

    if (!purchased) {
      return NextResponse.json(
        { ok: false, error: "Only verified buyers can publish reviews." },
        { status: 403 },
      );
    }

    await prisma.review.upsert({
      where: {
        productId_userId: {
          productId: product.id,
          userId: actor.id,
        },
      },
      update: {
        rating: data.rating,
        title: data.title ? sanitizeText(data.title, 120) : null,
        body: sanitizeText(data.body, 2000),
        images: data.images ?? [],
        published: true,
      },
      create: {
        productId: product.id,
        userId: actor.id,
        rating: data.rating,
        title: data.title ? sanitizeText(data.title, 120) : null,
        body: sanitizeText(data.body, 2000),
        images: data.images ?? [],
        verified: true,
        published: true,
        helpfulCount: 0,
      },
    });

    const agg = await prisma.review.aggregate({
      where: {
        productId: product.id,
        published: true,
      },
      _avg: {
        rating: true,
      },
      _count: true,
    });

    await prisma.product.update({
      where: { id: product.id },
      data: {
        ratingAvg: agg._avg.rating ?? 0,
        ratingCount: agg._count,
      },
    });

    await notifyStaff({
      template: "ADMIN_REVIEW",
      ctx: {
        customer: actor.name,
        product: product.name,
        rating: String(data.rating),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e, "Review submission failed.");
  }
}

export async function PATCH(req: Request) {
  const rl = await rateLimit("form", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const id = new URL(req.url).searchParams.get("id");

    if (!id) {
      return NextResponse.json({ ok: false, error: "Review id required." }, { status: 422 });
    }

    await prisma.review.update({
      where: { id },
      data: {
        helpfulCount: { increment: 1 },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e, "Could mark review helpful.");
  }
}