import { parseProductOptions } from "@/lib/product-options";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaff, audit, can } from "@/lib/auth/guards";
import { productInputSchema } from "@/lib/validators";
import { discountPercent, jsonError, slugify } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { validationError, ok } from "@/lib/api-response";
import { seedRating, buildReviewPicks, REVIEW_TARGET } from "@/lib/rating-seed"; // ← (1) import

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function uniqueSlug(tx: any, base: string, excludeId?: string) {
  let slug = slugify(base) || "product";
  let i = 2;
  while (true) {
    const exists = await tx.product.findUnique({ where: { slug }, select: { id: true } });
    if (!exists || exists.id === excludeId) return slug;
    slug = `${slugify(base)}-${i++}`;
  }
}

export async function POST(req: Request) {
  const rl = await rateLimit("adminMutation", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const actor = await requireStaff();
    if (!can.manageCatalog(actor.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body: Record<string, unknown> = await req.json().catch(() => ({}));
    const bodyForSchema: Record<string, unknown> = { ...body };
    delete bodyForSchema.colors;
    delete bodyForSchema.colorOptions;
    delete bodyForSchema.variants;
    delete bodyForSchema.optionGroups;
    delete bodyForSchema.groupId;
    const parsed = productInputSchema.safeParse(bodyForSchema);
    if (!parsed.success) return validationError(parsed.error);
    const data = parsed.data;
    const rawGroupId = (body as { groupId?: unknown }).groupId;
    const groupId = typeof rawGroupId === "string" && rawGroupId.trim() ? rawGroupId.trim() : null;

    if (data.salePrice > data.mrp) {
      return NextResponse.json({ ok: false, error: "Sale price cannot exceed MRP" }, { status: 422 });
    }

    const [category, brand] = await Promise.all([
      prisma.category.findUnique({ where: { id: data.categoryId }, select: { id: true } }),
      prisma.brand.findUnique({ where: { id: data.brandId }, select: { id: true } }),
    ]);
    if (!category || !brand) {
      return NextResponse.json({ ok: false, error: "Invalid category or brand" }, { status: 422 });
    }

    const product = await prisma.$transaction(async (tx) => {
      const slug = await uniqueSlug(tx, data.slug || data.name);
      return tx.product.create({
        data: {
          name: data.name,
          slug,
          shortDescription: data.shortDescription || null,
          category: { connect: { id: data.categoryId } },
          brand: { connect: { id: data.brandId } },
          mrp: data.mrp,
          salePrice: data.salePrice,
          discountPercent: discountPercent(data.mrp, data.salePrice),
          stock: data.stock,
          lowStockAt: data.lowStockAt,
          subtype: data.subtype || null,
          ram: data.ram || null,
          storage: data.storage || null,
          screenSize: data.screenSize || null,
          processor: data.processor || null,
          color: data.color || null,
          warrantyMonths: data.warrantyMonths,
          codEligible: data.codEligible,
          emiEligible: data.emiEligible,
          exchangeEligible: data.exchangeEligible,
          featured: data.featured,
          active: data.active,
          hsnCode: data.hsnCode || null,
          tags: data.tags,
          ...seedRating(data.name), // ← (2) counter, atomic with the row, always >=1200
          ...parseProductOptions(body),
          groupId,
          images: {
            create: data.images.map((img, idx) => ({
              url: img.url,
              alt: img.alt || data.name,
              position: idx,
              isPrimary: idx === 0,
            })),
          },
          specifications: {
            create: data.specifications.map((s) => ({
              group: s.group,
              label: s.label,
              value: s.value,
            })),
          },
        },
      });
    });

    // ← (3) best-effort visible strip, POST-commit so it can never block creation.
    // Fresh product => no existing reviewers => buildReviewPicks draws distinct
    // users => @@unique([productId,userId]) cannot fire. Empty pool => just logs.
    try {
      const authors = await prisma.user.findMany({
        where: { role: { not: "ADMIN" } },
        take: REVIEW_TARGET,
        select: { id: true },
      });
      if (authors.length) {
        await prisma.review.createMany({
          data: buildReviewPicks(product.id, authors.map((a) => a.id)),
        });
      }
    } catch (e) {
      console.error("review seed skipped for", product.id, e instanceof Error ? e.message : e);
    }

    await audit({
      actorId: actor.id,
      action: "PRODUCT_CREATE",
      entity: "Product",
      entityId: product.id,
      ip: clientIp(req),
      userAgent: req.headers.get("user-agent"),
      after: { name: product.name, salePrice: product.salePrice, stock: product.stock },
    });

    return ok({ product });
  } catch (e) {
    return jsonError(e, "Product creation failed");
  }
}