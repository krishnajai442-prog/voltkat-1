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
  // optional: lights the bottom-right brand stamp the instant the random-ad route
  // returns it (see the capture below). Absent => no stamp, never a guessed one.
  brand?: string | null;
};

/**
 * The feed's Featured slot, rebuilt to the reference creative composition (Picture 34):
 * one continuous left-blue -> white wash (NO left/right seam), the product BLED large to
 * the top/bottom/right edges over a real glow via object-CONTAIN on a white-terminating
 * panel (so a white-canvas studio JPG's own background == the stage and the photo-box
 * edge disappears), the price promoted to a hero number, a single muted disclosure chip,
 * the illustration micro-line, and an optional brand stamp. No eyebrow, no rating pill,
 * no fabricated feature callout, no "From" range - those would misrepresent our own
 * inventory. Data is one random active+in-stock product fetched per mount, so anything
 * published later is eligible on the next draw. Slot/margins/fetch unchanged => position
 * on the page is identical to before.
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
  const brand = ad?.brand ?? null;

  return (
    <section className="container-x mt-6 mb-8 md:mt-8 md:mb-10" aria-label="Featured">
      {!loaded ? (
        <div className="h-[156px] w-full animate-pulse rounded-2xl bg-gray-200 sm:h-[184px]" />
      ) : ad ? (
        <Link
          href={href}
          className="group relative flex min-h-[156px] items-center overflow-hidden rounded-2xl border border-gray-200/70 bg-gradient-to-r from-[#d9ebff] via-[#eef5ff] to-white p-4 no-underline shadow-sm transition-shadow hover:shadow-md sm:min-h-[184px] sm:p-6"
        >
          {/* glow behind the product (the reference's radial), strong enough to read */}
          <span
            aria-hidden
            className="pointer-events-none absolute right-[-6%] top-1/2 aspect-square w-[64%] -translate-y-1/2 rounded-full bg-[#2874f0]/14 blur-2xl"
          />

          {/* PRODUCT BLED to top/bottom/right over the white-terminating wash. The box
              deliberately overflows the card (inset-y -10%, right -8%) and the card's
              overflow-hidden clips the overhang -> the phone touches all three edges like
              the laptop, with NO white photo-box. object-contain (not cover) so nothing
              of the product is ever cropped; its white canvas merges with the white right. */}
          <span className="pointer-events-none absolute inset-y-[-10%] -right-[8%] z-10 w-[54%] sm:w-[50%]">
            {ad.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ad.image}
                alt={ad.name ?? "Featured product"}
                className="size-full object-contain object-center drop-shadow-xl transition-transform duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              <span className="grid size-full place-items-center text-[11px] font-bold text-gray-400">
                {(ad.name ?? "AD").slice(0, 2).toUpperCase()}
              </span>
            )}
          </span>

          {/* single muted disclosure chip - honest word ("Featured", not a paid "Ad"),
              styled with the reference's restraint (light, small, top-right) */}
          <span className="pointer-events-none absolute right-3 top-3 z-30 rounded bg-black/[0.06] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-gray-500">
            Featured
          </span>

          {/* brand stamp bottom-right, like the reference's SAMSUNG - only when the route
              actually returns a brand (never inferred from the name) */}
          {brand && (
            <span className="pointer-events-none absolute bottom-2.5 right-3 z-30 text-[11px] font-black uppercase tracking-[0.18em] text-gray-400 sm:text-[12px]">
              {brand}
            </span>
          )}

          {/* LEFT copy in flow, constrained so it never underlaps the bled product */}
          <span className="relative z-20 flex w-[46%] min-w-0 flex-col justify-center sm:w-[44%]">
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
            <span className="mt-2.5 block text-[10px] leading-tight text-gray-400">
              *Image for illustration.
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