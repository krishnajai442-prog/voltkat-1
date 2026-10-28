"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

/**
 * Full-size image preview for admin editors. Click a thumbnail in the Images /
 * Showcase rows to confirm WHICH image is stored — the small object-cover crop in
 * the row can't show a tall banner in full; this can (object-contain, max-h 82vh).
 *
 * Same interaction model as the app's other overlays (FullImageView / ShowCaseDrawer):
 * Esc closes, backdrop click closes, body scroll locked while open, fade + zoom in.
 * Portal-less fixed overlay (z-[100]) like the rest of the codebase's modals.
 *
 * Every <button> here is type="button" ON PURPOSE: this renders inside the product
 * <form> (via ProductForm's gallery rows), so an untyped button would submit the form.
 */
export function ImagePreviewModal({ url, onClose }: { url: string; onClose: () => void }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(r);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!url) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      onClick={onClose}
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 transition-opacity duration-200 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
      >
        <X className="size-5" />
      </button>

      <figure
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-full max-w-full flex-col items-center gap-3 transition-transform duration-200 ${
          shown ? "scale-100" : "scale-95"
        }`}
      >
        <img
          src={url}
          alt="Preview"
          // eslint-disable-next-line @next/next/no-img-element
          className="max-h-[82vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
          draggable={false}
        />
        <figcaption
          className="max-w-[92vw] truncate font-mono text-[11.5px] text-white/70"
          title={url}
        >
          {url}
        </figcaption>
      </figure>
    </div>
  );
}

export default ImagePreviewModal;