import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireActor } from "@/lib/auth/guards";
import { jsonError } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mergeSchema = z.object({
  merge: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(10),
        savedForLater: z.coerce.boolean().optional(),
      }),
    )
    .max(20)
    .optional(),
});

const patchSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(0).max(10).optional(),
  delta: z.coerce.number().int().min(-9).max(9).optional(),
  savedForLater: z.coerce.boolean().optional(),
});

async function ensureCart(userId: string) {
  return prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

function shape(items: { productId: string; quantity: number; savedForLater: boolean }[]) {
  return items.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
    savedForLater: i.savedForLater,
  }));
}

export async function GET() {
  try {
    const actor = await requireActor();
    const cart = await ensureCart(actor.id);

    const items = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ ok: true, items: shape(items) });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireActor();
    const parsed = mergeSchema.safeParse(await req.json().catch(() => ({})));

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid cart merge payload." }, { status: 422 });
    }

    const cart = await ensureCart(actor.id);
    const merge = parsed.data.merge ?? [];

    for (const line of merge) {
      const product = await prisma.product.findUnique({
        where: { id: line.productId },
        select: { id: true, active: true, stock: true },
      });

      if (!product || !product.active) continue;

      const quantity = Math.max(1, Math.min(10, line.quantity));

      await prisma.cartItem.upsert({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId: product.id,
          },
        },
        create: {
          cartId: cart.id,
          productId: product.id,
          quantity,
          savedForLater: line.savedForLater ?? false,
        },
        update: {
          quantity,
          savedForLater: line.savedForLater ?? false,
        },
      });
    }

    const items = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ ok: true, items: shape(items) });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const actor = await requireActor();
    const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid cart update." }, { status: 422 });
    }

    const cart = await ensureCart(actor.id);
    const { productId, quantity, delta, savedForLater } = parsed.data;

    const existing = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    if (typeof quantity === "number") {
      if (quantity <= 0) {
        await prisma.cartItem.deleteMany({
          where: { cartId: cart.id, productId },
        });
      } else {
        const product = await prisma.product.findUnique({
          where: { id: productId },
          select: { id: true, active: true },
        });

        if (!product || !product.active) {
          return NextResponse.json({ ok: false, error: "Product unavailable." }, { status: 409 });
        }

        await prisma.cartItem.upsert({
          where: {
            cartId_productId: {
              cartId: cart.id,
              productId,
            },
          },
          create: {
            cartId: cart.id,
            productId,
            quantity: Math.min(10, quantity),
            savedForLater: savedForLater ?? false,
          },
          update: {
            quantity: Math.min(10, quantity),
            ...(typeof savedForLater === "boolean" ? { savedForLater } : {}),
          },
        });
      }
    } else if (typeof delta === "number") {
      if (!existing) {
        if (delta <= 0) {
          return NextResponse.json({ ok: true, items: shape(await prisma.cartItem.findMany({ where: { cartId: cart.id } })) });
        }

        const product = await prisma.product.findUnique({
          where: { id: productId },
          select: { id: true, active: true },
        });

        if (!product || !product.active) {
          return NextResponse.json({ ok: false, error: "Product unavailable." }, { status: 409 });
        }

        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            quantity: Math.max(1, Math.min(10, delta)),
            savedForLater: savedForLater ?? false,
          },
        });
      } else {
        const nextQty = Math.max(0, Math.min(10, existing.quantity + delta));

        if (nextQty <= 0) {
          await prisma.cartItem.delete({ where: { id: existing.id } });
        } else {
          await prisma.cartItem.update({
            where: { id: existing.id },
            data: {
              quantity: nextQty,
              ...(typeof savedForLater === "boolean" ? { savedForLater } : {}),
            },
          });
        }
      }
    } else if (typeof savedForLater === "boolean" && existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { savedForLater },
      });
    }

    const items = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ ok: true, items: shape(items) });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE() {
  try {
    const actor = await requireActor();
    const cart = await ensureCart(actor.id);

    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    return NextResponse.json({ ok: true, items: [] });
  } catch (e) {
    return jsonError(e);
  }
}