import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  await p.banner.upsert({
    where: { id: "promo-strip-seed" },
    update: {},
    create: {
      id: "promo-strip-seed",
      slot: "PROMO_STRIP",
      title: "Galaxy Book4",
      subtitle: "From ₹45,990*",
      imageUrl: "https://rukminim1.flixcart.com/image/300/300/xifa0000/samsung-galaxy-book4.jpg",
      ctaHref: "/products/all?q=galaxy",
      ctaLabel: "Shop Now",
      sortOrder: 0,
      active: true,
    },
  });
  console.log("✓ Sponsored strip seeded");
}
main().finally(() => p.$disconnect());
