"use client";

import { useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type LightboxImage = { url: string; alt?: string | null };

export function FullImageView({ images, index, onIndex, onClose }: {
  images: LightboxImage[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const count = images.length;
  const prev = useCallback(() => onIndex((index - 1 + count) % count), [index, count, onIndex]);
  const next = useCallback(() => onIndex((index + 1) % count), [index, count, onIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, onClose]);

  useEffect(() => {
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = old; };
  }, []);

  if (count === 0) return null;
  const cur = images[index] ?? images[0]!;

  return (
    // White field, exactly like Flipkart's /full-image-view: the product asset's
    // own white canvas blends in, so no rectangle/seam is visible around it.
    <div className="fixed inset-0 z-[70] bg-white" role="dialog" aria-modal="true" aria-label="Product image viewer">
      {/* Bare dark glyph (no chip) — reads on white just like the reference's ×. */}
      <button type="button" onClick={onClose} aria-label="Close full image view"
        className="absolute left-3 top-3 z-10 grid size-10 place-items-center rounded-full text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900">
        <X className="size-5" />
      </button>

      {count > 1 && (
        <>
          {/* White chips need a ring to stay visible on a white page. */}
          <button type="button" onClick={prev} aria-label="Previous image"
            className="absolute left-3 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-lg bg-white text-gray-800 shadow-md ring-1 ring-gray-200 hover:bg-gray-50">
            <ChevronLeft className="size-5" />
          </button>
          <button type="button" onClick={next} aria-label="Next image"
            className="absolute right-3 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-lg bg-white text-gray-800 shadow-md ring-1 ring-gray-200 hover:bg-gray-50">
            <ChevronRight className="size-5" />
          </button>
        </>
      )}

      <div className="flex h-full w-full items-center justify-center p-6 pb-16" onClick={onClose}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cur.url}
          alt={cur.alt ?? ""}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[82vh] max-w-[92vw] select-none object-contain"
          draggable={false}
        />
      </div>

      {count > 1 && (
        <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-1.5">
          {images.map((im, i) => (
            <button key={im.url + i} type="button" aria-label={`Go to image ${i + 1}`} onClick={() => onIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-gray-700" : "w-1.5 bg-gray-300 hover:bg-gray-400"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

export default FullImageView;