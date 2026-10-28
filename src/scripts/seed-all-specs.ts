import { PrismaClient } from "@prisma/client";
import { APPLIANCE_TEMPLATES, PHONE_TEMPLATES } from "../../prisma/spec-templates";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    include: { brand: true, category: true },
  });

  for (const product of products) {
    // Determine template based on category slug or product name
    const cat = product.category.slug.toLowerCase();
    let template;
    if (cat.includes("wash") || product.name.toLowerCase().includes("washing")) {
      template = APPLIANCE_TEMPLATES["washing-machine"];
    } else if (cat.includes("phone") || cat.includes("mobile") || (product.subtype ?? "").includes("Smartphone")) {
      template = PHONE_TEMPLATES.smartphone;
    } else {
      continue; // skip categories without templates yet
    }

    // Replace placeholders with actual product data
    const specs = template.map((spec) => ({
      productId: product.id,
      group: spec.group,
      label: spec.label,
      value: spec.value
        .replace("{brand}", product.brand.name)
        .replace("{subtype}", product.subtype ?? product.name)
        .replace("{categoryName}", product.category.name)
        .replace("{screenSize}", product.screenSize ?? "—")
        .replace("{processor}", product.processor ?? "—")
        .replace("{ram}", product.ram ?? "—")
        .replace("{storage}", product.storage ?? "—")
        .replace("{warrantyMonths}", String(product.warrantyMonths)),
    }));

    // Delete old specs for this product, then insert fresh ones
    await prisma.productSpecification.deleteMany({ where: { productId: product.id } });
    await prisma.productSpecification.createMany({ data: specs });
    console.log(`✓ Seeded ${specs.length} specs for ${product.name}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());