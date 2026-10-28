"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Ad = {
  id?: string;
  slug?: string;
  name?: string;
  image?: string;
  price?: number | string;
  salePrice?: number | string;
  mrp?: number | string;
};

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
    <section className="container-x mt-6 mb-8 md:mt-8 md:mb-10" aria-label="Sponsored">
      {!loaded ? (
        <div className="h-64 w-full animate-pulse rounded-xl bg-gray-200" />
      ) : ad ? (
        <Link
          href={href}
          className="group relative block overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200/70"
        >
          {/* Disclosure chip (Flipkart-style), pinned top-right above the creative. */}
          <span className="pointer-events-none absolute right-2 top-2 z-20 rounded bg-gray-200/85 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-500">
            Ad
          </span>

          {/* Eyebrow: the card's identity sits at the very top… */}
          <span className="block px-3 pt-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">
            Sponsored
          </span>

          {/* …then the product IMAGE, full-width band, contained on white so a studio
              render is never cropped into a sliver. */}
          <div className="relative mt-1 h-40 w-full bg-white sm:h-48">
            {ad.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ad.image}
                alt={ad.name ?? "Sponsored product"}
                className="size-full object-contain object-center transition-transform duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              <span className="grid size-full place-items-center bg-gray-50 text-[11px] font-bold text-gray-400">
                {(ad.name ?? "AD").slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          {/* …then the product NAME + price (+ live discount). End of card. */}
          <div className="px-3 pb-3 pt-1.5">
            <p className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-gray-800 md:text-[13.5px]">
              {ad.name ?? "Today's spotlight deal"}
            </p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[14px] font-black tracking-tight text-gray-900 md:text-[15px]">
                ₹{Math.round(price).toLocaleString("en-IN")}
              </span>
              {off > 0 && (
                <>
                  <span className="text-[11px] font-bold text-emerald-600">↓{off}%</span>
                  <span className="text-[11px] text-gray-400 line-through">
                    ₹{Math.round(mrp).toLocaleString("en-IN")}
                  </span>
                </>
              )}
            </p>
          </div>
        </Link>
      ) : (
        <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-xs font-semibold text-gray-400">
          Sponsored slot — no active campaign
        </div>
      )}
    </section>
  );
}