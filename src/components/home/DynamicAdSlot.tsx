"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ASCII-only source: \u escapes decode to real glyphs at runtime but are plain bytes
// in the file, so the CP1252 mojibake that lived in this file (and home-slides.ts)
// can never return. Never hardcode a literal rupee/down-arrow here again.
const RUPEE = "\u20B9";
const ARROW = "\u2193";

type Ad = {
  id?: string;
  slug?: string;
  name?: string;
  image?: string;
  price?: number | string;
  salePrice?: number | string;
  mrp?: number | string;
};

/**
 * The home feed's Sponsored slot, restyled to the reference creative: a tall soft
 * blue->white gradient panel with a glow, the product contained and bleeding to the
 * right edge (no white box), the price as the hero number, one muted disclosure chip,
 * and an illustration micro-line. No rating pill, no "From" range, no invented feature
 * copy - those would misrepresent our own inventory. Data is one random active+in-stock
 * product fetched per mount, so anything published later can appear on the next load.
 */
export function DynamicAdSlot() {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Sponsored product: fetched per mount, so every real load/refresh draws a fresh
  // uniform pick from the whole active, in-stock catalog (the route has no gate and
  // no row cap), which is what makes a product you add later eligible on the next draw.
  useEffect(() => {
    let alive = true;
    fetch("/api/feed/random-ad")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!alive) return;
        const a = (json?.product ?? json ?? null) as Ad | null;
        setAd(a && (a.slug || a.id) ? a : null);
      })
      .catch(() => alive && setAd(null))
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  const href = ad ? `/product/${ad.slug ?? ad.id}` : "/products/all";
  const price = ad ? Number(ad.price ?? ad.salePrice ?? 0) : 0;
  const mrp = ad ? Number(ad.mrp ?? price) : 0;
  const off = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  return (
    <section className="container-x mt-6 mb-8 md:mt-8 md:mb-10" aria-label="Featured">
      {!loaded ? (
        <div className="h-[150px] w-full animate-pulse rounded-2xl bg-gray-200 sm:h-[176px]" />
      ) : ad ? (
        <Link
          href={href}
          className="group relative flex min-h-[150px] items-center gap-3 overflow-hidden rounded-2xl border border-gray-200/70 bg-gradient-to-r from-[#d7ecff] via-[#eaf4ff] to-white p-4 no-underline shadow-sm transition-shadow hover:shadow-md sm:min-h-[176px] sm:gap-5 sm:p-6"
        >
          {/* single muted disclosure chip - honest for our own inventory ("Featured",
              not a paid "Ad"); same restrained top-right placement as the reference. */}
          <span className="pointer-events-none absolute right-3 top-3 z-20 rounded bg-gray-700/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur">
            Featured
          </span>

          {/* LEFT: name + hero price + illustration line */}
          <span className="relative z-10 min-w-0 flex-1">
            <span className="block font-display text-[15px] font-extrabold leading-[1.15] text-gray-900 line-clamp-2 sm:text-[19px]">
              {ad.name ?? "Today's spotlight deal"}
            </span>
            <span className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-[20px] font-black leading-none tabular-nums text-gray-900 sm:text-[25px]">
                {RUPEE}{Math.round(price).toLocaleString("en-IN")}
              </span>
              {mrp > price && (
                <span className="text-[11px] tabular-nums text-gray-400 line-through sm:text-[12px]">
                  {RUPEE}{Math.round(mrp).toLocaleString("en-IN")}
                </span>
              )}
              {off > 0 && (
                <span className="text-[11px] font-bold text-emerald-600 sm:text-[12px]">
                  {ARROW}{off}%
                </span>
              )}
            </span>
            <span className="mt-2.5 block text-[10px] leading-tight text-gray-400">
              *Image for illustration.
            </span>
          </span>

          {/* RIGHT: glow + contained product bleeding to the edge (no white box) */}
          <span className="relative z-10 -mr-1 h-28 w-[40%] shrink-0 sm:-mr-3 sm:h-40">
            <span aria-hidden className="absolute right-0 top-1/2 size-32 -translate-y-1/2 rounded-full bg-sky-200/60 blur-2xl sm:size-44" />
            <span className="relative grid h-full w-full place-items-center">
              {ad.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ad.image}
                  alt={ad.name ?? "Featured product"}
                  className="max-h-full w-auto object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <span className="grid size-full place-items-center text-[11px] font-bold text-gray-400">
                  {(ad.name ?? "AD").slice(0, 2).toUpperCase()}
                </span>
              )}
            </span>
          </span>
        </Link>
      ) : (
        <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-xs font-semibold text-gray-400">
          Featured slot - no active product
        </div>
      )}
    </section>
  );
}