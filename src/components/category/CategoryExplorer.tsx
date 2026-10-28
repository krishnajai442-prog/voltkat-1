"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, LayoutGrid, Sparkles } from "lucide-react";
import type { ExplorerData, ExplorerItem, ExplorerBrand, CatMeta } from "@/lib/category-explorer";

const inr = (n?: number | null) => (typeof n === "number" && Number.isFinite(n) ? `₹${n.toLocaleString("en-IN")}` : "—");

function Pill({ item }: { item: ExplorerItem }) {
  if (item.off > 0) return <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">{item.off}% OFF</span>;
  if (item.isNew) return <span className="rounded bg-[#2874f0]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#2874f0]">New</span>;
  return null;
}

function ProductCard({ p }: { p: ExplorerItem }) {
  return (
    <Link href={`/product/${p.slug}`} className="flex w-[120px] shrink-0 flex-col sm:w-auto">
      <div className="relative mb-1.5 aspect-square overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
        {p.image /* eslint-disable-next-line @next/next/no-img-element */ ? <img src={p.image} alt={p.name} loading="lazy" className="size-full object-contain" /> : null}
        <span className="absolute left-1 top-1"><Pill item={p} /></span>
      </div>
      <p className="line-clamp-2 min-h-[2rem] text-[11.5px] leading-snug text-gray-800">{p.name}</p>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="text-[12.5px] font-bold text-gray-900">{inr(p.price)}</span>
        {p.off > 0 && p.mrp ? <span className="text-[10.5px] text-gray-400 line-through">{inr(p.mrp)}</span> : null}
      </div>
    </Link>
  );
}

function BrandCard({ b, onSelect }: { b: ExplorerBrand; onSelect: (name: string) => void }) {
  return (
    <button type="button" onClick={() => onSelect(b.name)} className="flex flex-col items-center gap-1 rounded-xl border border-gray-100 bg-white p-2 text-center hover:border-gray-300">
      <div className="size-14 overflow-hidden rounded-lg bg-gray-50">
        {b.image /* eslint-disable-next-line @next/next/no-img-element */ ? <img src={b.image} alt={b.name} loading="lazy" className="size-full object-contain" /> : null}
      </div>
      <p className="line-clamp-1 text-[11px] font-semibold text-gray-800">{b.name}</p>
      <span className="text-[10px] font-medium text-gray-400">{b.pill}</span>
    </button>
  );
}

