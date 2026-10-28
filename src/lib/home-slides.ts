import type { Prisma } from "@prisma/client";
import prisma from "./prisma";
import { discountPercent } from "./utils";

export type SlideProductVM = {
  slug: string;
  name: string;
  image: string;
  /** ONLY the admin-supplied per-slide artwork (HeroSlideProduct.image); null when the
   *  "Slide image" input was left empty, so consumers can refuse to render a fallback. */
  slideImage?: string | null;
  mrp: number;
  salePrice: number;
  discountPercent: number;
};

export type HeroSlideVM = {
  id: string;
  badge: string;
  headline: string;
  highlight?: string | null;
  description?: string | null;
  ctaLabel: string;
  ctaHref?: string | null;
  secondaryLabel?: string | null;
  secondaryHref?: string | null;
  image?: string | null;
  gradient: string;
  products: SlideProductVM[];
};

const slideProductSelect = {
  id: true,
  slug: true,
  name: true,
  mrp: true,
  salePrice: true,
  discountPercent: true,
  active: true,
  images: {
    select: {
      url: true,
      isPrimary: true,
      position: true,
    },
    orderBy: { position: "asc" as const },
  },
} satisfies Prisma.ProductSelect;

type SlideProductRow = Prisma.ProductGetPayload<{
  select: typeof slideProductSelect;
}>;

function toSlideProduct(p: SlideProductRow): SlideProductVM {
  const image =
    p.images.find((i) => i.isPrimary)?.url ??
    p.images[0]?.url ??
    `https://picsum.photos/seed/${encodeURIComponent(p.slug)}/900/900`;

  return {
    slug: p.slug,
    name: p.name,
    image,
    mrp: p.mrp,
    salePrice: p.salePrice,
    discountPercent: p.discountPercent || discountPercent(p.mrp, p.salePrice),
  };
}

async function getSlideProducts(
  where: Prisma.ProductWhereInput,
  orderBy: Prisma.ProductOrderByWithRelationInput[],
  take: number,
): Promise<SlideProductVM[]> {
  const rows = await prisma.product.findMany({
    where: {
      active: true,
      stock: { gt: 0 },
      ...where,
    },
    select: slideProductSelect,
    orderBy,
    take,
  });

  return rows.map(toSlideProduct);
}

