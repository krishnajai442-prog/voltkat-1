import prisma from "@/lib/prisma";
import { adminPage } from "@/lib/admin-page";
import { can } from "@/lib/auth/guards";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CouponManager } from "@/components/admin/CouponManager";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const actor = await adminPage();

  const [coupons, categories, brands] = await Promise.all([
    prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <AdminPageHeader title="Coupons" subtitle="Percentage/fixed discounts, usage caps, scopes and broadcasts." />
      <CouponManager
        initial={coupons.map((c) => ({
          id: c.id,
          code: c.code,
          description: c.description,
          type: c.type,
          value: c.value,
          scope: c.scope,
          categoryId: c.categoryId,
          brandId: c.brandId,
          categoryName: c.category?.name ?? null,
          brandName: c.brand?.name ?? null,
          minOrderValue: c.minOrderValue,
          maxDiscount: c.maxDiscount,
          usageLimit: c.usageLimit,
          usedCount: c.usedCount,
          perUserLimit: c.perUserLimit,
          active: c.active,
          startsAt: c.startsAt.toISOString(),
          endsAt: c.endsAt?.toISOString() ?? null,
        }))}
        categories={categories}
        brands={brands}
        canDelete={can.destroy(actor.role)}
      />
    </div>
  );
}