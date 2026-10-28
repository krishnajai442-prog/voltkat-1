import prisma from "@/lib/prisma";
import { adminPage } from "@/lib/admin-page";
import { can } from "@/lib/auth/guards";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SlideManager } from "@/components/admin/SlideManager";

export const dynamic = "force-dynamic";

export default async function AdminSlidesPage() {
  const actor = await adminPage();

  const [slides, products] = await Promise.all([
    prisma.heroSlide.findMany({
      where: { kind: "CUSTOM" },
      orderBy: { sortOrder: "asc" },
      include: { products: { orderBy: { position: "asc" }, include: { product: { select: { id: true, name: true } } } } },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      take: 200,
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <AdminPageHeader title="Hero slides" subtitle="Campaign slides appended before automatic catalog slides." />
      <SlideManager
        initial={slides.map((s) => ({
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
          active: s.active,
          sortOrder: s.sortOrder,
          startsAt: s.startsAt?.toISOString() ?? null,
          endsAt: s.endsAt?.toISOString() ?? null,
          productIds: s.products.map((p) => p.productId),
          productImages: Object.fromEntries(s.products.map((p) => [p.productId, p.image ?? ""])),
        }))}
        products={products}
        canDelete={can.destroy(actor.role)}
      />
    </div>
  );
}