import prisma from "@/lib/prisma";

export type Tile = { label: string; pill: string; image: string | null; href: string };
export type DealTile = { label: string; price: number | null; image: string | null; href: string };
export type GridItem = {
  id: string; slug: string; name: string; brand: string | null; image: string | null;
  price: number | null; mrp: number | null; rating: number | null; ratingCount: number | null;
};

const prodSelect = {
  id: true, slug: true, name: true, salePrice: true, mrp: true, ratingAvg: true, ratingCount: true,
  sold: true, images: { select: { url: true, isPrimary: true } },
} as const;

const prim = (r: { images?: { url: string; isPrimary: boolean }[] }) =>
  r.images?.find((i) => i.isPrimary)?.url ?? r.images?.[0]?.url ?? null;
const offPct = (mrp: number | null | undefined, price: number | null | undefined) =>
  typeof mrp === "number" && typeof price === "number" && mrp > 0 && price < mrp
    ? Math.round(((mrp - price) / mrp) * 100) : 0;

/** 3-col "Suggested For You" grid — top selling, in-stock, active. */
export async function getSuggested(take = 12): Promise<GridItem[]> {
  const rows = await prisma.product.findMany({
    where: { active: true, stock: { gt: 0 } },
    select: { ...prodSelect, brand: { select: { name: true } } },
    orderBy: [{ sold: "desc" }, { ratingAvg: "desc" }],
    take,
  });
  return rows.map((r: any) => ({
    id: r.id, slug: r.slug, name: r.name, brand: r.brand?.name ?? null, image: prim(r),
    price: r.salePrice, mrp: r.mrp, rating: r.ratingAvg, ratingCount: r.ratingCount,
  }));
}

/** Category collection tiles ("Popular picks" / "Lowest Prices…"): per category, best discount + rep image. */
export async function getCategoryCollections(limit = 4): Promise<Tile[]> {
  const pool = await prisma.product.findMany({
    where: { active: true, stock: { gt: 0 } },
    select: { ...prodSelect, salePrice: true, mrp: true, category: { select: { slug: true, name: true } } },
    orderBy: [{ sold: "desc" }], take: 60,
  });
  const byCat = new Map<string, any[]>();
  for (const r of pool as any[]) { const k = r.category?.slug; if (!k) continue; (byCat.get(k) ?? byCat.set(k, []).get(k)!).push(r); }
  return [...byCat.entries()].map(([slug, rs]) => {
    const best = rs.slice().sort((a, b) => offPct(b.mrp, b.salePrice) - offPct(a.mrp, a.salePrice))[0];
    const maxOff = Math.max(0, ...rs.map((x: any) => offPct(x.mrp, x.salePrice)));
    return { label: best.category?.name ?? slug, pill: maxOff > 0 ? `Up to ${maxOff}% Off` : "Explore", image: prim(best), href: `/products/${slug}` };
  }).slice(0, limit);
}

/** Compact horizontal deal tiles ("Jump in"): per category, name + lowest live price + rep image. */
export async function getDealTiles(limit = 6): Promise<DealTile[]> {
  const pool = await prisma.product.findMany({
    where: { active: true, stock: { gt: 0 } },
    select: { ...prodSelect, salePrice: true, category: { select: { slug: true, name: true } } },
    orderBy: [{ salePrice: "asc" }], take: 80,
  });
  const byCat = new Map<string, any>();
  for (const r of pool as any[]) { const k = r.category?.slug; if (!k || byCat.has(k)) continue; byCat.set(k, r); } // cheapest-first ⇒ first seen per cat is the floor price
  return [...byCat.values()].map((r: any) => ({
    label: r.category?.name ?? "", price: r.salePrice, image: prim(r), href: `/products/${r.category.slug}`,
  })).slice(0, limit);
}

/** Brand spotlight cards: per brand, min discount across its products + rep image. */
export async function getBrandSpotlight(limit = 4): Promise<Tile[]> {
  const pool = await prisma.product.findMany({
    where: { active: true, stock: { gt: 0 } },
    select: { ...prodSelect, salePrice: true, mrp: true, brand: { select: { name: true } } },
    orderBy: [{ sold: "desc" }], take: 80,
  });
  const byBrand = new Map<string, any[]>();
  for (const r of pool as any[]) { const k = r.brand?.name; if (!k) continue; (byBrand.get(k) ?? byBrand.set(k, []).get(k)!).push(r); }
  return [...byBrand.entries()].map(([name, rs]) => {
    const best = rs.slice().sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0))[0];
    const minOff = Math.max(0, ...rs.map((x: any) => offPct(x.mrp, x.salePrice)));
    return { label: name, pill: minOff > 0 ? `Min. ${minOff}% Off` : "Explore", image: prim(best), href: `/products/all?q=${encodeURIComponent(name)}` };
  }).slice(0, limit);
}