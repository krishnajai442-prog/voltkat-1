import prisma from "@/lib/prisma";
import { adminPage } from "@/lib/admin-page";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProductForm } from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await adminPage();
  const [categories, brands] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
        prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, categories: true } }),
  ]);

  return (
    <div>
      <AdminPageHeader title="Add product" subtitle="Create a new SKU with pricing, inventory and specs." />
      <ProductForm categories={categories} brands={brands} />
    </div>
  );
}