import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { audit, can, requireStaff } from "@/lib/auth/guards";
import type { GradientTheme } from "@prisma/client";
import { slideInputSchema } from "@/lib/validators";
import { jsonError } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { ok, validationError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const rl = await rateLimit("adminMutation", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const actor = await requireStaff();
    if (!can.manageContent(actor.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;

    const parsed = slideInputSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return validationError(parsed.error);

    const data = parsed.data;

    // Replace the slide's attached products (and their per-product slide artwork)
    // in one transaction: wipe the join rows, then re-create from the payload.
    await prisma.$transaction(async (tx) => {
      await tx.heroSlideProduct.deleteMany({ where: { slideId: id } });

      await tx.heroSlide.update({
        where: { id },
        data: {
          // --- content ---------------------------------------------------------
          badge: data.badge,
          headline: data.headline,
          highlight: data.highlight || null,
          description: data.description || null,
          image: data.image || null,

          // --- calls to action --------------------------------------------------
          ctaLabel: data.ctaLabel,
          ctaHref: data.ctaHref || null,
          secondaryLabel: data.secondaryLabel || null,
          secondaryHref: data.secondaryHref || null,

          // --- appearance & schedule --------------------------------------------
          gradient: data.gradient as GradientTheme,
          active: data.active,
          sortOrder: data.sortOrder,
          startsAt: data.startsAt ? new Date(data.startsAt) : null,
          endsAt: data.endsAt ? new Date(data.endsAt) : null,

          // --- attached products + per-product slide artwork ---------------------
          products: {
            create: data.productIds.map((productId, position) => ({
              productId,
              position,
              image: data.productImages?.[productId] || null,
            })),
          },
        },
      });
    });

    await audit({
      actorId: actor.id,
      action: "SLIDE_UPDATE",
      entity: "HeroSlide",
      entityId: id,
      ip: clientIp(req),
    });

    const slide = await prisma.heroSlide.findUniqueOrThrow({
      where: { id },
      include: { products: true },
    });

    return ok({
      slide: {
        ...slide,
        productIds: slide.products.map((p) => p.productId),
        // Echo per-product artwork back so the manager's local state is correct
        // immediately, without waiting for router.refresh().
        productImages: Object.fromEntries(
          slide.products.map((p) => [p.productId, p.image ?? ""]),
        ),
      },
    });
  } catch (e) {
    return jsonError(e, "Slide update failed");
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const rl = await rateLimit("adminMutation", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const actor = await requireStaff();
    if (!can.destroy(actor.role)) {
      return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
    }

    const { id } = await ctx.params;

    await prisma.heroSlide.delete({ where: { id } });

    await audit({
      actorId: actor.id,
      action: "SLIDE_DELETE",
      entity: "HeroSlide",
      entityId: id,
      ip: clientIp(req),
    });

    return ok();
  } catch (e) {
    return jsonError(e, "Slide delete failed");
  }
}