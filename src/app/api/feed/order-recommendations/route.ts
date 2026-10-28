import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { discountPercent } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RecVM = {
  id: string;
  slug: string;
  name: string;
  image: string;
  salePrice: number;
  mrp: number;
  discountPercent: number;
  ratingAvg: number;
  sold: number;
};

/**
 * "Products For You" pool for the order-details page. Mirrors /api/feed/random-ad's
 * dynamic guarantee: the candidate set is EVERY active, in-stock product (no featured/
 * discount gate, no bounded take() window), shuffled per request, so anything you add
 * later is eligible on the next load with no code change. `exclude` (csv of product ids)
 * keeps the just-purchased item out of its own recommendation rail.
 *
 * Scale note: loading the id set of the active catalog is cheap for realistic stores; if
 * it ever grows very large, switch to a random-skip / TABLESAMPLE pick instead.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const n = Math.min(24, Math.max(1, Number(url.searchParams.get("n") ?? 10) || 10));
    const exclude = new Set(
      (url.searchParams.get("exclude") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );

    const candidates = await prisma.product.findMany({
      where: { active: true, stock: { gt: 0 } },
      select: { id: true },
    });

    const pool = candidates.filter((c) => !exclude.has(c.id));
    if (pool.length === 0) return NextResponse.json({ ok: true, products: [] as RecVM[] });

    // Fisher–Yates over the id list, then take n (same pattern the account page uses).
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const a = shuffled[i]!;
      shuffled[i] = shuffled[j]!;
      shuffled[j] = a;
    }
    const pickedIds = shuffled.slice(0, n).map((r) => r.id);

    const rows = await prisma.product.findMany({
      where: { id: { in: pickedIds } },
      select: {
        id: true,
        slug: true,
        name: true,
        salePrice: true,
        mrp: true,
        discountPercent: true,
        ratingAvg: true,
        sold: true,
        images: {
          select: { url: true, isPrimary: true, position: true },
          orderBy: { position: "asc" as const },
        },
      },
    });

    const byId = new Map(rows.map((r) => [r.id, r] as const));
    const products: RecVM[] = pickedIds
      .map((id) => byId.get(id))
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .map((r) => {
        const salePrice = Number(r.salePrice ?? 0);
        const mrp = Number(r.mrp ?? salePrice);
        return {
          id: r.id,
          slug: r.slug,
          name: r.name,
          image: r.images.find((i) => i.isPrimary)?.url ?? r.images[0]?.url ?? "",
          salePrice,
          mrp,
          discountPercent: r.discountPercent || discountPercent(mrp, salePrice),
          ratingAvg: Number(r.ratingAvg ?? 0),
          sold: Number(r.sold ?? 0),
        };
      });

    return NextResponse.json({ ok: true, products });
  } catch {
    // A failed recommendation fetch must never break the order page: hand back an
    // empty list so the rail simply hides (the client returns null on empty).
    return NextResponse.json({ ok: true, products: [] as RecVM[] });
  }
}