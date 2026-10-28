import { GradientTheme, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const slides = [
  {
    id: "seed-slide-launch",
    badge: "NEW ARRIVALS",
    headline: "India's newest,",
    highlight: "tech drops",
    description:
      "iPhone 16 series, Galaxy S25 Ultra and OnePlus 13 are live with launch pricing and exchange support.",
    ctaLabel: "Shop new arrivals",
    ctaHref: "/products/all?sort=newest",
    secondaryLabel: "See offers",
    secondaryHref: "/offers",
    gradient: GradientTheme.EMERALD_TECH,
    sortOrder: 1,
    productSlugs: [
      "apple-iphone-16-pro-256gb-desert-titanium",
      "samsung-galaxy-s25-ultra-512gb-titanium-black",
      "oneplus-13-16gb-512gb-black-obsidian",
    ],
  },
  {
    id: "seed-slide-sale",
    badge: "MEGA SALE",
    headline: "Big savings on,",
    highlight: "daily essentials",
    description:
      "ACs, refrigerators, washing machines and kitchen appliances at festival-style prices.",
    ctaLabel: "Browse appliances",
    ctaHref: "/products/home-appliances",
    secondaryLabel: "Coupons",
    secondaryHref: "/offers",
    gradient: GradientTheme.SUNSET_DEAL,
    sortOrder: 2,
    productSlugs: [
      "samsung-1-5-ton-3-star-inverter-split-ac",
      "lg-260l-3-star-double-door-refrigerator",
      "preethi-mixer-grinder-750w-blue-leaf",
    ],
  },
  {
    id: "seed-slide-emi",
    badge: "NO-COST EMI",
    headline: "Own it today,",
    highlight: "pay in EMIs",
    description:
      "Selected laptops and flagships available on 3, 6, 9 and 12-month no-cost EMI plans.",
    ctaLabel: "Explore laptops",
    ctaHref: "/products/laptops",
    secondaryLabel: "EMI offers",
    secondaryHref: "/offers",
    gradient: GradientTheme.STEEL_GRAPHITE,
    sortOrder: 3,
    productSlugs: [
      "apple-macbook-air-13-m3-16gb-512gb-midnight",
      "dell-xps-13-9350-core-ultra-7-16gb-512gb",
      "asus-rog-strix-g16-rtx-5070-i9-32gb-1tb",
    ],
  },
];

async function main() {
  console.log("Refreshing VoltKart hero slides...");

  for (const slide of slides) {
    const products = await prisma.product.findMany({
      where: {
        slug: {
          in: slide.productSlugs,
        },
        active: true,
      },
      select: {
        id: true,
        slug: true,
      },
    });

    if (!products.length) {
      console.warn(`Skipping ${slide.id}: no matching active products found.`);
      continue;
    }

    const order = new Map(slide.productSlugs.map((slug, index) => [slug, index]));

    const sorted = products
      .sort(
        (a, b) =>
          (order.get(a.slug) ?? 999) - (order.get(b.slug) ?? 999),
      )
      .slice(0, 3);

    await prisma.heroSlide.upsert({
      where: { id: slide.id },
      update: {
        kind: "CUSTOM",
        active: true,
        badge: slide.badge,
        headline: slide.headline,
        highlight: slide.highlight,
        description: slide.description,
        ctaLabel: slide.ctaLabel,
        ctaHref: slide.ctaHref,
        secondaryLabel: slide.secondaryLabel,
        secondaryHref: slide.secondaryHref,
        gradient: slide.gradient,
        sortOrder: slide.sortOrder,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 90 * 86400000),
      },
      create: {
        id: slide.id,
        kind: "CUSTOM",
        active: true,
        badge: slide.badge,
        headline: slide.headline,
        highlight: slide.highlight,
        description: slide.description,
        ctaLabel: slide.ctaLabel,
        ctaHref: slide.ctaHref,
        secondaryLabel: slide.secondaryLabel,
        secondaryHref: slide.secondaryHref,
        gradient: slide.gradient,
        sortOrder: slide.sortOrder,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 90 * 86400000),
      },
    });

    await prisma.heroSlideProduct.deleteMany({
      where: { slideId: slide.id },
    });

    await prisma.heroSlideProduct.createMany({
      data: sorted.map((product, position) => ({
        slideId: slide.id,
        productId: product.id,
        position,
      })),
    });

    console.log(`Updated slide: ${slide.id}`);
  }

  console.log("Hero slides refreshed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });