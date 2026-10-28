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

export async function POST(req: Request) {
  const rl = await rateLimit("adminMutation", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const actor = await requireStaff();
    if (!can.manageContent(actor.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const parsed = slideInputSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return validationError(parsed.error);

    const data = parsed.data;

    // Validate that every attached product exists and is active.
    if (data.productIds.length) {
      const count = await prisma.product.count({
        where: { id: { in: data.productIds }, active: true },
      });
      if (count !== data.productIds.length) {
        return NextResponse.json(
          { ok: false, error: "One or more products are invalid" },
          { status: 422 },
        );
      }
    }

    const slide = await prisma.heroSlide.create({
      data: {
        kind: "CUSTOM",

        // --- content --------------------------------------------------------
        badge: data.badge,
        headline: data.headline,
        highlight: data.highlight || null,
        description: data.description || null,
        image: data.image || null,

        // --- calls to action ------------------------------------------------
        ctaLabel: data.ctaLabel,
        ctaHref: data.ctaHref || null,
        secondaryLabel: data.secondaryLabel || null,
        secondaryHref: data.secondaryHref || null,

        // --- appearance & schedule ------------------------------------------
        gradient: data.gradient as GradientTheme,
        active: data.active,
        sortOrder: data.sortOrder,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        createdBy: actor.id,

        // --- attached products + per-product slide artwork ------------------
        products: {
          create: data.productIds.map((productId, position) => ({
            productId,
            position,
            image: data.productImages?.[productId] || null,
          })),
        },
      },
      include: { products: true },
    });

    await audit({
      actorId: actor.id,
      action: "SLIDE_CREATE",
      entity: "HeroSlide",
      entityId: slide.id,
      ip: clientIp(req),
      after: { headline: slide.headline },
    });

    return ok({
      slide: {
        ...slide,
        productIds: slide.products.map((p) => p.productId),
        // Echo per-product artwork back so the manager's local state is correct
        // immediately after creation, without waiting for router.refresh().
        productImages: Object.fromEntries(
          slide.products.map((p) => [p.productId, p.image ?? ""]),
        ),
      },
    });
  } catch (e) {
    return jsonError(e, "Slide creation failed");
  }
}