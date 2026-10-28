import prisma from "@/lib/prisma";
import { SpecEditor } from "@/components/admin/SpecEditor";
import { ImageListEditor } from "@/components/admin/ImageListEditor";

export const dynamic = "force-dynamic";

export default async function AdminProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      specifications: { orderBy: [{ kind: "asc" }, { group: "asc" }, { label: "asc" }] },
      images: { orderBy: { position: "asc" } },
    },
  });
  if (!product) return <p className="p-6 text-[13px] text-gray-500">Product not found.</p>;

  const byKind = (k: string) => product.specifications.filter((s) => (s.kind ?? "SPEC") === k);
  const banners = product.images.filter((im) => (im.kind ?? "GALLERY") === "SHOWCASE");

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="space-y-2"><h2 className="font-display text-[15px] font-bold text-gray-900">{title}</h2>{children}</section>
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="font-display text-xl font-bold text-gray-900">Product details — {product.name}</h1>
      <Section title="Specifications"><SpecEditor productId={product.id} kind="SPEC" initial={byKind("SPEC")} /></Section>
      <Section title="Warranty"><SpecEditor productId={product.id} kind="WARRANTY" initial={byKind("WARRANTY")} /></Section>
      <Section title="Manufacturer Info"><SpecEditor productId={product.id} kind="MFG" initial={byKind("MFG")} /></Section>
      <Section title="Showcase banners"><ImageListEditor productId={product.id} initial={banners} /></Section>
    </div>
  );
}