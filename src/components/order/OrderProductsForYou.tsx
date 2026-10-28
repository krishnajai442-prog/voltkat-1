"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Rec = {
  id: string;
  slug: string;
  name: string;
  image: string;
  salePrice: number;
  mrp: number;
  discountPercent: number;
  ratingAvg: number;
  sold: number;
};

// Flipkart's lakh/thousand compacting for the rating pill's count: 580000 -> "5.8L+",
// 400000 -> "4L+", 27300 -> "27.3K+", 1600 -> "1.6K+". Trims the trailing ".0".
function compact(n: number): string {
  const trim = (x: number) => {
    const s = x.toFixed(1);
    return s.endsWith(".0") ? s.slice(0, -2) : s;
  };
  if (n >= 1e5) return `${trim(n / 1e5)}L+`;
  if (n >= 1e3) return `${trim(n / 1e3)}K+`;
  return `${n}+`;
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function OrderProductsForYou({
  excludeIds = [],
  title = "Products For You",
  count = 10,
}: {
  excludeIds?: string[];
  title?: string;
  count?: number;
}) {
  const [items, setItems] = useState<Rec[] | null>(null);

  useEffect(() => {
    let alive = true;
    const qs = new URLSearchParams({ n: String(count) });
    if (excludeIds.length) qs.set("exclude", excludeIds.join(","));
    fetch(`/api/feed/order-recommendations?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!alive) return;
        const list = (json?.products ?? null) as Rec[] | null;
        setItems(Array.isArray(list) ? list : []);
      })
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
    // excludeIds is treated as a stable signature; callers pass a memoised array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excludeIds.join(","), count]);

  // Loading: a 2-col skeleton so the layout doesn't jump when data lands.
  if (items === null) {
    return (
      <section aria-label={title} className="mt-6">
        <h2 className="mb-2 px-1 text-[15px] font-bold text-gray-900">{title}</h2>
        <div className="columns-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mb-3 break-inside-avoid">
              <div className="aspect-square w-full animate-pulse rounded-lg bg-gray-100" />
              <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-gray-100" />
              <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Empty pool (or fetch failure): hide the whole section, like Flipkart does when
  // there's nothing to recommend — never render an empty heading.
  if (items.length === 0) return null;

  return (
    <section aria-label={title} className="mt-6">
      <h2 className="mb-2 px-1 text-[15px] font-bold text-gray-900">{title}</h2>

      {/* Masonry via CSS columns: the two columns flow independently, exactly like the
          video's uneven-height recommended cards, with no JS measuring. */}
      <div className="columns-2 gap-3">
        {items.map((p) => (
          <Link
            key={p.id}
            href={`/product/${p.slug}`}
            className="group mb-3 block break-inside-avoid overflow-hidden rounded-lg border border-gray-100 bg-white"
          >
            {/* Image area: light-gray panel, product contained (white-bg renders stay
                whole), rating pill overlaid bottom-left like the reference. */}
            <div className="relative aspect-square w-full bg-gray-50">
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image}
                  alt={p.name}
                  loading="lazy"
                  className="size-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <span className="grid size-full place-items-center text-2xl font-black text-gray-300">
                  {p.name.charAt(0) || "V"}
                </span>
              )}
              {(p.ratingAvg > 0 || p.sold > 0) && (
                <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded bg-white/95 px-1.5 py-0.5 text-[10.5px] font-semibold text-gray-700 shadow-sm">
                  {p.ratingAvg > 0 && (
                    <>
                      {p.ratingAvg.toFixed(1)} <span className="text-emerald-600">★</span>
                    </>
                  )}
                  {p.ratingAvg > 0 && p.sold > 0 && <span className="text-gray-300">|</span>}
                  {p.sold > 0 && compact(p.sold)}
                </span>
              )}
            </div>

            {/* Name (2-line clamp) then the price row: green ↓off% + struck mrp + bold
                sale price — the video's exact ordering. Our product names already lead
                with the brand, so no separate bold brand prefix is needed. */}
            <div className="p-2">
              <p className="line-clamp-2 min-h-[2rem] text-[12px] font-medium leading-snug text-gray-800">
                {p.name}
              </p>
              <p className="mt-1 flex flex-wrap items-baseline gap-1.5">
                {p.discountPercent > 0 && (
                  <span className="text-[11.5px] font-bold text-emerald-600">↓{p.discountPercent}%</span>
                )}
                {p.mrp > p.salePrice && (
                  <span className="text-[11px] text-gray-400 line-through">{inr(p.mrp)}</span>
                )}
                <span className="text-[13px] font-bold text-gray-900">{inr(p.salePrice)}</span>
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}