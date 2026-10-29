import prisma from "@/lib/prisma";

// ASCII-only source. \u escapes decode to real glyphs in the bundle but are plain
// bytes in the file, so no console codepage / editor can ever re-corrupt them.
// NEVER hardcode a literal · or ₹ in source again — that is the recurring mojibake.
const DOT = "\u00B7";
const RUPEE = "\u20B9";
// Known-existing public asset (page.tsx already references it) so <Image src> never gets null/empty.
const IMG_FALLBACK = "/placeholder-banner-bg.jpg";

export type HeroSlideProduct = {
  slug: string;
  name: string;
  image: string; // non-empty: HeroSlider feeds it straight to <Image src>
  salePrice: number;
  mrp: number;
  discountPercent: number;
};

// The exact contract HeroSlider.tsx imports. Field names/optionality mirror its reads.
export type HeroSlideVM = {
  id: string;
  gradient: string;
  badge: string;
  headline: string;
  highlight: string | null;
  description: string | null;
  ctaLabel: string;
  ctaHref: string | null;
  secondaryLabel: string | null;
  secondaryHref: string | null;
  products: HeroSlideProduct[];
};

export async function buildHeroSlides(take: number = 15): Promise<HeroSlideVM[]> {
  const now = new Date();

  // 1. ADMIN CAMPAIGNS FIRST — kind:"CUSTOM", active, inside the Starts/Ends window
  //    (both nullable per schema), ordered by sortOrder, attached products flattened
  //    into the HeroSlideProduct shape HeroSlider renders (main = [0], extras = [1..3)).
  const custom = await prisma.heroSlide.findMany({
    where: {
      kind: "CUSTOM",
      active: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: { sortOrder: "asc" },
    include: {
      products: {
        orderBy: { position: "asc" },
        include: {
          product: {
            select: {
              id: true, name: true, slug: true,
              salePrice: true, mrp: true, discountPercent: true,
              images: { take: 1, orderBy: { position: "asc" }, select: { url: true } },
            },
          },
        },
      },
    },
  });

  const customSlides: HeroSlideVM[] = custom.slice(0, take).map((s) => ({
    id: s.id,
    gradient: String(s.gradient),
    badge: s.badge,
    headline: s.headline,
    highlight: s.highlight ?? null,
    description: s.description ?? null,
    ctaLabel: s.ctaLabel ?? "Shop Now",
    ctaHref: s.ctaHref ?? null,
    secondaryLabel: s.secondaryLabel ?? null,
    secondaryHref: s.secondaryHref ?? null,
    products: s.products.map((jp) => ({
      slug: jp.product.slug,
      name: jp.product.name,
      image: (jp.image && jp.image.length ? jp.image : jp.product.images[0]?.url) || IMG_FALLBACK,
      salePrice: jp.product.salePrice,
      mrp: jp.product.mrp,
      discountPercent: jp.product.discountPercent ?? 0,
    })),
  }));

  // 2. AUTOMATIC CATALOG TOP-UP — fill the remainder from live in-stock products so the
  //    carousel is never thin, a brand-new active product can appear immediately, and
  //    when the admin has zero in-window campaigns this IS the whole carousel (fallback).
  const remaining = take - customSlides.length;
  if (remaining <= 0) return customSlides;

  const pool = await prisma.product.findMany({
    where: { active: true, stock: { gt: 0 } },
    select: {
      id: true, name: true, slug: true,
      salePrice: true, mrp: true, discountPercent: true,
      images: { take: 1, orderBy: { position: "asc" }, select: { url: true } },
      brand: { select: { name: true } },
      category: { select: { name: true } },
    },
    take: Math.max(remaining * 4, 24), // oversample so the shuffle has variety
  });

  const autoSlides: HeroSlideVM[] = pool
    .sort(() => Math.random() - 0.5)
    .slice(0, remaining)
    .map((p) => {
      const disc = p.discountPercent ?? (p.mrp > p.salePrice ? Math.round(((p.mrp - p.salePrice) / p.mrp) * 100) : 0);
      const sub = `${p.brand?.name ?? ""} ${p.category?.name ? DOT + " " + p.category.name : ""}`.trim();
      return {
        id: p.id,
        gradient: "MIDNIGHT",
        badge: disc > 0 ? `${disc}% OFF` : "Bestseller",
        headline: p.name,
        highlight: null,
        description: disc > 0 ? `${disc}% off ${DOT} Save ${RUPEE}${p.mrp - p.salePrice}` : sub || "Top rated in stock",
        ctaLabel: "Shop Now",
        ctaHref: `/product/${p.slug}`,
        secondaryLabel: null,
        secondaryHref: null,
        // the featured product IS the hero image (main = [0], no extras)
        products: [{
          slug: p.slug,
          name: p.name,
          image: p.images[0]?.url || IMG_FALLBACK,
          salePrice: p.salePrice,
          mrp: p.mrp,
          discountPercent: disc,
        }],
      };
    });

  return [...customSlides, ...autoSlides];
}