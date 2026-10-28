// import type { Metadata } from "next";
// import Link from "next/link";
// import { SlidersHorizontal } from "lucide-react";
// import prisma from "@/lib/prisma";
// import { loadFacets, searchProducts, SORT_OPTIONS, PRICE_BUCKETS } from "@/lib/catalog";
// import { searchQuerySchema } from "@/lib/validators";
// import { ProductCard } from "@/components/product/ProductCard";
// import { SectionHeading } from "@/components/ui/SectionHeading";
// import { EmptyState } from "@/components/ui/EmptyState";
// import { Badge } from "@/components/ui/Badge";
// import { cn, inr } from "@/lib/utils";

// export const dynamic = "force-dynamic";

// type SP = Record<string, string | string[] | undefined>;

// function first(v: string | string[] | undefined): string | undefined {
//   if (Array.isArray(v)) return v[0];
//   return v;
// }

// function buildHref(category: string, current: SP, overrides: Record<string, string | number | null | undefined>) {
//   const params = new URLSearchParams();

//   for (const [k, v] of Object.entries(current)) {
//     if (k === "category" || v == null) continue;
//     const val = Array.isArray(v) ? v[0] : v;
//     if (val) params.set(k, val);
//   }

//   for (const [k, v] of Object.entries(overrides)) {
//     if (v == null || v === "") params.delete(k);
//     else params.set(k, String(v));
//   }

//   const qs = params.toString();
//   return `/products/${category}${qs ? `?${qs}` : ""}`;
// }

// function toggleCsv(current: string | undefined, value: string) {
//   const set = new Set((current ?? "").split(",").map((s) => s.trim()).filter(Boolean));
//   if (set.has(value)) set.delete(value);
//   else set.add(value);
//   return Array.from(set).join(",") || null;
// }

// export async function generateMetadata({
//   params,
// }: {
//   params: Promise<{ category: string }>;
// }): Promise<Metadata> {
//   const { category } = await params;

//   if (category === "all") {
//     return {
//       title: "All Products",
//       description: "Browse all VoltKart electronics, appliances and accessories.",
//     };
//   }

//   const cat = await prisma.category.findUnique({
//     where: { slug: category },
//     select: { name: true, description: true },
//   });

//   return {
//     title: cat ? `${cat.name} — VoltKart` : "Products",
//     description: cat?.description ?? "Shop genuine electronics with warranty and fast delivery.",
//   };
// }

// export default async function CategoryPage({
//   params,
//   searchParams,
// }: {
//   params: Promise<{ category: string }>;
//   searchParams: Promise<SP>;
// }) {
//   const { category } = await params;
//   const sp = await searchParams;

//   const input = searchQuerySchema.parse({
//     q: first(sp.q) ?? "",
//     category,
//     sort: first(sp.sort) ?? "popular",
//     page: first(sp.page) ?? 1,
//     perPage: first(sp.perPage) ?? 24,
//     brands: first(sp.brands),
//     subtypes: first(sp.subtypes),
//     ram: first(sp.ram),
//     storage: first(sp.storage),
//     screenSize: first(sp.screenSize),
//     processor: first(sp.processor),
//     color: first(sp.color),
//     minPrice: first(sp.minPrice),
//     maxPrice: first(sp.maxPrice),
//     minRating: first(sp.minRating),
//     minDiscount: first(sp.minDiscount),
//     inStock: first(sp.inStock),
//     warranty: first(sp.warranty),
//   });

//   const [facets, result, cat] = await Promise.all([
//     loadFacets(category === "all" ? null : category),
//     searchProducts(input, category === "all" ? null : category),
//     category === "all"
//       ? Promise.resolve({ name: "All Products", description: "Every live VoltKart SKU." })
//       : prisma.category.findUnique({
//           where: { slug: category },
//           select: { name: true, description: true },
//         }),
//   ]);

//   if (category !== "all" && !cat) {
//     return (
//       <div className="container-x py-10">
//         <EmptyState title="Category not found" body="This collection does not exist or is no longer active." />
//       </div>
//     );
//   }

//   const totalPages = Math.max(1, Math.ceil(result.total / result.perPage));
//   const activeFilters = [
//     input.brands ? { key: "brands", label: `Brand: ${input.brands.split(",").join(", ")}` } : null,
//     input.subtypes ? { key: "subtypes", label: `Type: ${input.subtypes.split(",").join(", ")}` } : null,
//     input.ram ? { key: "ram", label: `RAM: ${input.ram}` } : null,
//     input.storage ? { key: "storage", label: `Storage: ${input.storage}` } : null,
//     input.screenSize ? { key: "screenSize", label: `Display: ${input.screenSize}` } : null,
//     input.processor ? { key: "processor", label: `Processor: ${input.processor}` } : null,
//     input.color ? { key: "color", label: `Color: ${input.color}` } : null,
//     input.minPrice || input.maxPrice
//       ? { key: "price", label: `Price: ${input.minPrice ? inr(input.minPrice) : "0"} – ${input.maxPrice ? inr(input.maxPrice) : "∞"}` }
//       : null,
//     input.minRating ? { key: "minRating", label: `${input.minRating}★ and above` } : null,
//     input.minDiscount ? { key: "minDiscount", label: `${input.minDiscount}% off and above` } : null,
//     input.inStock ? { key: "inStock", label: "In stock only" } : null,
//   ].filter(Boolean) as { key: string; label: string }[];

