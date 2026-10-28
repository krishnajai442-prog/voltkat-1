import prisma from "@/lib/prisma";
import { adminPage } from "@/lib/admin-page";
import { can } from "@/lib/auth/guards";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BannerManager } from "@/components/admin/BannerManager";

export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  const actor = await adminPage();
  const banners = await prisma.banner.findMany({ orderBy: [{ slot: "asc" }, { sortOrder: "asc" }] });

  return (
    <div>
      <AdminPageHeader title="Banners" subtitle="Promotional strips, category banners and sale callouts." />
      <BannerManager initial={banners.map((b) => ({ ...b, createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString() }))} canDelete={can.destroy(actor.role)} />
    </div>
  );
}