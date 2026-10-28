import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActor } from "@/lib/auth/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/products/:id/duplicate
 *
 * Clone a product so a colour/variant sibling can be edited from a copy instead
 * of from scratch. Copies, in ONE atomic transaction:
 *   - the row (new slug/name, sales+views reset, rating carried WITH reviews, inactive)
 *   - ALL images (GALLERY + SHOWCASE, positions + isPrimary)
 *   - ALL specifications (SPEC / WARRANTY / MFG)
 *   - ALL reviews (photos, verified flag, helpful counts, original timestamps)
 *   - ALL question threads with their answers
 * Copies the SAVED server state; does not see unsaved form edits.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const actor = await getActor();

  // Same inline staff idiom as the order page; align with your other admin
  // write routes if you enforce a stricter role.
  if (!actor || !["ADMIN", "MANAGER", "STAFF"].includes(actor.role)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  const src = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { position: "asc" } },
      specifications: true,
    },
  });

  if (!src) {
    return NextResponse.json(
      { ok: false, error: "Product not found" },
      { status: 404 },
    );
  }

  // Unique slug without touching the create route's slugify: suffix until free.
  let slug = `${src.slug}-copy`;
  for (let n = 2; ; n++) {
    const taken = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!taken) break;
    slug = `${src.slug}-copy-${n}`;
  }

  const copy = await prisma.$transaction(async (tx) => {
    const row = await tx.product.create({
      data: {
        // --- identity --------------------------------------------------------
        slug,
        name: `${src.name} (Copy)`,
        groupId: src.groupId,
        shortDescription: src.shortDescription,
        categoryId: src.categoryId,
        brandId: src.brandId,
        subtype: src.subtype,

        // --- pricing & stock -------------------------------------------------
        mrp: src.mrp,
        salePrice: src.salePrice,
        discountPercent: src.discountPercent,
        stock: src.stock,
        lowStockAt: src.lowStockAt,
        hsnCode: src.hsnCode,

        // --- physical / technical --------------------------------------------
        ram: src.ram,
        storage: src.storage,
        screenSize: src.screenSize,
        processor: src.processor,
        color: src.color,

        // --- service / eligibility -------------------------------------------
        warrantyMonths: src.warrantyMonths,
        returnableDays: src.returnableDays,
        codEligible: src.codEligible,
        emiEligible: src.emiEligible,
        exchangeEligible: src.exchangeEligible,

        // --- state -----------------------------------------------------------
        featured: src.featured,
        active: false, // copy starts inactive so a half-edited variant can't go live

        // --- collections -----------------------------------------------------
        tags: [...(src.tags ?? [])],
        colors: [...(src.colors ?? [])],
        variants: src.variants ?? undefined,
        optionGroups: src.optionGroups ?? undefined,
        colorOptions: src.colorOptions ?? undefined,
        showcaseImages: [...(src.showcaseImages ?? [])],

        // --- aggregates & history --------------------------------------------
        // Sales/traffic stay reset: a copy must not claim sales it never made
        // or sneak into bestseller carousels. The rating travels WITH the
        // reviews copied below, so the aggregate and the review list can never
        // disagree.
        sold: 0,
        views: 0,
        ratingAvg: src.ratingAvg,
        ratingCount: src.ratingCount,
      },
    });

    // --- images (both GALLERY and SHOWCASE, with original positions) ----------
    if (src.images.length) {
      await tx.productImage.createMany({
        data: src.images.map((im, i) => ({
          productId: row.id,
          url: im.url,
          alt: im.alt,
          kind: im.kind,
          position: im.position ?? i,
          isPrimary: im.isPrimary,
        })),
      });
    }

    // --- specifications (SPEC / WARRANTY / MFG) --------------------------------
    if (src.specifications.length) {
      await tx.productSpecification.createMany({
        data: src.specifications.map((s) => ({
          productId: row.id,
          kind: s.kind,
          group: s.group,
          label: s.label,
          value: s.value,
        })),
      });
    }

    // --- reviews ---------------------------------------------------------------
    // Colour/variant siblings share reviews on real marketplaces. The
    // @@unique([productId, userId]) constraint cannot collide: the pair
    // includes the NEW productId, so no user ends up with two reviews on the
    // same product.
    const reviews = await tx.review.findMany({ where: { productId: id } });
    if (reviews.length) {
      await tx.review.createMany({
        data: reviews.map((r) => ({
          productId: row.id,
          userId: r.userId,
          orderId: r.orderId,
          rating: r.rating,
          title: r.title,
          body: r.body,
          images: [...(r.images ?? [])],
          verified: r.verified,
          helpfulCount: r.helpfulCount,
          published: r.published,
          createdAt: r.createdAt,
        })),
      });
    }

    // --- question threads + answers, in thread order ---------------------------
    // Neither Question nor Answer has a unique constraint, so re-parenting
    // answers onto fresh question ids is collision-free.
    const questions = await tx.question.findMany({
      where: { productId: id },
      include: { answers: { orderBy: { createdAt: "asc" } } },
    });

    for (const q of questions) {
      const nq = await tx.question.create({
        data: {
          productId: row.id,
          userId: q.userId,
          body: q.body,
          answered: q.answered,
          createdAt: q.createdAt,
        },
      });

      if (q.answers.length) {
        await tx.answer.createMany({
          data: q.answers.map((a) => ({
            questionId: nq.id,
            userId: a.userId,
            body: a.body,
            isOfficial: a.isOfficial,
            createdAt: a.createdAt,
          })),
        });
      }
    }

    return row;
  });

  return NextResponse.json({ ok: true, id: copy.id, slug: copy.slug });
}