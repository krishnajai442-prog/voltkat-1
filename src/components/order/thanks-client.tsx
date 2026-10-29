"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { inr } from "@/lib/utils";
import type { CardVM } from "@/lib/catalog";

// picsum/CDN guard: a dead URL degrades to a letter tile, never a broken icon.
export function GuardedImg({ src, name, className }: { src?: string | null; name: string; className?: string }) {
  const [bad, setBad] = useState(false);
  if (!src || bad)
    return <span aria-hidden className={`grid size-full place-items-center bg-gray-100 text-[11px] font-bold text-gray-400 ${className ?? ""}`}>{(name || "V").slice(0, 2).toUpperCase()}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} loading="lazy" onError={() => setBad(true)} className={className ?? "size-full object-contain p-1"} />
  );
}

// "You May Also Like..." — same co-purchase -> category -> brand -> global draw the
// buy-now sheet uses, so the suggestions are REAL rows, never invented.
export function RecommendationsRail({ seedId }: { seedId: string }) {
  const [list, setList] = useState<CardVM[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/feed/upsell?id=${encodeURIComponent(seedId)}&n=8`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive) setList(((j?.products ?? []) as CardVM[]).slice(0, 8)); })
      .catch(() => { if (alive) setList([]); });
    return () => { alive = false; };
  }, [seedId]);

  if (!list || list.length === 0) return null; // hide the rail rather than show an empty box

  return (
    <section className="mt-6">
      <h2 className="mb-3 font-display text-[15px] font-bold text-ink-900">You May Also Like...</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {list.map((p) => {
          const d = p.mrp > p.salePrice ? Math.round(((p.mrp - p.salePrice) / p.mrp) * 100) : 0;
          return (
            <a key={p.id} href={`/product/${p.slug}`} className="card flex w-[150px] shrink-0 flex-col p-2 no-underline transition-shadow hover:shadow-md">
              <span className="relative mb-2 aspect-square w-full overflow-hidden rounded-lg bg-canvas"><GuardedImg src={p.image} name={p.name} /></span>
              <p className="line-clamp-2 text-[12px] font-medium leading-snug text-ink-700">{p.name}</p>
              <p className="mt-1 flex flex-wrap items-baseline gap-1">
                <span className="text-[13px] font-bold tabular-nums text-ink-900">{inr(p.salePrice)}</span>
                {d > 0 && <span className="text-[10px] text-ink-300 line-through tabular-nums">{inr(p.mrp)}</span>}
                {d > 0 && <span className="text-[10px] font-bold text-emerald-600">{d}% off</span>}
              </p>
              {p.ratingAvg != null && (
                <p className="mt-1 inline-flex w-fit items-center gap-0.5 rounded bg-emerald-600 px-1 py-0.5 text-[10px] font-bold text-white">
                  {Number(p.ratingAvg).toFixed(1)} <Star className="size-2.5 fill-white" />
                </p>
              )}
            </a>
          );
        })}
      </div>
    </section>
  );
}