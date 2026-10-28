import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { productSelect, toCards } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Upsell candidates for the buy-now interstitial, drawn by a relevance fallback chain:
 *   tier 0  copurchase  REAL co-occurrence in non-cancelled VoltKart orders (the only
 *                       tier that earns the literal "Frequently bought together" title)
 *   tier 1  category    in-stock products sharing the seed's category
 *   tier 2  brand       in-stock products sharing the seed's brand
 *   tier 3  global      in-stock products from the whole catalog
 * All tiers are per-request randomized (no fixed window, so a product you add later is
 * eligible next load) and always exclude the seed. Co-purchase uses ONLY the Prisma
 * client (relation filter + groupBy, sorted in JS) — no $queryRaw, no table-name
 * guessing — so a custom @@map can't silently defeat it. Every tier that yields nothing
 * falls through; total failure returns [] so the sheet auto-skips. `scope`/`groupName`
 * let the client title the sheet HONESTLY for whichever tier actually fired.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = (searchParams.get("id") ?? "").trim();
    const n = Math.min(8, Math.max(1, Number(searchParams.get("n") ?? 4) || 4));
    if (!id) return NextResponse.json({ ok: true, products: [], scope: "none" });

    const seed = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        categoryId: true,
        brandId: true,
        category: { select: { name: true } },
        brand: { select: { name: true } },
      },
    });
    if (!seed) return NextResponse.json({ ok: true, products: [], scope: "none" });

    // ---- tier 0: REAL co-purchase from non-cancelled orders ---------------------
    // Capped to the 300 most recent seed-containing orders to bound the IN-list;
    // frequency ranked client-side so we never depend on groupBy orderBy syntax.
    try {
      const seedOrders = await prisma.orderItem.findMany({
        where: { productId: id, order: { status: { not: "CANCELLED" } } },
        select: { orderId: true },
        orderBy: { order: { createdAt: "desc" } },
        take: 300,
      });
      const orderIds = Array.from(new Set(seedOrders.map((o) => o.orderId)));
      if (orderIds.length) {
        const groups = await prisma.orderItem.groupBy({
          by: ["productId"],
          where: { orderId: { in: orderIds }, productId: { not: id } },
          _count: { _all: true },
        });
        const coIds = groups
          .filter((g) => g.productId && g.productId !== id)
          .sort((a, b) => (b._count._all ?? 0) - (a._count._all ?? 0))
          .slice(0, n)
          .map((g) => g.productId);
        if (coIds.length) {
          const rows = await prisma.product.findMany({
            where: { id: { in: coIds }, active: true, stock: { gt: 0 } },
            select: productSelect,
          });
          const byId = new Map(rows.map((r) => [r.id, r] as const));
          const ordered = coIds.map((cid) => byId.get(cid)).filter((r): r is NonNullable<typeof r> => Boolean(r));
          if (ordered.length) {
            return NextResponse.json({ ok: true, products: toCards(ordered), scope: "copurchase", groupName: null });
          }
        }
      }
    } catch {
      /* co-purchase unavailable (no data / query error) -> fall through honestly */
    }

    // ---- fallback tiers: category -> brand -> global (unchanged from prior turn) --
    const picked: string[] = [];
    const seen = new Set<string>([id]);
    const take = (rows: { id: string }[], cap: number) => {
      for (const r of rows) { if (picked.length >= cap) break; if (seen.has(r.id)) continue; seen.add(r.id); picked.push(r.id); }
    };

    let scope: "category" | "brand" | "global" | "none" = "none";
    let groupName: string | null = null;

    if (seed.categoryId) {
      try {
        const rows = await prisma.product.findMany({
          where: { active: true, stock: { gt: 0 }, categoryId: seed.categoryId, id: { not: id } },
          select: { id: true },
        });
        for (let i = rows.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const a = rows[i]!; rows[i] = rows[j]!; rows[j] = a; }
        take(rows, n);
        if (picked.length) { scope = "category"; groupName = seed.category?.name ?? null; }
      } catch { /* fall through to brand */ }
    }
    if (picked.length < n && seed.brandId) {
      try {
        const rows = await prisma.product.findMany({
          where: { active: true, stock: { gt: 0 }, brandId: seed.brandId, id: { notIn: picked.concat(id) } },
          select: { id: true },
        });
        for (let i = rows.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const a = rows[i]!; rows[i] = rows[j]!; rows[j] = a; }
        take(rows, n);
        if (scope === "none" && picked.length) { scope = "brand"; groupName = seed.brand?.name ?? null; }
      } catch { /* fall through to global */ }
    }
    if (picked.length < n) {
      try {
        const rows = await prisma.product.findMany({
          where: { active: true, stock: { gt: 0 }, id: { notIn: picked.concat(id) } },
          select: { id: true },
        });
        for (let i = rows.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const a = rows[i]!; rows[i] = rows[j]!; rows[j] = a; }
        take(rows, n);
        if (scope === "none" && picked.length) scope = "global";
      } catch { /* leave as-is */ }
    }

    if (!picked.length) return NextResponse.json({ ok: true, products: [], scope: "none" });
    const rows = await prisma.product.findMany({ where: { id: { in: picked } }, select: productSelect });
    const byId = new Map(rows.map((r) => [r.id, r] as const));
    const ordered = picked.map((pid) => byId.get(pid)).filter((r): r is NonNullable<typeof r> => Boolean(r));
    return NextResponse.json({ ok: true, products: toCards(ordered), scope, groupName });
  } catch {
    return NextResponse.json({ ok: true, products: [], scope: "none" });
  }
}