function Rail({ title, items }: { title: string; items: ExplorerItem[] }) {
  if (!items.length) return null;
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-3">
      <h3 className="mb-2 font-display text-[13.5px] font-bold text-gray-900">{title}</h3>
      <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-4 sm:overflow-visible">
        {items.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}

export function CategoryExplorer({ data }: { data: ExplorerData }) {
  const [active, setActive] = useState<string | null>(null);        // category slug
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const cur = active ? data.categories.find((c) => c.slug === active) : null;
  const bucket = active ? data.byCategory[active] : null;
  const brandList = activeBrand ? (data.brandProducts[activeBrand] ?? []) : [];

  const pickCategory = (slug: string) => { setActive(slug); setActiveBrand(null); };

  return (
    <div className="flex gap-3">
      {/* LEFT RAIL */}
      <aside className="sticky top-[64px] h-[calc(100dvh-128px)] w-[78px] shrink-0 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button type="button" onClick={() => { setActive(null); setActiveBrand(null); }}
          className={`mb-1 flex w-full flex-col items-center gap-1 rounded-lg px-1 py-2 ${active === null && activeBrand === null ? "bg-[#2874f0]/10" : "hover:bg-gray-50"}`}>
          <span className={`grid size-12 place-items-center rounded-lg ${active === null && activeBrand === null ? "bg-[#2874f0] text-white" : "bg-gray-100 text-gray-500"}`}><Sparkles className="size-5" /></span>
          <span className={`text-[10.5px] font-semibold ${active === null && activeBrand === null ? "text-[#2874f0]" : "text-gray-700"}`}>For You</span>
        </button>
        {data.categories.map((c) => (
          <button key={c.id} type="button" onClick={() => pickCategory(c.slug)}
            className={`flex w-full flex-col items-center gap-1 rounded-lg px-1 py-2 text-center transition-colors ${active === c.slug ? "bg-[#2874f0]/10" : "hover:bg-gray-50"}`}>
            <span className={`grid size-12 place-items-center overflow-hidden rounded-lg ${active === c.slug ? "ring-2 ring-[#2874f0]" : ""}`}>
              {c.image /* eslint-disable-next-line @next/next/no-img-element */ ? <img src={c.image} alt="" loading="lazy" className="size-full object-contain" /> : <LayoutGrid className="size-5 text-gray-300" />}
            </span>
            <span className={`line-clamp-2 text-[10.5px] font-semibold ${active === c.slug ? "text-[#2874f0]" : "text-gray-700"}`}>{c.name}</span>
          </button>
        ))}
      </aside>

      {/* RIGHT PANE */}
      <div className="min-w-0 flex-1 space-y-3">
        {activeBrand ? (
          <>
            <section className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3">
              <div>
                <h3 className="font-display text-[15px] font-bold text-gray-900">{activeBrand}</h3>
                <p className="text-[11.5px] text-gray-500">{brandList.length} product{brandList.length === 1 ? "" : "s"}</p>
              </div>
              <button type="button" onClick={() => setActiveBrand(null)} className="text-[11.5px] font-semibold text-[#2874f0] hover:underline">Back</button>
            </section>
            <Rail title={`Top ${activeBrand} products`} items={brandList} />
          </>
        ) : !cur ? (
          <>
            <section className="rounded-xl border border-gray-200 bg-white p-3">
              <h3 className="mb-2 font-display text-[13.5px] font-bold text-gray-900">Shop by Category</h3>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {data.categories.map((c) => (
                  <Link key={c.id} href={`/products/${c.slug}`} className="flex flex-col items-center gap-1 rounded-lg border border-gray-100 p-2 hover:border-gray-300">
                    <span className="grid size-12 place-items-center overflow-hidden rounded-lg bg-gray-50">
                      {c.image /* eslint-disable-next-line @next/next/no-img-element */ ? <img src={c.image} alt="" loading="lazy" className="size-full object-contain" /> : <LayoutGrid className="size-5 text-gray-300" />}
                    </span>
                    <span className="line-clamp-1 text-[11px] font-semibold text-gray-800">{c.name}</span>
                  </Link>
                ))}
              </div>
            </section>
            <Rail title="Trending Deals" items={data.trending} />
            {data.allBrands.length ? (
              <section className="rounded-xl border border-gray-200 bg-white p-3">
                <h3 className="mb-2 font-display text-[13.5px] font-bold text-gray-900">Popular Brands</h3>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {data.allBrands.map((b) => <BrandCard key={b.name} b={b} onSelect={setActiveBrand} />)}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <>
            <section className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3">
              <div>
                <h3 className="font-display text-[15px] font-bold text-gray-900">{cur.name}</h3>
                <p className="text-[11.5px] text-gray-500">{cur.count} product{cur.count === 1 ? "" : "s"}</p>
              </div>
              <Link href={`/products/${cur.slug}`} className="inline-flex items-center gap-1 rounded-lg bg-[#2874f0] px-3 py-1.5 text-[12px] font-bold text-white">View all <ArrowRight className="size-3.5" /></Link>
            </section>
            <Rail title={`Top Deals in ${cur.name}`} items={bucket?.deals ?? []} />
            {bucket?.brands.length ? (
              <section className="rounded-xl border border-gray-200 bg-white p-3">
                <h3 className="mb-2 font-display text-[13.5px] font-bold text-gray-900">Brands in {cur.name}</h3>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {bucket.brands.map((b) => <BrandCard key={b.name} b={b} onSelect={setActiveBrand} />)}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export default CategoryExplorer;