export async function buildHeroSlides(limit = 18): Promise<HeroSlideVM[]> {
  const now = new Date();

    const [
    custom,
    newArrivals,
    hotDeals,
    bestSellers,
    accessories,
    laptops,
    mobiles,
    appliances,
    premium,
    budget,
    topRated,
    exchangeable,
  ] = await Promise.all([
    prisma.heroSlide.findMany({
      where: {
        active: true,
        kind: "CUSTOM",
        AND: [
          {
            OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          },
          {
            OR: [{ endsAt: null }, { endsAt: { gte: now } }],
          },
        ],
      },
      include: {
        products: {
          orderBy: { position: "asc" },
          include: {
            product: {
              select: slideProductSelect,
            },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
      take: limit,
    }),
    getSlideProducts({}, [{ createdAt: "desc" }], 3),
    getSlideProducts({ discountPercent: { gte: 25 } }, [{ discountPercent: "desc" }], 3),
    getSlideProducts({}, [{ sold: "desc" }, { ratingAvg: "desc" }], 3),
    getSlideProducts({ category: { slug: "accessories" } }, [{ sold: "desc" }], 3),
    getSlideProducts({ category: { slug: "laptops" } }, [{ salePrice: "desc" }], 3),
    getSlideProducts({ category: { slug: "mobiles" } }, [{ sold: "desc" }], 3),
    getSlideProducts({ category: { slug: "home-appliances" } }, [{ sold: "desc" }], 3),
    getSlideProducts({ salePrice: { gte: 50000 } }, [{ salePrice: "desc" }], 3),
    getSlideProducts({ salePrice: { lte: 15000 } }, [{ sold: "desc" }], 3),
    getSlideProducts({ ratingAvg: { gte: 4 } }, [{ ratingAvg: "desc" }], 3),
    getSlideProducts({ exchangeEligible: true }, [{ sold: "desc" }], 3),
  ]);
  const customSlides: HeroSlideVM[] = custom.map((s) => ({
    id: s.id,
    badge: s.badge,
    headline: s.headline,
    highlight: s.highlight,
    description: s.description,
    ctaLabel: s.ctaLabel,
    ctaHref: s.ctaHref,
    secondaryLabel: s.secondaryLabel,
    secondaryHref: s.secondaryHref,
    image: s.image,
    gradient: s.gradient,
    products: s.products
      .filter((sp) => sp.product.active)
         .map((sp) => {
          const base = toSlideProduct(sp.product);
          const override = sp.image?.trim() ? sp.image : null;
          // `image` keeps the gallery fallback for general consumers; `slideImage`
          // carries ONLY what the circled admin input supplied, so the hero can show
          // nothing at all when that input is empty.
          return { ...base, image: override ?? base.image, slideImage: override };
        }),
  }));

  const autoSlides: HeroSlideVM[] = [
    {
      id: "auto-new-arrivals",
      badge: "NEW ARRIVALS",
      headline: "Fresh drops,",
      highlight: "first-day pricing",
      description:
        "Latest smartphones, laptops and appliances added to VoltKart. Genuine stock, GST invoice and brand warranty.",
      ctaLabel: "Explore new arrivals",
      ctaHref: "/products/all?sort=newest",
      secondaryLabel: "View offers",
      secondaryHref: "/offers",
      gradient: "EMERALD_TECH",
      products: newArrivals,
    },
    {
      id: "auto-hot-deals",
      badge: "HOT DEALS",
      headline: "Biggest cuts,",
      highlight: "fastest moving",
      description:
        "Limited-time discounts across mobiles, laptops, appliances and accessories. Stock is live and updated in real time.",
      ctaLabel: "Shop hot deals",
      ctaHref: "/products/all?sort=discount",
      secondaryLabel: "Coupons",
      secondaryHref: "/offers",
      gradient: "SUNSET_DEAL",
      products: hotDeals,
    },
    {
      id: "auto-best-sellers",
      badge: "BEST SELLERS",
      headline: "What India is",
      highlight: "actually buying",
      description:
        "Proven picks based on orders, ratings and repeat demand. Honest pricing, no dark patterns.",
      ctaLabel: "See best sellers",
      ctaHref: "/products/all?sort=popular",
      gradient: "VIOLET_STORM",
      products: bestSellers,
    },
    {
      id: "auto-accessories",
      badge: "ADD-ONS",
      headline: "Complete the setup",
      highlight: "with smart add-ons",
      description:
        "Chargers, audio, power banks, hubs, bags and peripherals that pair well with your main purchase.",
      ctaLabel: "Browse accessories",
      ctaHref: "/products/accessories",
      gradient: "ELECTRIC_AZURE",
      products: accessories,
    },
        {
      id: "auto-laptops",
      badge: "LAPTOPS",
      headline: "Work, create, game",
      highlight: "without compromise",
      description:
        "Ultrabooks, business notebooks and gaming rigs with no-cost EMI and exchange support where eligible.",
      ctaLabel: "Explore laptops",
      ctaHref: "/products/laptops",
      secondaryLabel: "EMI offers",
      secondaryHref: "/offers",
      gradient: "STEEL_GRAPHITE",
      products: laptops,
    },
    {
      id: "auto-mobiles",
      badge: "MOBILES",
      headline: "Smartphones for",
      highlight: "every budget",
      description:
        "Latest 5G phones from top brands with launch pricing, exchange support and no-cost EMI.",
      ctaLabel: "Explore mobiles",
      ctaHref: "/products/mobiles",
      gradient: "ELECTRIC_AZURE",
      products: mobiles,
    },
    {
      id: "auto-appliances",
      badge: "HOME APPLIANCES",
      headline: "Upgrade your home,",
      highlight: "save big today",
      description:
        "ACs, refrigerators, washing machines and kitchen appliances at festival-style prices.",
      ctaLabel: "Browse appliances",
      ctaHref: "/products/home-appliances",
      gradient: "EMERALD_TECH",
      products: appliances,
    },
    {
      id: "auto-premium",
      badge: "PREMIUM PICKS",
      headline: "Flagship grade,",
      highlight: "worth every rupee",
      description:
        "Hand-picked flagships and premium laptops for buyers who want the best, no compromises.",
      ctaLabel: "See premium picks",
      ctaHref: "/products/all",
      gradient: "MIDNIGHT",
      products: premium,
    },
    {
      id: "auto-budget",
      badge: "VALUE PICKS",
      headline: "Great value,",
      highlight: "small prices",
      description:
        "Phones, audio and essentials under ₹15,000 that punch far above their price tag.",
      ctaLabel: "Shop budget picks",
      ctaHref: "/products/all",
      gradient: "SUNSET_DEAL",
      products: budget,
    },
    {
      id: "auto-top-rated",
      badge: "TOP RATED",
      headline: "Loved by",
      highlight: "thousands",
      description:
        "Products rated 4★ and above by verified buyers — the safest picks on VoltKart.",
      ctaLabel: "See top rated",
      ctaHref: "/products/all",
      gradient: "VIOLET_STORM",
      products: topRated,
    },
    {
      id: "auto-exchange",
      badge: "EXCHANGE OFFERS",
      headline: "Trade in old,",
      highlight: "bring home new",
      description:
        "Exchange-eligible products across mobiles, laptops and appliances with instant value.",
      ctaLabel: "Browse exchange deals",
      ctaHref: "/products/all",
      secondaryLabel: "How exchange works",
      secondaryHref: "/offers",
      gradient: "STEEL_GRAPHITE",
      products: exchangeable,
    },
  ];

  return [...customSlides, ...autoSlides].slice(0, limit);
}