//   return (
//     <div className="container-x py-6">
//       <SectionHeading
//         eyebrow={category === "all" ? "Catalogue" : cat?.name ?? "Category"}
//         title={category === "all" ? "All Products" : cat?.name ?? "Products"}
//         subtitle={cat?.description ?? undefined}
//       />

//       <div className="grid gap-6 lg:grid-cols-[17rem_1fr]">
//         <aside className="card h-fit p-4 lg:sticky lg:top-[92px]">
//           <h2 className="mb-4 flex items-center gap-2 font-display text-[14px] font-bold text-ink-900">
//             <SlidersHorizontal className="size-4 text-electric-600" />
//             Filters
//           </h2>

//           <FilterGroup title="Brand">
//             {facets.brands.map((b) => {
//               const value = toggleCsv(input.brands, b.slug);
//               const active = (input.brands ?? "").split(",").includes(b.slug);
//               return (
//                 <FilterLink key={b.slug} href={buildHref(category, sp, { brands: value, page: null })} active={active}>
//                   {b.name}
//                 </FilterLink>
//               );
//             })}
//           </FilterGroup>

//           {facets.subtypes.length > 0 && (
//             <FilterGroup title="Type">
//               {facets.subtypes.map((s) => {
//                 const value = toggleCsv(input.subtypes, s);
//                 const active = (input.subtypes ?? "").split(",").includes(s);
//                 return (
//                   <FilterLink key={s} href={buildHref(category, sp, { subtypes: value, page: null })} active={active}>
//                     {s}
//                   </FilterLink>
//                 );
//               })}
//             </FilterGroup>
//           )}

//           {facets.ram.length > 0 && (
//             <FilterGroup title="RAM">
//               {facets.ram.map((s) => {
//                 const value = toggleCsv(input.ram, s);
//                 const active = (input.ram ?? "").split(",").includes(s);
//                 return (
//                   <FilterLink key={s} href={buildHref(category, sp, { ram: value, page: null })} active={active}>
//                     {s}
//                   </FilterLink>
//                 );
//               })}
//             </FilterGroup>
//           )}

//           {facets.storage.length > 0 && (
//             <FilterGroup title="Storage">
//               {facets.storage.map((s) => {
//                 const value = toggleCsv(input.storage, s);
//                 const active = (input.storage ?? "").split(",").includes(s);
//                 return (
//                   <FilterLink key={s} href={buildHref(category, sp, { storage: value, page: null })} active={active}>
//                     {s}
//                   </FilterLink>
//                 );
//               })}
//             </FilterGroup>
//           )}

//           {facets.screenSize.length > 0 && (
//             <FilterGroup title="Display / Capacity">
//               {facets.screenSize.map((s) => {
//                 const value = toggleCsv(input.screenSize, s);
//                 const active = (input.screenSize ?? "").split(",").includes(s);
//                 return (
//                   <FilterLink key={s} href={buildHref(category, sp, { screenSize: value, page: null })} active={active}>
//                     {s}
//                   </FilterLink>
//                 );
//               })}
//             </FilterGroup>
//           )}

//           {facets.processor.length > 0 && (
//             <FilterGroup title="Processor">
//               {facets.processor.map((s) => {
//                 const value = toggleCsv(input.processor, s);
//                 const active = (input.processor ?? "").split(",").includes(s);
//                 return (
//                   <FilterLink key={s} href={buildHref(category, sp, { processor: value, page: null })} active={active}>
//                     {s}
//                   </FilterLink>
//                 );
//               })}
//             </FilterGroup>
//           )}

//           {facets.color.length > 0 && (
//             <FilterGroup title="Color">
//               {facets.color.map((s) => {
//                 const value = toggleCsv(input.color, s);
//                 const active = (input.color ?? "").split(",").includes(s);
//                 return (
//                   <FilterLink key={s} href={buildHref(category, sp, { color: value, page: null })} active={active}>
//                     {s}
//                   </FilterLink>
//                 );
//               })}
//             </FilterGroup>
//           )}

//           <FilterGroup title="Price">
//             {PRICE_BUCKETS.map((p) => {
//               const active = input.minPrice === p.min && input.maxPrice === p.max;
//               return (
//                 <FilterLink
//                   key={p.label}
//                   href={buildHref(category, sp, { minPrice: p.min, maxPrice: p.max, page: null })}
//                   active={active}
//                 >
//                   {p.label}
//                 </FilterLink>
//               );
//             })}
//           </FilterGroup>

