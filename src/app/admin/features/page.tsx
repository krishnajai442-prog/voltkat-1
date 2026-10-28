import prisma from "@/lib/prisma";
import { adminPage } from "@/lib/admin-page";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FeatureManager } from "@/components/admin/FeatureManager";
import { HOME_FEATURES } from "@/lib/home-features";

export const dynamic = "force-dynamic";

export default async function AdminFeaturesPage() {
  await adminPage();

  const [features, products] = await Promise.all([
    prisma.productFeature.findMany({
      include: { product: { select: { id: true, name: true } } },
      orderBy: { position: "asc" },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      take: 200,
      select: { id: true, name: true },
    }),
  ]);

  const bySection = Object.fromEntries(
    HOME_FEATURES.map((f) => [
      f.key,
      features
        .filter((row) => row.section === f.key)
        .map((row) => ({ id: row.product.id, name: row.product.name })),
    ]),
  );

  return (
    <div>
      <AdminPageHeader
        title="Homepage features"
        subtitle="Curate the rails on the storefront home page. Titles below match the shopper-facing headings exactly."
      />
      <FeatureManager products={products} initial={bySection} />
    </div>
  );
}