import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { productSelect, toCards } from "@/lib/catalog";
import type { CardVM } from "@/lib/catalog";
import { FEATURE_KEYS, type FeatureKey } from "@/lib/home-features";
import { buildHeroSlides } from "@/lib/home-slides";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { FlipkartGrid } from "@/components/home/FlipkartGrid";
import { DynamicRails } from "@/components/home/DynamicRails";
import { InfiniteProductFeed } from "@/components/home/InfiniteProductFeed";
import { getSuggested, getCategoryCollections, getDealTiles, getBrandSpotlight } from "@/lib/home-discovery";
import { CollectionGrid } from "@/components/home/CollectionGrid";
import { CategoryDealRow } from "@/components/home/CategoryDealRow";
import { BrandSpotlight } from "@/components/home/BrandSpotlight";
import { ProductGrid } from "@/components/home/ProductGrid";
import { ServiceIconRow } from "@/components/home/ServiceIconRow";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Shop Online",
  description: "India's premier destination for electronics.",
};

export default async function HomePage() {
  // Hero / sponsored slides
  const rawSlides = await buildHeroSlides(20);
  const slides = rawSlides.map((s: any) => ({
    id: s.id ?? "",
    imageUrl: s.image || s.imageUrl || "/placeholder-banner-bg.jpg",
    art: Boolean(s.image),
    headline: s.headline || s.title || "Mega Tech Sale",
    highlight: s.highlight || s.subtitle || "",
    description:
      s.description ||
      s.body ||
      "Limited-time discounts across mobiles, laptops, appliances and accessories.",
    badge: s.badge || null,
    ctaLabel: s.ctaLabel || s.buttonText || "Shop Now",
    ctaHref: s.ctaHref || s.link || "/products/all?sort=discount",
    products: s.products ?? [],
  }));

  // Initial SSR batch for the infinite "Suggested For You" feed
  const initialFeed = await prisma.product.findMany({
    where: { active: true, stock: { gt: 0 } },
    select: productSelect,
    orderBy: [{ ratingAvg: "desc" }, { sold: "desc" }],
    take: 12,
  });

  // Mixed pool feeding the Wishlist + Suggested rails inside DynamicRails
  const mixedPool = await prisma.product.findMany({
    where: { active: true, stock: { gt: 0 } },
    select: productSelect,
    take: 24,
  });

  // Deals / New / Best rails (fallback pools when curation is empty)
  const [deals, newArrivals, bestSellers] = await Promise.all([
    prisma.product.findMany({
      where: { active: true, discountPercent: { gte: 20 } },
      select: productSelect,
      take: 10,
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      select: productSelect,
      take: 10,
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { sold: "desc" },
      select: productSelect,
      take: 10,
    }),
  ]);

  // Discovery datasets
  const [suggested, catCollections, dealTiles, brandSpot] = await Promise.all([
    getSuggested(12),
    getCategoryCollections(4),
    getDealTiles(6),
    getBrandSpotlight(4),
  ]);

  // Curated rails: per-section product lists saved from /admin/features.
  // DynamicRails prefers these (order preserved) over the shuffled pool fallback.
  const curation = await prisma.productFeature.findMany({
    include: { product: { select: productSelect } },
    orderBy: [{ section: "asc" }, { position: "asc" }],
  });

  const curatedBySection = curation.reduce<Partial<Record<FeatureKey, CardVM[]>>>(
    (acc, row) => {
      if (!FEATURE_KEYS.includes(row.section as FeatureKey)) return acc;
      const card = toCards([row.product])[0];
      if (!card) return acc;
      const key = row.section as FeatureKey;
      (acc[key] ??= []).push(card);
      return acc;
    },
    {},
  );

  return (
    <div className="min-h-screen bg-[#f1f3f6] pb-20 md:pb-0">
      {/* A. HERO CAROUSEL (sponsored/AD slides — first, unmodified) */}
      <section className="container-x mt-8 mb-10">
        <HeroCarousel slides={slides} />
      </section>

      {/* B. CATEGORY-DEAL TILES (horizontal "jump in" strip) */}
      <section className="container-x mb-6">
        <CategoryDealRow title="Today's deals ⚡" items={dealTiles} />
      </section>

      {/* C. DYNAMIC RAILS (curated-first, shuffled fallback) */}
      <DynamicRails
        deals={toCards(deals)}
        newArrivals={toCards(newArrivals)}
        bestSellers={toCards(bestSellers)}
        allProducts={toCards(mixedPool)}
        curated={curatedBySection}
      />

      {/* D. POPULAR PICKS (tinted collection grid) */}
      <section className="container-x mt-6">
        <CollectionGrid title="Popular picks" tiles={catCollections} tone="green" columns={2} />
      </section>

      {/* E. SERVICE ICON ROW */}
      <section className="container-x mt-6">
        <ServiceIconRow />
      </section>

      {/* F. CATEGORY GRID */}
      <FlipkartGrid />

      {/* G. MORE PRODUCTS FOR YOU (3-col grid, distinct from infinite feed heading) */}
      <section className="container-x mt-6">
        <ProductGrid title="More products for you" items={suggested} />
      </section>

      {/* H. BRANDS IN SPOTLIGHT */}
      <section className="container-x mt-6">
        <BrandSpotlight title="Brands in Spotlight" items={brandSpot} />
      </section>

      {/* I. LOWEST PRICES (second tinted collection grid) */}
      <section className="container-x mt-6">
        <CollectionGrid
          title="Lowest Prices in the year"
          tiles={catCollections}
          tone="peach"
          columns={2}
        />
      </section>

      {/* J. INFINITE SCROLL FEED ("Suggested For You") */}
      <InfiniteProductFeed initialProducts={toCards(initialFeed)} />
    </div>
  );
}