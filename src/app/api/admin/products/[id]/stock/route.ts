import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { audit, can, requireStaff } from "@/lib/auth/guards";
import { stockAdjustSchema } from "@/lib/validators";
import { jsonError } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { notifyStaff } from "@/lib/notifications";
import { ok, validationError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const rl = await rateLimit("adminMutation", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const actor = await requireStaff();
    if (!can.manageCatalog(actor.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;

    const parsed = stockAdjustSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return validationError(parsed.error);

    const before = await prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, stock: true, lowStockAt: true },
    });

    if (!before) {
      return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });
    }

    const delta = parsed.data.delta;
    let updated;

    if (delta < 0) {
      const res = await prisma.product.updateMany({
        where: { id, stock: { gte: -delta } },
        data: { stock: { increment: delta } },
      });

      if (res.count !== 1) {
        return NextResponse.json(
          { ok: false, error: "Insufficient stock for this adjustment" },
          { status: 409 },
        );
      }

      updated = await prisma.product.findUniqueOrThrow({ where: { id } });
    } else {
      updated = await prisma.product.update({
        where: { id },
        data: { stock: { increment: delta } },
      });
    }

    await audit({
      actorId: actor.id,
      action: "PRODUCT_STOCK_ADJUST",
      entity: "Product",
      entityId: id,
      ip: clientIp(req),
      userAgent: req.headers.get("user-agent"),
      before: { stock: before.stock },
      after: { stock: updated.stock, reason: parsed.data.reason },
    });

    if (updated.stock === 0) {
      await notifyStaff({ template: "ADMIN_OUT_OF_STOCK", ctx: { product: updated.name } });
    } else if (updated.stock <= updated.lowStockAt) {
      await notifyStaff({
        template: "ADMIN_LOW_STOCK",
        ctx: {
          product: updated.name,
          stock: String(updated.stock),
          threshold: String(updated.lowStockAt),
        },
      });
    }

    return ok({ product: { id: updated.id, stock: updated.stock } });
  } catch (e) {
    return jsonError(e, "Stock update failed");
  }
}