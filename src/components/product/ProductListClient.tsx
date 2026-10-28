"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import type { CardVM } from "@/lib/catalog";

type Props = {
  initialProducts: CardVM[];
  /** Size of the server-provided batch (the page passes products.length). */
  total: number;
  categorySlug?: string | null;
};

/** "" or garbage -> null so an empty price box never filters. */
const num = (s: string): number | null => {
  const n = Number(s);
  return s.trim() !== "" && Number.isFinite(n) ? n : null;
};

// Optional fields: if CardVM ever carries sold/createdAt these sorts become
// exact automatically; until then they degrade to sensible fallbacks.
const soldOf = (p: CardVM) => (p as { sold?: number }).sold ?? 0;
const createdAtOf = (p: CardVM) => (p as { createdAt?: string }).createdAt ?? "";

export function ProductListClient({ initialProducts, total, categorySlug }: Props) {
  const searchParams = useSearchParams();

  const [sort, setSort] = useState(searchParams.get("sort") || "popular");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");

  // REAL filtering + sorting now: the grid renders this, not the raw batch.
  const products = useMemo(() => {
    const min = num(minPrice);
    const max = num(maxPrice);
    const filtered = initialProducts.filter(
      (p) => (min === null || p.salePrice >= min) && (max === null || p.salePrice <= max),
    );
    switch (sort) {
      case "priceLow":  return [...filtered].sort((a, b) => a.salePrice - b.salePrice);
      case "priceHigh": return [...filtered].sort((a, b) => b.salePrice - a.salePrice);
      case "rating":    return [...filtered].sort((a, b) => b.ratingAvg - a.ratingAvg);
      case "newest":    return [...filtered].sort((a, b) => createdAtOf(b).localeCompare(createdAtOf(a)));
      default:          return [...filtered].sort((a, b) => soldOf(b) - soldOf(a) || b.ratingCount - a.ratingCount);
    }
  }, [initialProducts, sort, minPrice, maxPrice]);

  // Keep the URL shareable WITHOUT triggering a server refetch.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (sort !== "popular") params.set("sort", sort); else params.delete("sort");
    if (minPrice) params.set("minPrice", minPrice); else params.delete("minPrice");
    if (maxPrice) params.set("maxPrice", maxPrice); else params.delete("maxPrice");
    window.history.replaceState({}, "", `/products/${categorySlug || "all"}?${params.toString()}`);
  }, [sort, minPrice, maxPrice, categorySlug]);

  const hasFilters = sort !== "popular" || minPrice !== "" || maxPrice !== "";

  return (
    <div className="container-x py-6">
      {/* FILTER BAR */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
        <span className="text-xs font-bold uppercase text-gray-500">Filters:</span>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="h-9 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-[#2874f0]"
        >
          <option value="popular">Popularity</option>
          <option value="newest">Newest First</option>
          <option value="priceLow">Price: Low to High</option>
          <option value="priceHigh">Price: High to Low</option>
          <option value="rating">Top Rated</option>
        </select>

        <input
          type="number"
          placeholder="Min ₹"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          className="h-9 w-24 rounded-lg border border-gray-300 px-2 text-sm"
        />
        <span className="text-gray-400">-</span>
        <input
          type="number"
          placeholder="Max ₹"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className="h-9 w-24 rounded-lg border border-gray-300 px-2 text-sm"
        />

        <button
          onClick={() => { setSort("popular"); setMinPrice(""); setMaxPrice(""); }}
          className="ml-auto text-xs font-semibold text-red-500 hover:underline"
        >
          Clear All
        </button>
      </div>

      {hasFilters && (
        <p className="mb-3 text-[12.5px] text-gray-500">
          Showing {products.length} of {total} products
        </p>
      )}

      {/* PRODUCT GRID — scrolls; no numbered pager (matches the ref's mobile listing) */}
      {products.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-gray-500">No products found matching criteria.</p>
          <button
            onClick={() => { setSort("popular"); setMinPrice(""); setMaxPrice(""); }}
            className="mt-2 text-[12.5px] font-semibold text-[#2874f0] hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((p) => (
            <Link key={p.id} href={`/product/${p.slug}`} className="group card overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg">
              <div className="relative aspect-square bg-gray-50 p-2">
                <Image src={p.image} alt={p.name} fill sizes="(max-width: 640px) 50vw, 20vw" className="object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105" />
                {p.discountPercent >= 20 && (
                  <span className="absolute left-2 top-2 rounded bg-green-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    {p.discountPercent}% OFF
                  </span>
                )}
              </div>
              <div className="space-y-1 p-3">
                <p className="line-clamp-2 h-10 text-[13px] font-medium leading-tight text-gray-800">{p.name}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-bold text-gray-900">₹{p.salePrice.toLocaleString("en-IN")}</span>
                  {p.mrp > p.salePrice && (
                    <span className="text-xs text-gray-400 line-through">₹{p.mrp.toLocaleString("en-IN")}</span>
                  )}
                </div>
                {p.ratingAvg > 0 && (
                  <div className="flex items-center gap-1 text-[11px] text-gray-500">
                    <span className="rounded bg-green-600 px-1 py-0.5 font-bold text-white">{p.ratingAvg.toFixed(1)} ★</span>
                    <span>({p.ratingCount})</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}