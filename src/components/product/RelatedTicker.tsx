"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Item = {
  slug?: string;
  id?: string;
  name?: string;
  image?: string;
  price?: number;
  mrp?: number;
  discountPercent?: number;
};

export function RelatedTicker({ items }: { items: Item[] }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || items.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 3000);
    return () => clearInterval(t);
  }, [paused, items.length]);

  if (!items.length) return null;
  const it = items[idx % items.length] as any;
  const href = `/product/${it.slug ?? it.id}`;
  const price = Number(it.price ?? it.salePrice ?? 0);
  const mrp = Number(it.mrp ?? price);
  const off = Number(
    it.discountPercent ?? (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0),
  );

  return (
    <div
      className="container-x pt-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Similar products"
    >
      <Link
        key={idx}
        href={href}
        className="flex animate-[ticker-in_0.45s_ease] items-center gap-3 rounded-lg border bg-white px-3 py-2 shadow-sm transition-colors hover:bg-gray-50"
      >
        {it.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={it.image} alt="" className="size-10 shrink-0 rounded object-cover" />
        ) : (
          <span className="grid size-10 shrink-0 place-items-center rounded bg-gray-100 text-xs font-black text-gray-500">
            {String(it.name ?? "V").charAt(0)}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-gray-900">{it.name}</span>
          <span className="block text-xs">
            {off > 0 && <span className="font-bold text-green-600">↓{off}% </span>}
            <span className="font-black text-gray-900">₹{price.toLocaleString("en-IN")}</span>
            {mrp > price && (
              <span className="ml-1 text-gray-400 line-through">₹{mrp.toLocaleString("en-IN")}</span>
            )}
          </span>
        </span>
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-gray-500">
          Similar
        </span>
      </Link>
    </div>
  );
}