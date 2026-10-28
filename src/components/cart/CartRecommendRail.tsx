"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ProductThumb } from "@/components/cart/ProductThumb";
import { useCart } from "@/context/CartContext";
import { inr } from "@/lib/utils";
import type { CardVM } from "@/lib/catalog";

const RECENT_KEY = "vk:recent:v1"; // same history the PDP / account rail write

export function CartRecommendRail({
  title,
  subtitle,
  source,
  exclude = [],
  count = 12,
}: {
  title: string;
  subtitle?: string;
  source: "random" | "recent";
  exclude?: string[];
  count?: number;
}) {
  const { add } = useCart();
  const [items, setItems] = useState<CardVM[] | null>(null);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      let url = "";
      if (source === "random") {
        const qs = new URLSearchParams({ n: String(count) });
        if (exclude.length) qs.set("exclude", exclude.join(","));
        url = `/api/feed/cart-recommendations?${qs}`;
      } else {
        let ids: string[] = [];
        try {
          const raw = window.localStorage.getItem(RECENT_KEY);
          const list = raw ? (JSON.parse(raw) as Array<{ id?: string }>) : [];
          ids = (Array.isArray(list) ? list : []).map((r) => r.id ?? "").filter(Boolean);
        } catch { ids = []; }
        const ex = new Set(exclude);
        const final = (exclude.length ? ids.filter((id) => !ex.has(id)) : ids).slice(0, count);
        if (!final.length) { if (alive) setItems([]); return; }
        url = `/api/feed/cart-recommendations?ids=${final.join(",")}`;
      }
      try {
        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json()) as { ok: boolean; products?: CardVM[] };
        if (alive) setItems(json.ok && Array.isArray(json.products) ? json.products : []);
      } catch { if (alive) setItems([]); }
    };
    void run();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, exclude.join(","), count]);

  if (!items || items.length === 0) return null;

  return (
    <section className="card p-4">
      <div className="mb-3">
        <h2 className="font-display text-[14px] font-bold text-ink-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[12px] text-ink-400">{subtitle}</p>}
      </div>
      <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {items.map((p) => (
          <div key={p.id} className="flex w-36 shrink-0 flex-col">
            <Link href={`/product/${p.slug}`} className="relative block aspect-square overflow-hidden rounded-xl bg-canvas">
              <ProductThumb src={p.image} name={p.name} />
            </Link>
            <Link href={`/product/${p.slug}`} className="mt-2 line-clamp-2 min-h-[2.1rem] text-[12px] font-semibold leading-snug text-ink-900 hover:text-electric-600">
              {p.name}
            </Link>
            <p className="mt-1 flex flex-wrap items-baseline gap-1">
              <span className="text-[12.5px] font-bold tabular-nums text-ink-900">{inr(p.salePrice)}</span>
              {p.mrp > p.salePrice && <span className="text-[11px] text-ink-300 line-through tabular-nums">{inr(p.mrp)}</span>}
            </p>
            {p.discountPercent > 0 && <span className="mt-0.5 text-[11px] font-bold text-emerald-600">{p.discountPercent}% off</span>}
            <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => void add(p.id)}>
              Add to cart
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}