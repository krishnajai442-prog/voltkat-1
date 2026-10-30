import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { productSelect, toCards } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Pool = EVERY active, in-stock product. No featured/discount gate and no
    // bounded take() window: both of those made the slot effectively static — a
    // product added later (or one outside the first 50 heap rows) could never be
    // drawn. Sampling the full id set keeps the pick uniform, so anything you
    // publish tomorrow is eligible on the very next refresh with no code change.
    // (Scale note: id-only projection over the active set is cheap for realistic
    // catalogs; if it ever grows very large, switch to a random-skip or
    // TABLESAMPLE pick instead of loading every id.)
    const candidates = await prisma.product.findMany({
      where: { active: true, stock: { gt: 0 } },
      select: { id: true },
    });

    if (candidates.length === 0) {
      return NextResponse.json({ ok: false, error: "No ads available" }, { status: 404 });
    }

    // Narrow the indexed element BEFORE reading .id (satisfies noUncheckedIndexedAccess).
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    if (!picked) {
      return NextResponse.json({ ok: false, error: "No ads available" }, { status: 404 });
    }

    const product = await prisma.product.findUnique({
      where: { id: picked.id },
      select: productSelect,
    });

    if (!product) {
      return NextResponse.json({ ok: false, error: "Ad lookup failed" }, { status: 404 });
    }

    // toCards returns an array; index [0] is also possibly-undefined under strict
    // mode, so pull it into a variable and guard it instead of returning
    // toCards([product])[0] inline.
    const [vm] = toCards([product]);
    if (!vm) {
      return NextResponse.json({ ok: false, error: "Ad mapping failed" }, { status: 500 });
    }

    // Brand for the featured card bottom-right stamp. Fetched with one extra
    // indexed lookup instead of widening the shared productSelect/CardVM in
    // lib/catalog.ts (consumed by the rails, hero and feed too) - keeps this a
    // route-local change and lights the stamp without a shared-contract edit.
    const brandRow = await prisma.product.findUnique({
      where: { id: picked.id },
      select: { brand: { select: { name: true } } },
    });
    const brandName = brandRow?.brand?.name ?? null;

    return NextResponse.json({ ok: true, product: { ...vm, brand: brandName } });
  } catch {
    return NextResponse.json({ ok: false, error: "Random ad generation failed" }, { status: 500 });
  }
}
