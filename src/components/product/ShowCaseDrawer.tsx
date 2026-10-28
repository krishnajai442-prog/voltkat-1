"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, X } from "lucide-react";

/**
 * Showcase viewer, responsive by design:
 *  - MOBILE (<md): full-screen opaque "← Product Details" sheet (Fade in). UNCHANGED.
 *  - DESKTOP (>=md): right-side drawer (~28rem) over a dimmed backdrop, slides in from
 *    the right, closed by an ✕ — matching Flipkart's desktop "Product Details" panel.
 *
 * Both variants are always in the DOM but exactly one is `display:none` at a time
 * (`md:hidden` / `hidden md:block`), so there is no matchMedia/hydration flash and the
 * hidden branch is absent from the accessibility tree. Shared state (open/onClose/images)
 * and the Esc + body-scroll-lock behaviour are identical across breakpoints.
 */
export function ShowCaseDrawer({ images, open, onClose, title = "Product Details" }: {
  images: string[];
  open: boolean;
  onClose: () => void;
  title?: string;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!open) { setShown(false); return; }
    const r = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(r);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  const list = Array.isArray(images) ? images.filter(Boolean) : [];

  // One banner stack, reused by both layouts so the image rendering never diverges.
  const stack = list.length === 0 ? (
    <p className="p-6 text-center text-[13px] text-gray-500">No showcase images yet.</p>
  ) : (
    <div className="flex flex-col">
      {list.map((url, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={url + i} src={url} alt={`Showcase ${i + 1}`}
          className="block h-auto w-full select-none" draggable={false} loading={i === 0 ? "eager" : "lazy"} />
      ))}
    </div>
  );

  return (
    <>
      {/* MOBILE — full-screen sheet (exactly the previous behaviour, + md:hidden) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed inset-0 z-[80] flex flex-col bg-white transition-opacity duration-200 md:hidden ${
          shown ? "opacity-100" : "opacity-0"
        }`}
      >
        <header className="flex shrink-0 items-center gap-3 bg-[#2874f0] px-3 py-3 text-white">
          <button type="button" onClick={onClose} aria-label="Back"
            className="grid size-9 place-items-center rounded-full transition-colors hover:bg-white/15">
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="font-display text-[15px] font-bold">{title}</h2>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white">{stack}</div>
      </div>

      {/* DESKTOP — backdrop + right drawer that slides in from the edge */}
      <div className="fixed inset-0 z-[80] hidden md:block" role="dialog" aria-modal="true" aria-label={title}>
        <div
          onClick={onClose}
          className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
            shown ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-0 top-0 flex h-full w-[28rem] max-w-[92vw] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
            shown ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <header className="flex shrink-0 items-center gap-3 bg-[#2874f0] px-4 py-3 text-white">
            <button type="button" onClick={onClose} aria-label="Close"
              className="grid size-8 place-items-center rounded-full transition-colors hover:bg-white/15">
              <X className="size-5" />
            </button>
            <h2 className="font-display text-[15px] font-bold">{title}</h2>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white">{stack}</div>
        </aside>
      </div>
    </>
  );
}

export default ShowCaseDrawer;