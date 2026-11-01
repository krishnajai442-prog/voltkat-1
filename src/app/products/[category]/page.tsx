import Link from "next/link";
import prisma from "@/lib/prisma";
import { productSelect, toCards } from "@/lib/catalog";
import { ProductListClient } from "@/components/product/ProductListClient";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { CollectionGrid } from "@/components/home/CollectionGrid";
import { buildHeroSlides } from "@/lib/home-slides";
import { getCategoryExplorer } from "@/lib/category-explorer";
import type { ExplorerItem, ExplorerBrand } from "@/lib/category-explorer";
import type { Tile } from "@/lib/home-discovery";

// Match the home page's ISR cadence so the heavier explorer+hero fetches are cached,
// not re-run per request. Remove this one line if you prefer per-request freshness.
export const revalidate = 5;

const RUPEE = "\u20B9";
const inr = (n?: number | null) =>
  typeof n === "number" && Number.isFinite(n) ? `${RUPEE}${n.toLocaleString("en-IN")}` : "";

function Pill({ item }: { item: ExplorerItem }) {
  if (item.off > 0)
    return <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">{item.off}% OFF</span>;
  if (item.isNew)
    return <span className="rounded bg-[#2874f0]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#2874f0]">New</span>;
  return null;
}

function DealCard({ p }: { p: ExplorerItem }) {
  return (
    <Link href={`/product/${p.slug}`} className="flex w-[120px] shrink-0 flex-col sm:w-auto">
      <div className="relative mb-1.5 aspect-square overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image} alt={p.name} loading="lazy" className="size-full object-contain" />
        ) : null}
        <span className="absolute left-1 top-1"><Pill item={p} /></span>
      </div>
      <p className="line-clamp-2 min-h-[2rem] text-[11.5px] leading-snug text-gray-800">{p.name}</p>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="text-[12.5px] font-bold text-gray-900">{inr(p.price)}</span>
        {p.off > 0 && p.mrp ? <span className="text-[10.5px] text-gray-400 line-through">{inr(p.mrp)}</span> : null}
      </div>
    </Link>
  );
}

function DealsRail({ title, items }: { title: string; items: ExplorerItem[] }) {
  if (!items.length) return null;
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-3">
      <h3 className="mb-2 font-display text-[13.5px] font-bold text-gray-900">{title}</h3>
      <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-4 sm:overflow-visible">
        {items.map((p) => <DealCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;

  const [products, cat, explorer, rawSlides] = await Promise.all([
    prisma.product.findMany({
      where: { active: true, category: { slug: category } },
      select: productSelect,
      take: 50,
    }),
    prisma.category.findUnique({ where: { slug: category }, select: { name: true } }),
    getCategoryExplorer(),
    buildHeroSlides(6, { categorySlug: category }),
  ]);

  const catName = cat?.name ?? category;
  const bucket = explorer.byCategory[category];

  // Brand tiles -> the already-densified CollectionGrid (4-up desktop / 2-up mobile).
  const brandTiles: Tile[] = (bucket?.brands ?? []).map((b: ExplorerBrand) => ({
    label: b.name,
    pill: b.pill,
    image: b.image,
    href: `/products/${category}?brands=${encodeURIComponent(b.name)}`,
  }));
  const deals = bucket?.deals ?? [];

  // Identical mapping the home page applies before handing slides to HeroCarousel,
  // so the (unseen) component receives exactly the shape it already accepts on "/".
  const slides = rawSlides.map((s: any) => ({
    id: s.id,
    imageUrl: s.image || "/placeholder-banner-bg.jpg",
    art: Boolean(s.image),
    headline: s.headline,
    highlight: s.highlight ?? "",
    description: s.description ?? `Discover top picks in ${catName}.`,
    badge: s.badge,
    ctaLabel: s.ctaLabel,
    ctaHref: s.ctaHref || `/products/${category}`,
    products: s.products,
  }));

  return (
    <div className="container-x space-y-6 py-6">
      {slides.length > 0 && <HeroCarousel slides={slides} />}
      {brandTiles.length > 0 && (
        <CollectionGrid title={`Top Brands in ${catName}`} tiles={brandTiles} tone="plain" columns={4} />
      )}
      <DealsRail title={`Top Deals in ${catName}`} items={deals} />
      <ProductListClient
        initialProducts={toCards(products)}
        total={products.length}
        categorySlug={category}
      />
    </div>
  );
}