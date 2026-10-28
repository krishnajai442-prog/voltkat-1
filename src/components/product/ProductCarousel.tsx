"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Star } from "lucide-react";

export type CarouselItem = {
  id?: string;
  slug?: string;
  name?: string;
  brand?: string | null;
  image?: string | null;
  price?: number | null;
  mrp?: number | null;
  rating?: number | null;
  ratingCount?: number | null;
  badge?: "trending" | "bestseller" | null;
};

const inr = (n?: number | null) =>
  typeof n === "number" && Number.isFinite(n) ? `₹${n.toLocaleString("en-IN")}` : "—";

const offPct = (mrp?: number | null, price?: number | null) =>
  typeof mrp === "number" && typeof price === "number" && mrp > 0 && price < mrp
    ? Math.round(((mrp - price) / mrp) * 100) : 0;

function MiniStars({ value }: { value?: number | null }) {
  const v = typeof value === "number" ? value : 0;
  return (
    <span className="inline-flex items-center gap-px text-amber-400" aria-label={`${v} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`size-3 ${i <= Math.round(v) ? "fill-current" : "fill-none text-gray-300"}`} />
      ))}
    </span>
  );
}

const BADGE: Record<string, string> = {
  trending: "bg-orange-500 text-white",
  bestseller: "bg-[#2874f0] text-white",
};

export function ProductCarousel({ title, items, actionHref, actionLabel, eta }: {
  title: string; items: CarouselItem[]; actionHref?: string; actionLabel?: string; eta?: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  function scrollRail() {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const next = el.scrollLeft + el.clientWidth * 0.8;
    el.scrollTo({ left: next > max - 8 ? 0 : next, behavior: "smooth" });
  }

  if (!items.length) return null;
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-[15px] font-bold text-gray-900">{title}</h2>
        {actionHref ? (
          <Link href={actionHref} className="text-[12.5px] font-semibold text-[#2874f0] hover:underline">
            {actionLabel ?? "View all"}
          </Link>
        ) : (
          <button type="button" onClick={scrollRail} aria-label={`Scroll ${title}`}
            className="grid size-8 place-items-center rounded-full bg-gray-900 text-white transition-colors hover:bg-gray-700">
            <ArrowRight className="size-4" />
          </button>
        )}
      </div>

      <div className="relative">
        <div ref={railRef} className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((p, i) => {
            const off = offPct(p.mrp, p.price);
            const card = (
              <div className="flex w-[150px] shrink-0 flex-col">
                <div className="relative mb-2 aspect-square overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                  {p.badge ? (
                    <span className={`absolute left-1.5 top-1.5 z-10 rounded px-1.5 py-0.5 text-[10px] font-bold ${BADGE[p.badge] ?? ""}`}>
                      {p.badge === "trending" ? "Trending" : "Bestseller"}
                    </span>
                  ) : null}
                  {p.image
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={p.image} alt={p.name ?? ""} loading="lazy" className="size-full object-contain" />
                    : <div className="grid size-full place-items-center text-gray-300"><Star className="size-7" /></div>}
                  {typeof p.rating === "number" ? (
                    <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-white/95 px-1.5 py-0.5 text-[11px] font-semibold text-gray-900 shadow-sm">
                      {p.rating.toFixed(1)} <MiniStars value={p.rating} />
                    </span>
                  ) : null}
                </div>
                {p.brand ? <p className="mb-0.5 truncate text-[10.5px] font-semibold uppercase tracking-wide text-gray-400">{p.brand}</p> : null}
                <p className="line-clamp-2 min-h-[2.1rem] text-[12.5px] font-medium leading-snug text-gray-900">{p.name ?? "—"}</p>
                <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
                  {off > 0 ? <span className="text-[12px] font-bold text-emerald-600">{off}% OFF</span> : null}
                  {p.mrp && off > 0 ? <span className="text-[11.5px] text-gray-400 line-through">{inr(p.mrp)}</span> : null}
                  <span className="text-[13px] font-bold text-gray-900">{inr(p.price)}</span>
                </div>
                {eta ? <p className="mt-0.5 text-[11px] text-gray-500">Get it by <span className="font-semibold text-gray-700">{eta}</span></p> : null}
              </div>
            );
            return p.slug
              ? <Link key={p.id ?? i} href={`/product/${p.slug}`} className="block">{card}</Link>
              : <div key={p.id ?? i}>{card}</div>;
          })}
        </div>

        <button type="button" onClick={scrollRail} aria-label={`Next ${title}`}
          className="absolute -right-2 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white text-gray-700 shadow-md ring-1 ring-gray-200 transition-colors hover:text-gray-900">
          <ChevronRight className="size-5" />
        </button>
      </div>
    </section>
  );
}

export default ProductCarousel;