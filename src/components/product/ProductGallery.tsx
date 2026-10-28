"use client";

import { useRef, useState } from "react";
import { Heart, Plus, Send, Star } from "lucide-react";
import { useToast } from "@/components/ui/Toaster";
import { FullImageView } from "@/components/product/FullImageView";

type GalleryImage = { url: string; isPrimary?: boolean; position?: number };
type Props = {
  images: GalleryImage[];
  name: string;
  productId: string;
  ratingAvg: number;
  ratingCount: number;
};

const compact = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

/** Heart with a small + badge on the corner — Flipkart wishlist style. */
function WishlistIcon({ saved, className = "size-4" }: { saved: boolean; className?: string }) {
  return (
    <span className="relative inline-block">
      <Heart className={`${className} ${saved ? "fill-rose-500 text-rose-500" : ""}`} />
      {!saved && (
        <span className="absolute -bottom-0.5 -right-1 grid size-3.5 place-items-center rounded-full bg-white text-gray-700 ring-1 ring-gray-300">
          <Plus className="size-2" />
        </span>
      )}
    </span>
  );
}

function OverlayButtons({ saved, onHeart, onShare }: {
  saved: boolean; onHeart: () => void; onShare: () => void;
}) {
  return (
    <div className="absolute right-2 top-2 z-10 flex flex-col gap-2">
      <button type="button" onClick={onHeart} aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
        className="grid size-9 place-items-center rounded-full bg-white/95 text-gray-700 shadow-md ring-1 ring-gray-200 transition-colors hover:text-rose-500">
        <WishlistIcon saved={saved} className="size-4" />
      </button>
      <button type="button" onClick={onShare} aria-label="Share"
        className="grid size-9 place-items-center rounded-full bg-white/95 text-gray-700 shadow-md ring-1 ring-gray-200 transition-colors hover:text-[#2874f0]">
        <Send className="size-4" />
      </button>
    </div>
  );
}

export function ProductGallery({ images, name, ratingAvg, ratingCount }: Props) {
  const toast = useToast();
  const railRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [saved, setSaved] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null);

  const list = images && images.length ? images : [];
  const count = list.length;

  function goTo(i: number) {
    const el = railRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  function onRailScroll() {
    const el = railRef.current;
    if (!el || el.clientWidth === 0) return;
    const next = Math.min(count - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth)));
    setIdx((cur) => (cur === next ? cur : next));
  }

  function onHeart() {
    setSaved((s) => !s);
    toast.push({ title: saved ? "Removed from wishlist" : "Saved to wishlist", body: name });
  }

  async function onShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) await navigator.share({ title: name, url });
      else { await navigator.clipboard.writeText(url); toast.push({ title: "Link copied", body: name }); }
    } catch { /* user dismissed the share sheet — ignore */ }
  }

  if (!count) {
    return <div className="h-[calc(100svh-21.5rem)] min-h-[20rem] w-full bg-gray-100" aria-label={name} />;
  }

  return (
    <>
      {/* MOBILE — Flipkart-style: full-bleed, near-full-height image,
          overlay actions, rating pill, dots. Selected Color label peeks in;
          swatch thumbnails stay below the fold until you scroll. */}
      <div className="md:hidden">
        <div className="relative -mx-4 bg-white">
          <div
            ref={railRef}
            onScroll={onRailScroll}
            className="flex snap-x snap-mandatory overflow-x-auto bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {list.map((im, i) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={i}
                src={im.url}
                alt={`${name} image ${i + 1}`}
                onClick={() => setZoom(i)}
                className="h-[calc(100svh-21.5rem)] min-h-[20rem] w-full shrink-0 snap-center object-contain"
              />
            ))}
          </div>

          <OverlayButtons saved={saved} onHeart={onHeart} onShare={onShare} />

          <span className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 rounded bg-white/95 px-1.5 py-0.5 text-[11px] font-bold text-gray-900 shadow-sm">
            {Number(ratingAvg).toFixed(1)} <Star className="size-3 fill-emerald-600 text-emerald-600" />
            <span className="font-semibold text-gray-500">{compact(ratingCount)}+</span>
          </span>
        </div>

        {/* Dots only — Flipkart mobile does not show a thumbnail strip */}
        <div className="mt-3 flex justify-center gap-1">
          {list.map((_, i) => (
            <button key={i} type="button" onClick={() => goTo(i)} aria-label={`Go to image ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === idx ? "w-4 bg-[#2874f0]" : "w-1.5 bg-gray-300"}`}
            />
          ))}
        </div>
      </div>

      {/* DESKTOP — uniform 2-col grid + right action rail (unchanged) */}
      <div className="hidden md:block">
        <div className="flex gap-3">
          <div className="grid flex-1 grid-cols-2 gap-3">
            {list.map((im, i) => (
              <figure key={i} className="group relative overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={im.url}
                  alt={`${name} image ${i + 1}`}
                  loading={i < 2 ? "eager" : "lazy"}
                  onClick={() => setZoom(i)}
                  className="aspect-[4/5] w-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
                />
              </figure>
            ))}
          </div>

          <div className="flex w-14 shrink-0 flex-col items-center gap-3 pt-1">
            <button type="button" onClick={onHeart} aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
              className="grid size-11 place-items-center rounded-full bg-white text-gray-700 shadow-md ring-1 ring-gray-200 transition-colors hover:text-rose-500">
              <WishlistIcon saved={saved} className="size-5" />
            </button>
            <button type="button" onClick={onShare} aria-label="Share"
              className="grid size-11 place-items-center rounded-full bg-white text-gray-700 shadow-md ring-1 ring-gray-200 transition-colors hover:text-[#2874f0]">
              <Send className="size-5" />
            </button>
          </div>
        </div>
      </div>

      {zoom !== null && (
        <FullImageView
          images={list.map((im) => ({ url: im.url, alt: `${name} image` }))}
          index={zoom}
          onIndex={setZoom}
          onClose={() => setZoom(null)}
        />
      )}
    </>
  );
}

export default ProductGallery;