import prisma from "@/lib/prisma";

export type CatMeta = { id: string; slug: string; name: string; image: string | null; count: number };
export type ExplorerItem = { id: string; slug: string; name: string; image: string | null; price: number | null; mrp: number | null; off: number; isNew: boolean };
export type ExplorerBrand = { name: string; image: string | null; pill: string };
export type ExplorerData = {
  categories: CatMeta[];
  byCategory: Record<string, { deals: ExplorerItem[]; brands: ExplorerBrand[] }>;
  allBrands: ExplorerBrand[];
  brandProducts: Record<string, ExplorerItem[]>;
  trending: ExplorerItem[];
};

const prim = (imgs?: { url: string; isPrimary: boolean }[] | null) =>
  imgs?.find((i) => i.isPrimary)?.url ?? imgs?.[0]?.url ?? null;
const offPct = (mrp: number | null | undefined, price: number | null | undefined) =>
  typeof mrp === "number" && typeof price === "number" && mrp > 0 && price < mrp ? Math.round(((mrp - price) / mrp) * 100) : 0;

export async function getCategoryExplorer(): Promise<ExplorerData> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 864e5);
  const [cats, pool, counts] = await Promise.all([
    prisma.category.findMany({ select: { id: true, slug: true, name: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { active: true, stock: { gt: 0 } },
      select: {
        id: true, slug: true, name: true, salePrice: true, mrp: true, discountPercent: true,
        createdAt: true, sold: true, ratingAvg: true,
        images: { select: { url: true, isPrimary: true } },
        brand: { select: { name: true } },
        category: { select: { id: true, slug: true } },
      },
      orderBy: [{ sold: "desc" }, { ratingAvg: "desc" }],
      take: 200,
    }),
    prisma.product.groupBy({ by: ["categoryId"], where: { active: true, stock: { gt: 0 } }, _count: true }),
  ]);

  const realCount = new Map(counts.map((g) => [g.categoryId, g._count]));

  const toExplorer = (p: (typeof pool)[number]): ExplorerItem => ({
    id: p.id, slug: p.slug, name: p.name, image: prim(p.images),
    price: p.salePrice, mrp: p.mrp, off: offPct(p.mrp, p.salePrice),
    isNew: !!p.createdAt && p.createdAt >= thirtyDaysAgo,
  });

  const byCat = new Map<string, ExplorerItem[]>();
  const brandRep = new Map<string, { image: string | null; sold: number }>();
  const brandItems = new Map<string, ExplorerItem[]>();
  const catBrand = new Map<string, Map<string, { image: string | null; sold: number }>>();

  for (const p of pool) {
    const slug = p.category?.slug;
    const it = toExplorer(p);
    if (slug) (byCat.get(slug) ?? byCat.set(slug, []).get(slug)!).push(it);
    const bn = p.brand?.name;
    if (bn) {
      const cur = brandRep.get(bn);
      if (!cur || (p.sold ?? 0) > cur.sold) brandRep.set(bn, { image: it.image, sold: p.sold ?? 0 });
      const list = brandItems.get(bn);
      if (list) { if (list.length < 12) list.push(it); } else brandItems.set(bn, [it]);
      if (slug) {
        const m = catBrand.get(slug) ?? new Map<string, { image: string | null; sold: number }>();
        const c2 = m.get(bn);
        if (!c2 || (p.sold ?? 0) > c2.sold) m.set(bn, { image: it.image, sold: p.sold ?? 0 });
        catBrand.set(slug, m);
      }
    }
  }

  const brandTile = (name: string, r: { image: string | null }): ExplorerBrand => ({
    name, image: r.image, pill: "Explore",
  });

  const categories: CatMeta[] = cats.map((c) => {
    const first = byCat.get(c.slug)?.[0];
    return { id: c.id, slug: c.slug, name: c.name, image: first?.image ?? null, count: realCount.get(c.id) ?? 0 };
  });

  const byCategory: ExplorerData["byCategory"] = {};
  for (const c of categories) {
    const items = byCat.get(c.slug) ?? [];
    const deals = items.slice().sort((a, b) => b.off - a.off).slice(0, 6);
    const bm = catBrand.get(c.slug);
    const brands = bm ? [...bm.entries()].map(([n, r]) => brandTile(n, r)).slice(0, 6) : [];
    byCategory[c.slug] = { deals, brands };
  }

  const allBrands = [...brandRep.entries()].map(([n, r]) => brandTile(n, r)).slice(0, 8);
  const brandProducts: Record<string, ExplorerItem[]> = {};
  for (const [n, list] of brandItems.entries()) brandProducts[n] = list;
  const trending = pool.map(toExplorer).sort((a, b) => b.off - a.off).slice(0, 8);

  return { categories, byCategory, allBrands, brandProducts, trending };
}