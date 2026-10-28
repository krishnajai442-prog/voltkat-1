"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type SponsoredItem = {
  key: string;
  href: string;
  image: string;
  name: string;
  price: number;
  off: number;
};

/**
 * The account page's Sponsored slot as ONE feature card that slides right-to-left
 * every 4s through the server-supplied random pool. No dots, no arrows, no "View
 * all" — the motion itself is the pagination. The pool is re-randomized per request
 * over ALL active+in-stock products, so this is a dynamic ad: anything you publish
 * later can appear on the next page load with no code change.
 */
export function AccountSponsoredCard({ items }: { items: SponsoredItem[] }) {
  const [index, setIndex] = useState(0);
  const count = items.length;

  useEffect(() => {
    if (count <= 1) return; // nothing to rotate
    // Auto-advancing content with no controls should yield to reduced-motion; the
    // first card still shows. Drop this guard if you want it to move regardless.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % count), 4000);
    return () => window.clearInterval(t);
  }, [count]);

  if (count === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl shadow-sm">
      {/* No gap on the track: each child is exactly w-full, so -index*100% slides
          precisely one card per step (right-to-left as index grows). */}
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {items.map((it) => (
          <Link
            key={it.key}
            href={it.href}
            className="relative flex w-full shrink-0 items-center gap-4 bg-gradient-to-r from-[#101c30] to-[#2874f0] p-4 text-white"
          >
            <span className="absolute right-2 top-2 rounded bg-white/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest">
              Sponsored
            </span>
            {it.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.image} alt="" className="size-20 shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="grid size-20 shrink-0 place-items-center rounded-lg bg-white/10 text-2xl font-black">
                {it.name.charAt(0) || "V"}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{it.name}</span>
              <span className="mt-1 block text-lg font-black">
                ₹{it.price.toLocaleString("en-IN")}
              </span>
              {it.off > 0 && (
                <span className="mt-0.5 block text-[11px] font-semibold text-yellow-300">
                  {it.off}% off · Deal of the day
                </span>
              )}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}