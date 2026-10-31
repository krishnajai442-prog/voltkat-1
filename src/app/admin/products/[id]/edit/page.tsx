import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { adminPage } from "@/lib/admin-page";
import { can } from "@/lib/auth/guards";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProductForm } from "@/components/admin/ProductForm";
import { ProductDetailEditors } from "@/components/admin/ProductDetailEditors";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await adminPage();
  const { id } = await params;

  const [product, categories, brands] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: "asc" } },
        specifications: { orderBy: [{ group: "asc" }, { label: "asc" }] },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
        prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, categories: true } }),
  ]);

  if (!product) notFound();

  return (
    <div>
      <AdminPageHeader title="Edit product" subtitle={product.name} />
      <ProductForm
        categories={categories}
        brands={brands}
        productId={product.id}
        canDelete={can.destroy(actor.role)}
        footer={<ProductDetailEditors key="product-detail-editors" description={product.description ?? ""} />}
        initial={{
          name: product.name,
          slug: product.slug,
          shortDescription: product.shortDescription ?? "",
          categoryId: product.categoryId,
          brandId: product.brandId,
          mrp: product.mrp,
          salePrice: product.salePrice,
          stock: product.stock,
          lowStockAt: product.lowStockAt,
          subtype: product.subtype ?? "",
          groupId: product.groupId ?? "",
          ram: product.ram ?? "",
          storage: product.storage ?? "",
          screenSize: product.screenSize ?? "",
          processor: product.processor ?? "",
          color: product.color ?? "",
          warrantyMonths: product.warrantyMonths,
          codEligible: product.codEligible,
          emiEligible: product.emiEligible,
          exchangeEligible: product.exchangeEligible,
          featured: product.featured,
          active: product.active,
          hsnCode: product.hsnCode ?? "",
          tags: product.tags.join(", "),
              images: product.images
              .filter((i) => (i.kind ?? "GALLERY") === "GALLERY")
              .map((i) => ({ url: i.url, alt: i.alt ?? "" })),
         specifications: product.specifications
              .filter((s) => (s.kind ?? "SPEC") === "SPEC")
              .map((s) => ({ group: s.group, label: s.label, value: s.value })),
         // NEW — seed the options editor from the product row
          colors: (product as any).colorOptions ?? (product as any).colors ?? [],
          variants: (product as any).variants ?? [],
          optionGroups: (product as any).optionGroups ?? [],
       }}
      />
     </div>
  );
}