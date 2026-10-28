"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import type { CardVM } from "@/lib/catalog";

type Props = {
  initialProducts: CardVM[];
  pageSize?: number;
};

export function InfiniteProductFeed({ initialProducts, pageSize = 12 }: Props) {
  const [products, setProducts] = useState<CardVM[]>(initialProducts);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // Ref for the sentinel element (triggers when visible)
  const observerTarget = useRef<HTMLDivElement>(null);

  // Fetch more products when sentinel is visible
  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0]?.isIntersecting) {
          setLoading(true);
          try {
            const nextPage = page + 1;
            const res = await fetch(`/api/feed?page=${nextPage}&limit=${pageSize}`);
            const json = await res.json();

            if (json.ok && json.items?.length > 0) {
              setProducts((prev) => [...prev, ...json.items]);
              setPage(nextPage);
              
              // Stop if less than full page returned
              if (json.items.length < pageSize) setHasMore(false);
            } else {
              setHasMore(false);
            }
          } catch (e) {
            console.error("Feed error:", e);
            setHasMore(false);
          } finally {
            setLoading(false);
          }
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [page, hasMore, loading, pageSize]);

  return (
    <div className="container-x py-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-gray-900">Suggested For You</h2>
        <span className="text-xs font-semibold text-gray-500">Personalized picks</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {products.map((p) => (
          <Link key={p.id} href={`/product/${p.slug}`} className="group card overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg">
            <div className="relative aspect-square bg-gray-50 p-2">
              <Image src={p.image} alt={p.name} fill sizes="(max-width: 640px) 50vw, 20vw" className="object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" />
              
              {/* Badges */}
              {p.discountPercent >= 20 && (
                <span className="absolute left-2 top-2 rounded bg-green-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                  {p.discountPercent}% OFF
                </span>
              )}
              {p.stock <= 5 && p.stock > 0 && (
                <span className="absolute right-2 top-2 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm animate-pulse">
                  Low Stock
                </span>
              )}
            </div>

            <div className="p-3 space-y-1">
              <p className="line-clamp-2 h-10 text-[13px] leading-tight font-medium text-gray-800">{p.name}</p>
              
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-bold text-gray-900">₹{p.salePrice.toLocaleString('en-IN')}</span>
                {p.mrp > p.salePrice && (
                  <span className="text-xs text-gray-400 line-through">₹{p.mrp.toLocaleString('en-IN')}</span>
                )}
              </div>

              {p.ratingAvg > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-gray-500">
                  <span className="rounded bg-green-600 px-1 py-0.5 text-white font-bold">{p.ratingAvg.toFixed(1)} ★</span>
                  <span>({p.ratingCount})</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Sentinel / Loader */}
      <div ref={observerTarget} className="mt-8 flex justify-center py-4">
        {loading && (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm font-medium">Loading more suggestions...</span>
          </div>
        )}
        {!hasMore && !loading && (
          <p className="text-sm text-gray-400 italic">You've reached the end!</p>
        )}
      </div>
    </div>
  );
}