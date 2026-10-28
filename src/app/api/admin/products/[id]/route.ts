import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { audit, can, requireStaff } from "@/lib/auth/guards";
import { productInputSchema } from "@/lib/validators";
import { discountPercent, jsonError, slugify } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { ok, validationError } from "@/lib/api-response";
import { parseProductOptions } from "@/lib/product-options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const quickSchema = z.object({
  active: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
});

async function uniqueSlug(tx: any, base: string, excludeId?: string) {
  let slug = slugify(base) || "product";
  let i = 2;
  while (true) {
    const exists = await tx.product.findUnique({ where: { slug }, select: { id: true } });
    if (!exists || exists.id === excludeId) return slug;
    slug = `${slugify(base)}-${i++}`;
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const rl = await rateLimit("adminMutation", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const actor = await requireStaff();
    if (!can.manageCatalog(actor.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));

    // Option fields are persisted separately (below); keep them out of the zod
    // schema's view so a strict schema can't reject the whole save because of them.
    const bodyForSchema: Record<string, unknown> = { ...body };
    delete bodyForSchema.colors;
    delete bodyForSchema.colorOptions;
    delete bodyForSchema.variants;
    delete bodyForSchema.optionGroups;
    delete bodyForSchema.groupId;

    const existing = await prisma.product.findUnique({ where: { id },select: { id: true, name: true, stock: true, active: true } });
    if (!existing) return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });

    if (("active" in body || "featured" in body) && !("name" in body)) {
      const quick = quickSchema.safeParse(body);
      if (!quick.success) return validationError(quick.error);
      const product = await prisma.product.update({ where: { id }, data: quick.data });
      await audit({
        actorId: actor.id,
        action: "PRODUCT_QUICK_UPDATE",
        entity: "Product",
        entityId: id,
        ip: clientIp(req),
        before: { active: existing.active },
        after: { active: product.active, featured: product.featured },
      });
      return ok({ product });
    }

    const parsed = productInputSchema.safeParse({ ...bodyForSchema, id: undefined });
    if (!parsed.success) return validationError(parsed.error);
    const data = parsed.data;

    const rawGroupId = (body as { groupId?: unknown }).groupId;
    const groupId = typeof rawGroupId === "string" && rawGroupId.trim() ? rawGroupId.trim() : null;

    if (data.salePrice > data.mrp) {
      return NextResponse.json({ ok: false, error: "Sale price cannotexceed MRP" }, { status: 422 });
    }

    const product = await prisma.$transaction(async (tx) => {
      const slug = await uniqueSlug(tx, data.slug || data.name, id);
      await tx.productImage.deleteMany({ where: { productId: id, kind: "GALLERY" } });
      await tx.productSpecification.deleteMany({ where: { productId: id, kind: "SPEC" } });

      return tx.product.update({
        where: { id },
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
          // Colours / swatches / option groups / variants — sanitized; returns only
          // keys present in the payload, so callers that don't send them change nothing.
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

    await audit({
      actorId: actor.id,
      action: "PRODUCT_UPDATE",
      entity: "Product",
      entityId: id,
      ip: clientIp(req),
      before: { name: existing.name, stock: existing.stock },
      after: { name: product.name, stock: product.stock, salePrice: product.salePrice },
    });

    return ok({ product });
  } catch (e) {
    return jsonError(e, "Product update failed");
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
    const existing = await prisma.product.findUnique({ where: { id },select: { id: true, name: true } });
    if (!existing) return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });

    try {
      await prisma.product.delete({ where: { id } });
    } catch {
      return NextResponse.json(
        { ok: false, error: "Cannot delete product with order history. Deactivate it instead." },
        { status: 409 },
      );
    }

    await audit({
      actorId: actor.id,
      action: "PRODUCT_DELETE",
      entity: "Product",
      entityId: id,
      ip: clientIp(req),
      before: { name: existing.name },
    });

    return ok();
  } catch (e) {
    return jsonError(e, "Product delete failed");
  }
}