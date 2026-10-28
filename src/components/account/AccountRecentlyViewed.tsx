"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Raw = { name?: string; image?: string; slug?: string; id?: string };
type Tile = { name: string; image: string; slug?: string; id?: string };

// Same device-local history the PDP writes on every product view, so the strip is
// genuinely per-shopper/per-visit with no new storage and no server round-trip.
const RECENT_KEY = "vk:recent:v1";

export function AccountRecentlyViewed({ title = "Recently Viewed Stores" }: { title?: string }) {
  const [items, setItems] = useState<Tile[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_KEY);
      if (!raw) return;
      const list = JSON.parse(raw) as Raw[];
      if (!Array.isArray(list)) return;
      setItems(list.filter((r): r is Tile => Boolean(r && r.image && r.name)).slice(0, 12));
    } catch {
      /* private mode / corrupt storage: the strip simply stays hidden */
    }
  }, []);

  // Flipkart hides the section entirely when there's no history — match that.
  if (items.length === 0) return null;

  return (
    <section className="mt-6" aria-label={title}>
      <h2 className="px-4 font-display text-[16px] font-bold text-gray-900">{title}</h2>
      <div className="no-scrollbar mt-2 flex gap-3 overflow-x-auto px-4 pb-1">
        {items.map((it, i) => {
          const href = it.slug ? `/product/${it.slug}` : it.id ? `/product/${it.id}` : null;
          const tile = (
            <div className="flex w-[112px] shrink-0 flex-col">
              <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-gray-100 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={it.image}
                  alt={it.name}
                  loading="lazy"
                  className="size-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <p className="mt-1.5 line-clamp-2 text-center text-[11.5px] font-medium leading-tight text-gray-700">
                {it.name}
              </p>
            </div>
          );
          return href ? (
            <Link key={`${it.slug ?? it.id}-${i}`} href={href} className="group block">
              {tile}
            </Link>
          ) : (
            <div key={`${it.name}-${i}`} className="group block">
              {tile}
            </div>
          );
        })}
      </div>
    </section>
  );
}