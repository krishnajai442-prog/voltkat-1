import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { adminPage } from "@/lib/admin-page";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StockEditor } from "@/components/admin/StockEditor";
import { ProductRowActions } from "@/components/admin/ProductRowActions";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { inr } from "@/lib/utils";
import { can } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await adminPage();
  const sp = await searchParams;

  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const stock = typeof sp.stock === "string" ? sp.stock : "";

  const where: any = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { brand: { name: { contains: q, mode: "insensitive" } } },
      { tags: { hasSome: q.split(/\s+/).filter(Boolean) } },
    ];
  }
  if (category) where.category = { slug: category };

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        category: { select: { name: true, slug: true } },
        brand: { select: { name: true, slug: true } },
        images: { where: { kind: "GALLERY" }, orderBy: [{ isPrimary: "desc" }, { position: "asc" }], select: { url: true, isPrimary: true }, take: 1 },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);

  const filtered = products.filter((p) => {
    if (stock === "low") return p.stock > 0 && p.stock <= p.lowStockAt;
    if (stock === "out") return p.stock === 0;
    if (stock === "active") return p.active;
    if (stock === "inactive") return !p.active;
    return true;
  });

  return (
    <div>
      <AdminPageHeader
        title="Products"
        subtitle="Catalogue, pricing, inventory and publication state."
        actionHref="/admin/products/new"
        actionLabel="Add product"
      />

      <form className="card mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_14rem_14rem_auto] sm:items-end">
        <Input label="Search" name="q" defaultValue={q} placeholder="Name, brand, tag…" />
        <Select label="Category" name="category" defaultValue={category}>
          <option value="">All</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </Select>
        <Select label="Stock" name="stock" defaultValue={stock}>
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </Select>
        <button
          type="submit"
          className="h-12 rounded-xl bg-ink-900 px-5 text-[13.5px] font-bold text-white hover:bg-electric-600"
        >
          Apply
        </button>
      </form>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[68rem] text-[13px]">
            <thead className="bg-canvas text-left text-[11px] font-bold uppercase tracking-wider text-ink-300">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {filtered.map((p) => {
                const image = p.images[0]?.url ?? "https://picsum.photos/seed/vk/200/200";
                return (
                  <tr key={p.id} className="hover:bg-canvas/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-canvas">
                     {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={image} alt={p.name} className="size-full object-contain p-1" />
                        </span>
                        <div className="min-w-0">
                          <Link href={`/admin/products/${p.id}/edit`} className="block truncate font-bold text-ink-900 hover:text-electric-600">
                            {p.name}
                          </Link>
                          <p className="truncate text-[11.5px] text-ink-400">
                            {p.brand.name} · /{p.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-700">{p.category.name}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold tabular-nums text-ink-900">{inr(p.salePrice)}</p>
                      {p.mrp > p.salePrice && (
                        <p className="text-[11.5px] text-ink-300 line-through tabular-nums">{inr(p.mrp)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StockEditor productId={p.id} stock={p.stock} lowStockAt={p.lowStockAt} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone={p.active ? "save" : "neutral"}>{p.active ? "Active" : "Inactive"}</Badge>
                        {p.featured && <Badge tone="violet">Featured</Badge>}
                        {p.stock === 0 && <Badge tone="deal">Out</Badge>}
                        {p.stock > 0 && p.stock <= p.lowStockAt && <Badge tone="warn">Low</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ProductRowActions
                        productId={p.id}
                        active={p.active}
                        canDelete={can.destroy(actor.role)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}