//           <FilterGroup title="Rating & Discount">
//             <FilterLink href={buildHref(category, sp, { minRating: 4, page: null })} active={input.minRating === 4}>
//               4★ and above
//             </FilterLink>
//             <FilterLink href={buildHref(category, sp, { minDiscount: 25, page: null })} active={input.minDiscount === 25}>
//               25% off and above
//             </FilterLink>
//             <FilterLink href={buildHref(category, sp, { inStock: "true", page: null })} active={Boolean(input.inStock)}>
//               In stock only
//             </FilterLink>
//           </FilterGroup>

//           {(activeFilters.length > 0 || input.q) && (
//             <Link
//               href={`/products/${category}`}
//               className="mt-4 inline-flex h-9 items-center justify-center rounded-lg border border-hairline px-3 text-[12.5px] font-bold text-ink-700 hover:border-flame-500/40 hover:text-flame-600"
//             >
//               Clear all filters
//             </Link>
//           )}
//         </aside>

//         <main className="min-w-0">
//           <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
//             <p className="text-[13px] font-semibold text-ink-400">
//               {result.total.toLocaleString("en-IN")} product{result.total === 1 ? "" : "s"}
//               {input.q ? ` for “${input.q}”` : ""}
//             </p>

//             <div className="flex flex-wrap items-center gap-2">
//               {activeFilters.map((f) => (
//                 <Badge key={f.key} tone="info">
//                   {f.label}
//                 </Badge>
//               ))}

//               <label className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-400">
//                 Sort
//                 <select
//                   value={input.sort}
//                   onChange={(e) => {
//                     const url = buildHref(category, sp, { sort: e.target.value, page: null });
//                     window.location.href = url;
//                   }}
//                   className="h-9 rounded-lg border border-hairline bg-white px-2 text-[12.5px] font-semibold text-ink-900 outline-none"
//                 >
//                   {SORT_OPTIONS.map((s) => (
//                     <option key={s.value} value={s.value}>
//                       {s.label}
//                     </option>
//                   ))}
//                 </select>
//               </label>
//             </div>
//           </div>

//           {result.items.length === 0 ? (
//             <EmptyState
//               title="No products match these filters"
//               body="Try removing a filter, increasing price range, or searching a different term."
//             />
//           ) : (
//             <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
//               {result.items.map((p, idx) => (
//                 <ProductCard key={p.id} product={p} priority={idx < 4} />
//               ))}
//             </div>
//           )}

//           {totalPages > 1 && (
//             <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Pagination">
//               {input.page > 1 && (
//                 <Link
//                   href={buildHref(category, sp, { page: input.page - 1 })}
//                   className="inline-flex h-10 items-center rounded-xl border border-hairline px-4 text-[13px] font-bold text-ink-700 hover:border-electric-300"
//                 >
//                   Previous
//                 </Link>
//               )}

//               <span className="text-[13px] font-bold tabular-nums text-ink-400">
//                 Page {input.page} / {totalPages}
//               </span>

//               {input.page < totalPages && (
//                 <Link
//                   href={buildHref(category, sp, { page: input.page + 1 })}
//                   className="inline-flex h-10 items-center rounded-xl bg-ink-900 px-4 text-[13px] font-bold text-white hover:bg-electric-600"
//                 >
//                   Next
//                 </Link>
//               )}
//             </nav>
//           )}
//         </main>
//       </div>
//     </div>
//   );
// }

// function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
//   return (
//     <section className="mb-5 border-b border-hairline pb-4 last:border-0">
//       <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wider text-ink-300">{title}</h3>
//       <div className="space-y-1">{children}</div>
//     </section>
//   );
// }

// function FilterLink({
//   href,
//   active,
//   children,
// }: {
//   href: string;
//   active?: boolean;
//   children: React.ReactNode;
// }) {
//   return (
//     <Link
//       href={href}
//       className={cn(
//         "block rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors",
//         active ? "bg-electric-50 text-electric-700" : "text-ink-400 hover:bg-canvas hover:text-ink-900",
//       )}
//     >
//       {children}
//     </Link>
//   );
// }












// Example for [category]/page.tsx
import prisma from "@/lib/prisma";
import { productSelect, toCards } from "@/lib/catalog";
import { ProductListClient } from "@/components/product/ProductListClient"; // Import the new client component

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  
  // Fetch data ON SERVER SIDE (Safe)
  const products = await prisma.product.findMany({
    where: { active: true, category: { slug: category } },
    select: productSelect,
    take: 50,
  });

  // Pass DATA ONLY to Client Component (Functions stay inside Client Comp)
  return (
    <ProductListClient 
      initialProducts={toCards(products)} 
      total={products.length}
      categorySlug={category}
    />
  );
}