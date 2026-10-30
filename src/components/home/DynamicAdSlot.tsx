"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ASCII-only source: \u escapes decode to real glyphs at runtime but are plain bytes
// in the file, so the CP1252 mojibake that keeps re-infecting pasted files can never
// return. Never hardcode a literal rupee / down-arrow / middle-dot here again.
const RUPEE = "\u20B9";
const ARROW = "\u2193";
const DOT = "\u00B7";

type Ad = {
  id?: string;
  slug?: string;
  name?: string;
  image?: string;
  price?: number | string;
  salePrice?: number | string;
  mrp?: number | string;
  brand?: string | null; // route still returns it; intentionally NOT rendered here
};

/**
 * The feed's Featured card, stripped to pure composition per the reference review:
 * NO disclosure chip, NO illustration micro-line, NO brand stamp, NO radial glow
 * (a blue glow behind a white-canvas JPG is exactly the seam/halo we are removing).
 * The panel is a left blue wash that terminates to PURE WHITE before the product
 * starts, so a white-canvas studio photo merges with the stage (its background ==
 * the slide background) with zero rectangle; the product is enlarged and bled to the
 * top/bottom/right via object-CONTAIN (never cover -> nothing cropped) with only a
 * soft grounding shadow. Copy stays dark ink on the blue left. Data is one random
 * active+in-stock product fetched per mount, so anything published later is eligible
 * on the next draw. Slot / margins / fetch unchanged => page position identical.
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
        <div className="h-[156px] w-full animate-pulse rounded-2xl bg-gray-200 sm:h-[184px]" />
      ) : ad ? (
        <Link
          href={href}
          className="group relative flex min-h-[156px] items-center overflow-hidden rounded-2xl border border-gray-200/70 bg-[linear-gradient(to_right,#d7eaff_0%,#e9f2ff_36%,#ffffff_48%,#ffffff_100%)] p-4 no-underline shadow-sm transition-shadow hover:shadow-md sm:min-h-[184px] sm:bg-[linear-gradient(to_right,#d7eaff_0%,#e9f2ff_30%,#ffffff_42%,#ffffff_100%)] sm:p-6"
        >
          {/* PRODUCT, bled large to top/bottom/right, CONTAINED on the white side so a
              white-canvas photo has no edge and nothing is cropped. Soft grounding
              shadow only (no halo) keeps it reading as a clean studio shot on white. */}
          <span className="pointer-events-none absolute inset-y-[-6%] -right-[4%] z-10 grid w-[54%] place-items-center sm:-right-[6%] sm:w-[60%]">
            {ad.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ad.image}
                alt={ad.name ?? "Featured product"}
                className="size-full object-contain object-center drop-shadow-[0_14px_24px_rgba(2,6,23,0.12)] transition-transform duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              <span className="grid size-full place-items-center text-[11px] font-bold text-gray-300">
                {(ad.name ?? "").slice(0, 2).toUpperCase()}
              </span>
            )}
          </span>

          {/* LEFT copy in flow, constrained to the blue wash so it never underlaps the
              white product zone. Dark ink, no chip above it, no micro-line below it. */}
          <span className="relative z-20 flex w-[44%] min-w-0 flex-col justify-center sm:w-[38%]">
            <span className="block font-display text-[15px] font-extrabold leading-[1.12] text-gray-900 line-clamp-2 sm:text-[18px]">
              {ad.name ?? "Today's spotlight deal"}
            </span>
            <span className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-[24px] font-black leading-none tabular-nums text-gray-900 sm:text-[28px]">
                {RUPEE}{Math.round(price).toLocaleString("en-IN")}
              </span>
              {mrp > price && (
                <span className="text-[12px] tabular-nums text-gray-400 line-through sm:text-[13px]">
                  {RUPEE}{Math.round(mrp).toLocaleString("en-IN")}
                </span>
              )}
              {off > 0 && (
                <span className="text-[12px] font-bold text-emerald-600 sm:text-[13px]">
                  {ARROW}{off}%
                </span>
              )}
            </span>
          </span>
        </Link>
      ) : (
        <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-xs font-semibold text-gray-400">
          Featured slot {DOT} no active product
        </div>
      )}
    </section>
  );
}