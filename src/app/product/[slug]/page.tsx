import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import prisma from "@/lib/prisma";
import { getActor } from "@/lib/auth/guards";
import { productSelect, toCards } from "@/lib/catalog";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductPurchasePanel, ProductBuyBar } from "@/components/product/ProductPurchasePanel";
import { ReviewsSection } from "@/components/product/ReviewsSection";
import { QASection } from "@/components/product/QASection";
import { FrequentlyBought } from "@/components/product/FrequentlyBought";
import { CompareBlock } from "@/components/product/CompareBlock";
import { ProductJsonLd } from "@/components/product/ProductJsonLd";
import { excerpt, siteUrl } from "@/lib/utils";
import { RelatedTicker } from "@/components/product/RelatedTicker";
import { VariantPicker } from "@/components/product/VariantPicker";
import { ProductDetails } from "@/components/product/ProductDetails";
import { RecentlyViewedRail } from "@/components/product/RecentlyViewedRail";
import { DeliveryDetails } from "@/components/product/DeliveryDetails";
import { PeaceOfMind } from "@/components/product/PeaceOfMind";
import { ProductHighlights } from "@/components/product/ProductHighlights";
import { ProductCarousel, type CarouselItem } from "@/components/product/ProductCarousel";
import { SaveCombos, type ComboPair } from "@/components/product/SaveCombos";
import { BrowseTiles, type Tile } from "@/components/product/BrowseTiles";
import { SponsoredAdCard } from "@/components/product/SponsoredAdCard";
import { DeliveryMeta } from "@/components/product/DeliveryMeta";
// import { ReviewPhotoMosaic } from "@/components/product/ReviewPhotoMosaic";
import VariantNavigator from "@/components/product/VariantNavigator";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      shortDescription: true,
      description: true,
      active: true,
      category: { select: { name: true } },
      brand: { select: { name: true } },
      images: { select: { url: true }, take: 1 },
    },
  });

  if (!product || !product.active) {
    return { title: "Product not found" };
  }

    const description = excerpt(product.description ?? product.shortDescription ?? product.name, 180);

  return {
    title: product.name,
    description,
    alternates: { canonical: siteUrl(`/product/${product.slug ?? slug}`) },
    openGraph: {
      title: product.name,
      description,
      images: product.images[0]?.url ? [{ url: product.images[0].url }] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const actor = await getActor();

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      brand: true,
      images: { orderBy: { position: "asc" } },
      specifications: { orderBy: [{ group: "asc" }, { label: "asc" }] },
      reviews: {
        where: { published: true },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { name: true } } },
      },
      questions: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          user: { select: { name: true } },
          answers: {
            orderBy: { createdAt: "asc" },
            include: { user: { select: { name: true, role: true } } },
          },
        },
      },
    },
  });

  if (!product || !product.active) notFound();

  // Sibling SKUs (same family group) drive the navigating colour/variant picker.
  const siblings = product.groupId
    ? await prisma.product.findMany({
        where: { groupId: product.groupId, active: true },
        orderBy: [{ color: "asc" }, { storage: "asc" }, { ram: "asc" }],
        include: { images: { where: { kind: "GALLERY" }, orderBy: { position: "asc" }, take: 1 } },
      })
    : [];
  const siblingItems = siblings.map((s) => ({
    id: s.id, slug: s.slug, name: s.name, color: s.color, storage: s.storage, ram: s.ram,
    salePrice: s.salePrice, mrp: s.mrp, stock: s.stock, lowStockAt: s.lowStockAt,
    image: s.images[0]?.url ?? null,
  }));

  // Sponsored tile candidates: best-selling other products in the same category.
  const adCandidates = (
    await prisma.product.findMany({
      where: {
        active: true,
        id: { not: product.id },
        ...(product.categoryId ? { categoryId: product.categoryId } : {}),
      },
      orderBy: { sold: "desc" },
      take: 8,
      select: {
        id: true, slug: true, name: true, mrp: true, salePrice: true,
        images: { where: { kind: "GALLERY" }, orderBy: { position: "asc" }, take: 1, select: { url: true } },
      },
    })
  ).map((p) => ({
    id: p.id, slug: p.slug, name: p.name, mrp: p.mrp, salePrice: p.salePrice,
    image: p.images[0]?.url ?? null,
  }));

  const carouselSelect = {
    id: true, slug: true, name: true, salePrice: true, mrp: true,
    ratingAvg: true, ratingCount: true, featured: true, sold: true,
    brand: { select: { name: true } },
    images: { select: { url: true, isPrimary: true, kind: true } },
  } as const;

   // Flat shape RelatedTicker reads (it.image / it.price / it.discountPercent). The old bare
  // findMany never loaded the images relation, so every tile hit the first-letter fallback —
  // which for "OnePlus 13" renders a capital "O" that reads as the grey circle in the shot.
  // Inline the primary-image pick: do NOT use prim/toCarousel here — they're defined after the
  // Promise.all below, so referencing them at this point is a TDZ ReferenceError.
  const related = (await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      id: { not: product.id },
      active: true,
      stock: { gt: 0 },
    },
    take: 10,
    select: {
      id: true, slug: true, name: true, salePrice: true, mrp: true, discountPercent: true,
      images: { select: { url: true, isPrimary: true } },
    },
  })).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    image: p.images.find((i) => i.isPrimary)?.url ?? p.images[0]?.url ?? undefined,
    price: p.salePrice,
    mrp: p.mrp,
    discountPercent: p.discountPercent,
  }));
  
  const pAny = product as any;
  const basePrice = Number(pAny.salePrice ?? pAny.price ?? 0);
  const baseMrp = Number(pAny.mrp ?? basePrice);
  const colors: string[] = Array.isArray(pAny.colors) ? pAny.colors : [];
  const variants: { label: string; add: number }[] = Array.isArray(pAny.variants)
    ? (pAny.variants as { label: string; add: number }[])
    : [];
  const optionGroups: any[] = Array.isArray(pAny.optionGroups) ? pAny.optionGroups : [];
  const colorOptions: any[] = Array.isArray(pAny.colorOptions) ? pAny.colorOptions : [];

  await prisma.product.update({
    where: { id: product.id },
    data: { views: { increment: 1 } },
  });

  if (actor) {
    await prisma.recentlyViewed.upsert({
      where: {
        userId_productId: {
          userId: actor.id,
          productId: product.id,
        },
      },
      create: { userId: actor.id, productId: product.id },
      update: { viewedAt: new Date() },
    });
  }

  const [
    distRows, fbtRows, peerRows,
    priceRows, brandRows, ramRows, storageRows, likeRows,
    catPoolRows, brandPoolRows,
  ] = await Promise.all([
    prisma.review.groupBy({
      by: ["rating"],
      where: { productId: product.id, published: true },
      _count: true,
    }),
    prisma.frequentlyBoughtPair.findMany({
      where: { primaryId: product.id },
      include: { addOn: { select: productSelect } },
    }),
    prisma.product.findMany({
      where: { active: true, stock: { gt: 0 }, categoryId: product.categoryId, id: { not: product.id } },
      select: { ...productSelect, slug: true },
      orderBy: [{ sold: "desc" }, { ratingAvg: "desc" }],
      take: 3,
    }),
    prisma.product.findMany({
      where: {
        active: true, stock: { gt: 0 }, id: { not: product.id }, categoryId: product.categoryId,
        salePrice: { gte: Math.round(Number(product.salePrice) * 0.8), lte: Math.round(Number(product.salePrice) * 1.25) },
      },
      select: carouselSelect, orderBy: [{ sold: "desc" }, { ratingAvg: "desc" }], take: 8,
    }),
    prisma.product.findMany({
      where: { active: true, stock: { gt: 0 }, id: { not: product.id }, brandId: product.brandId },
      select: carouselSelect, orderBy: [{ sold: "desc" }, { ratingAvg: "desc" }], take: 8,
    }),
    prisma.product.findMany({
      where: { active: true, stock: { gt: 0 }, id: { not: product.id }, categoryId: product.categoryId, ...(product.ram ? { ram: product.ram } : {}) },
      select: carouselSelect, orderBy: [{ sold: "desc" }], take: 8,
    }),
    prisma.product.findMany({
      where: { active: true, stock: { gt: 0 }, id: { not: product.id }, categoryId: product.categoryId, ...(product.storage ? { storage: product.storage } : {}) },
      select: carouselSelect, orderBy: [{ sold: "desc" }], take: 8,
    }),
    prisma.product.findMany({
      where: { active: true, stock: { gt: 0 }, id: { not: product.id }, OR: [{ featured: true }, { categoryId: product.categoryId }] },
      select: carouselSelect, orderBy: [{ sold: "desc" }, { ratingAvg: "desc" }], take: 8,
    }),
    prisma.product.findMany({
      where: { active: true, stock: { gt: 0 }, category: { id: { not: product.categoryId } } },
      select: { id: true, salePrice: true, mrp: true, sold: true, images: { select: { url: true, isPrimary: true } }, category: { select: { slug: true, name: true } } },
      orderBy: [{ sold: "desc" }], take: 40,
    }),
    prisma.product.findMany({
      where: { active: true, stock: { gt: 0 } },
      select: { id: true, salePrice: true, mrp: true, ratingAvg: true, sold: true, images: { select: { url: true, isPrimary: true } }, brand: { select: { name: true } } },
      orderBy: [{ sold: "desc" }], take: 60,
    }),
  ]);

  const reviewVMs = product.reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    images: r.images,
    author: r.user?.name ?? "Verified Buyer",
    verified: r.verified,
    at: r.createdAt.toISOString(),
    helpful: r.helpfulCount,
  }));

  const questionVMs = product.questions.map((q) => ({
    id: q.id,
    body: q.body,
    askedAt: q.createdAt.toISOString(),
    asker: q.user?.name ?? "Anonymous",
    answers: q.answers.map((a) => ({
      id: a.id,
      body: a.body,
      author:
        a.user?.role === "ADMIN" || a.user?.role === "MANAGER" || a.user?.role === "STAFF"
          ? "VoltKart"
          : a.user?.name ?? "Customer",
      official: a.isOfficial || a.user?.role !== "CUSTOMER",
      at: a.createdAt.toISOString(),
    })),
  }));

  const addOns = toCards(fbtRows.map((p) => p.addOn));
  const peers = toCards(peerRows);

  const galleryImgs = product.images.filter((i) => (i.kind ?? "GALLERY") === "GALLERY");
  const primaryImage = galleryImgs.find((i) => i.isPrimary)?.url ?? galleryImgs[0]?.url ?? "";

   const prim = (r: { images?: { url: string; isPrimary: boolean; kind?: string }[] }) => {
    const g = (r.images ?? []).filter((i) => (i.kind ?? "GALLERY") === "GALLERY");
    return g.find((i) => i.isPrimary)?.url ?? g[0]?.url ?? null;
  };
  const toCarousel = (r: any, _i: number, all: any[]): CarouselItem => ({
    id: r.id, slug: r.slug, name: r.name, brand: r.brand?.name ?? null, image: prim(r),
    price: r.salePrice, mrp: r.mrp, rating: r.ratingAvg, ratingCount: r.ratingCount,
    badge: r.featured ? "trending" : (all.indexOf(r) === 0 && (r.sold ?? 0) > 0 ? "bestseller" : null),
  });
  const priceItems = priceRows.map((r, i) => toCarousel(r, i, priceRows));
  const brandItems = brandRows.map((r, i) => toCarousel(r, i, brandRows));
  const ramItems = ramRows.map((r, i) => toCarousel(r, i, ramRows));
  const storageItems = storageRows.map((r, i) => toCarousel(r, i, storageRows));
  const likeItems = likeRows.map((r, i) => toCarousel(r, i, likeRows));

  // Recently Viewed (login-gated): built from productId + a second product query so it
  // never depends on relation names and can't 500. Placed after toCarousel (no TDZ).
  let recentItems: CarouselItem[] = [];
  if (actor) {
    try {
      const rows = await prisma.recentlyViewed.findMany({
        where: { userId: actor.id },
        orderBy: { viewedAt: "desc" },
        take: 8,
        select: { productId: true },
      });
      const ids = rows.map((r) => r.productId);
      if (ids.length > 0) {
        const prods = await prisma.product.findMany({
          where: { id: { in: ids } },
          select: carouselSelect,
        });
        const byId = new Map(prods.map((p) => [p.id, p]));
        const ordered = ids
          .map((id) => byId.get(id))
          .filter((p): p is NonNullable<typeof p> => Boolean(p));
        recentItems = ordered.map((r, i) => toCarousel(r, i, ordered));
      }
    } catch {
      recentItems = [];
    }
  }

  const currentCard: CarouselItem = toCarousel(product as any, 0, []);

  const comboPairs: ComboPair[] = fbtRows.map((row: any) => ({
    primary: { name: product.name, image: primaryImage, price: Number(product.salePrice), slug: product.slug },
    addOn: { name: row.addOn?.name, image: prim(row.addOn ?? { images: [] }), price: row.addOn?.salePrice, slug: row.addOn?.slug },
  }));

  const groupBest = (rows: any[], key: (r: any) => string | null) => {
    const m = new Map<string, any[]>();
    for (const r of rows) { const k = key(r); if (!k) continue; (m.get(k) ?? m.set(k, []).get(k)!).push(r); }
    return m;
  };
  const disc = (r: any) => (r.mrp && r.salePrice && r.mrp > r.salePrice ? Math.round(((r.mrp - r.salePrice) / r.mrp) * 100) : 0);
  const interestTiles: Tile[] = [...groupBest(catPoolRows, (r) => r.category?.slug ?? null).entries()]
    .filter(([s]) => s !== product.category?.slug)
    .map(([s, rs]) => {
      const best = rs.slice().sort((a, b) => disc(b) - disc(a))[0]!;
      const maxOff = Math.max(...rs.map(disc));
      return { title: best.category?.name ?? s, subtitle: maxOff > 0 ? `Up to ${maxOff}% Off` : "Explore", image: prim(best), href: `/products/${s}` };
    })
    .slice(0, 4);
  const tryTiles: Tile[] = [...groupBest(brandPoolRows, (r) => r.brand?.name ?? null).entries()]
    .map(([name, rs]) => {
      const best = rs.slice().sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0))[0]!;
      const topRated = Math.max(0, ...rs.map((x) => x.ratingAvg ?? 0));
      const sub = topRated >= 4.5 ? "Top rated" : (best.sold ?? 0) > 0 ? "Best sellers" : "Explore";
      return { title: name, subtitle: sub, image: prim(best), href: `/products/all?q=${encodeURIComponent(name)}` };
    })
    .slice(0, 4);

  // Delivery ETA (same 3–5 day horizon DeliveryDetails promises).
  const etaDate = new Date(Date.now() + 4 * 864e5);
  const etaShort = etaDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const etaLong = etaDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });

  return (
    <div className="mx-auto w-full max-w-[1280px] px-3 py-6 pb-32 sm:px-4 lg:px-5 md:pb-24">
      <ProductJsonLd product={product} reviews={reviewVMs} />

      {/* MOBILE — sponsored tile comes first, above the image (Flipkart mobile order) */}
      <div className="mb-4 md:hidden">
        <SponsoredAdCard seed={product.id} products={adCandidates} />
      </div>

      <div className="grid gap-6 rounded-xl bg-white p-4 shadow-sm md:grid-cols-[minmax(0,32rem)_1fr] md:p-6 lg:grid-cols-[minmax(0,34rem)_1fr]">
        <div className="space-y-4">
          <ProductGallery
            images={product.images.filter((im) => (im.kind ?? "GALLERY") === "GALLERY")}
            name={product.name}
            productId={product.id}
            ratingAvg={product.ratingAvg}
            ratingCount={product.ratingCount}
          />
        </div>

        <div className="min-w-0 space-y-5">
          {/* DESKTOP — sponsored tile at the top of the right column; hidden on mobile (shown above) */}
          <div className="hidden md:block">
            <SponsoredAdCard seed={product.id} products={adCandidates} />
          </div>

          {/* Colour + variant sit directly under the image on mobile, under the ad on desktop */}
          {siblingItems.length > 1 ? (
            <VariantNavigator siblings={siblingItems} currentId={product.id} />
          ) : (
            <VariantPicker
              colors={colors}
              variants={variants}
              optionGroups={optionGroups}
              colorOptions={colorOptions}
              basePrice={basePrice}
              baseMrp={baseMrp}
              name={product.name}
              brand={product.brand.name}
              storage={product.storage}
              ram={product.ram}
            />
          )}

          <div className="space-y-2">
            <h1 className="font-display text-[17px] font-bold leading-snug text-gray-900 md:text-[19px]">
              {product.name}
              {product.ram ? ` (${product.ram} RAM)` : ""}
            </h1>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-[12.5px] font-bold text-gray-800">
                {Number(product.ratingAvg).toFixed(1)} <Star className="size-3 fill-current text-emerald-600" />
              </span>
              <span className="text-[12.5px] text-gray-500">| {Number(product.ratingCount).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[16px] font-bold text-emerald-600">↓{product.discountPercent}%</span>
              <span className="text-[15px] text-gray-400 line-through">₹{Number(product.mrp).toLocaleString("en-IN")}</span>
              <span className="font-display text-[24px] font-bold text-gray-900">₹{Number(product.salePrice).toLocaleString("en-IN")}</span>
            </div>
          </div>

          <ProductPurchasePanel
            id={product.id}
            slug={product.slug}
            name={product.name}
            brand={product.brand.name}
            category={product.category.name}
            subtype={product.subtype}
            mrp={product.mrp}
            salePrice={product.salePrice}
            discountPercent={product.discountPercent}
            hidePrice
            stock={product.stock}
            lowStockAt={product.lowStockAt}
            ratingAvg={product.ratingAvg}
            ratingCount={product.ratingCount}
            warrantyMonths={product.warrantyMonths}
            returnableDays={product.returnableDays}
            emiEligible={product.emiEligible}
            codEligible={product.codEligible}
            exchangeEligible={product.exchangeEligible}
            ram={product.ram}
            storage={product.storage}
            screenSize={product.screenSize}
            processor={product.processor}
            color={product.color}
            shortDescription={(product.description ?? product.shortDescription ?? product.name ?? "").slice(0, 160)}
          />

          <DeliveryDetails returnableDays={product.returnableDays} />

          <DeliveryMeta etaLong={etaLong} />

          <PeaceOfMind
            brandName={product.brand.name}
            warrantyMonths={product.warrantyMonths}
            returnableDays={product.returnableDays}
            codEligible={product.codEligible}
          />

          <ProductHighlights
            ram={product.ram}
            storage={product.storage}
            processor={product.processor}
            screenSize={product.screenSize}
            color={product.color}
            warrantyMonths={product.warrantyMonths}
            returnableDays={product.returnableDays}
          />

          <ProductDetails
            name={product.name}
            brandName={product.brand.name}
            categoryName={product.category.name}
            subtype={product.subtype}
            color={product.color}
            ram={product.ram}
            storage={product.storage}
            screenSize={product.screenSize}
            processor={product.processor}
            warrantyMonths={product.warrantyMonths}
            returnableDays={product.returnableDays}
            images={product.images}
            specifications={product.specifications}
            description={product.description}
          />

          <ProductBuyBar
            id={product.id}
            name={product.name}
            salePrice={product.salePrice}
            stock={product.stock}
          />
        </div>
      </div>

      {/* MOBILE — related strip moved BELOW the product card (was above the ad) */}
      {related.length > 0 && (
        <div className="mt-6 md:hidden">
        <RelatedTicker items={related} />
        </div>
      )}

      <div className="mt-6 space-y-6">
        <RecentlyViewedRail current={currentCard} serverItems={recentItems} eta={etaShort} />

        {/* <ReviewPhotoMosaic reviews={reviewVMs} /> */}

        <ReviewsSection
          productId={product.id}
          ratingAvg={product.ratingAvg}
          ratingCount={product.ratingCount}
          reviews={reviewVMs}
        />

        <QASection productId={product.id} questions={questionVMs} />

        <SaveCombos pairs={comboPairs} />

        {addOns.length > 0 && (
          <FrequentlyBought
            primary={{
              id: product.id,
              slug: product.slug,
              name: product.name,
              image: primaryImage,
              salePrice: product.salePrice,
            }}
            addOns={addOns}
          />
        )}

        {peers.length > 0 && (
          <CompareBlock
            base={{
              slug: product.slug,
              name: product.name,
              price: product.salePrice,
              rating: product.ratingAvg,
              ram: product.ram,
              storage: product.storage,
              screen: product.screenSize,
              processor: product.processor,
              warranty: product.warrantyMonths,
              image: primaryImage,
            }}
            peers={peers.map((p) => ({
              slug: p.slug,
              name: p.name,
              price: p.salePrice,
              rating: p.ratingAvg,
              ram: p.ram,
              storage: p.storage,
              screen: p.screenSize,
              processor: p.processor,
              warranty: p.warrantyMonths,
              image: p.image,
            }))}
          />
        )}

        <ProductCarousel title={`Similar from ${product.brand?.name ?? "this brand"}`} items={brandItems} eta={etaShort} />
        {product.ram ? <ProductCarousel title={`Similar with ${product.ram} RAM`} items={ramItems} eta={etaShort} /> : null}
        {product.storage ? <ProductCarousel title={`Similar with ${product.storage}`} items={storageItems} eta={etaShort} /> : null}
        <ProductCarousel title="You may also like" items={likeItems} eta={etaShort} />
        <BrowseTiles title="You can also try" tiles={tryTiles} />
        <BrowseTiles title="You might be interested in" tiles={interestTiles} />
      </div>
    </div>
  );
}