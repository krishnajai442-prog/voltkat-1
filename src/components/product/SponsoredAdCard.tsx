"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

export type AdCandidate = {
  id: string; slug: string; name: string;
  image: string | null; mrp: number; salePrice: number;
};

const ROTATE_MS = 3500;

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function SponsoredAdCard({ seed, products }: { seed: string; products: AdCandidate[] }) {
  const list = useMemo(() => (products ?? []).filter(Boolean), [products]);
  const start = useMemo(() => (list.length ? hash(seed) % list.length : 0), [seed, list.length]);
  const [idx, setIdx] = useState(start);
  const [paused, setPaused] = useState(false);

  // Advance through the candidates on an interval; pause while hovered/focused so a
  // shopper can actually click the one they're aiming at (real ad behaviour).
  useEffect(() => {
    if (list.length <= 1 || paused) return;
    const t = window.setInterval(() => setIdx((i) => (i + 1) % list.length), ROTATE_MS);
    return () => window.clearInterval(t);
  }, [list.length, paused]);

  if (list.length === 0) return null;
  const ad = list[idx] ?? list[0]!;
  const d = ad.mrp > ad.salePrice ? Math.round(((ad.mrp - ad.salePrice) / ad.mrp) * 100) : 0;

  return (
    <div
      className="relative min-h-[76px] overflow-hidden rounded-lg border border-gray-200 bg-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Static AD tag — never rotates, exactly like the reference. */}
      <span className="pointer-events-none absolute right-2 top-2 z-10 rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-500">
        Ad
      </span>

      {/* Whole card is one clickable link to the currently-shown product. */}
      <Link href={`/product/${ad.slug}`} className="absolute inset-0 z-20" aria-label={`Sponsored: ${ad.name}`} />

      {/* Rotating content: thumb + name + price row, slide-faded on each swap. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={ad.id}
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -18 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
          className="flex items-center gap-3 p-2.5 pr-12"
        >
          <span className="size-14 shrink-0 overflow-hidden rounded-md bg-gray-50">
            {ad.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ad.image} alt={ad.name} className="size-full object-contain" />
            ) : (
              <span className="grid size-full place-items-center bg-gray-100 text-[10px] font-bold text-gray-400">
                {ad.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[12.5px] font-medium text-gray-800">{ad.name}</span>
            <span className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
              {d > 0 && <span className="text-[11.5px] font-bold text-emerald-600">↓{d}%</span>}
              {d > 0 && <span className="text-[11px] text-gray-400 line-through">{inr(ad.mrp)}</span>}
              <span className="text-[12.5px] font-bold text-gray-900">{inr(ad.salePrice)}</span>
            </span>
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default SponsoredAdCard;