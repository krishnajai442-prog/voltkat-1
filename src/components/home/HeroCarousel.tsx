"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

// ASCII-only glyph (see home-slides.ts): no literal rupee in source, ever.
const RUPEE = "\u20B9";

type SlideProduct = {
  slug: string;
  name: string;
  image: string;
  salePrice: number;
  /** ONLY the admin-supplied per-slide artwork; null when that input was empty. */
  slideImage?: string | null;
  // real Product fields so the product slide can compose brand + spec line
  discountPercent?: number;
  brand?: string | null;
  color?: string | null;
  storage?: string | null;
  ram?: string | null;
};

type Slide = {
  id: string;
  imageUrl: string;
  art?: boolean;
  headline: string;
  highlight?: string;
  description?: string;
  badge?: string | null;
  ctaLabel: string;
  ctaHref: string;
  products?: SlideProduct[];
};

// Flipkart-style strip: several rounded banner cards visible at once, sliding one
// card per step with neighbours peeking. Card width + gap live in CSS vars so the
// inline translate calc follows the responsive layout without JS measurement.
// Heights nudged +~3% (180->186 / 220->227 / 280->288) to ease vertical crop on
// portrait products; shared by BOTH branches so the strip row stays aligned.
const CARD_VARS =
  "[--gap:8px] [--card-w:100%] sm:[--gap:16px] sm:[--card-w:60%] lg:[--card-w:47.5%]";

export function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [current, setCurrent] = useState(0);
  const [perView, setPerView] = useState(1);
  const total = slides.length;
  const maxIndex = Math.max(0, total - perView);

  // Cards per view: 1 on phones, 2 from sm up (lg shows 2 + a peek, like Flipkart).
  useEffect(() => {
    const mqSm = window.matchMedia("(min-width: 640px)");
    const apply = () => setPerView(mqSm.matches ? 2 : 1);
    apply();
    mqSm.addEventListener("change", apply);
    return () => mqSm.removeEventListener("change", apply);
  }, []);

  // Auto-play every 4 seconds, wrapping to the first position.
  useEffect(() => {
    if (maxIndex <= 0) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(timer);
  }, [maxIndex]);

  if (!slides.length) return null;

  const goTo = (n: number) => setCurrent(Math.min(Math.max(n, 0), maxIndex));

  return (
    <div className={`relative w-full ${CARD_VARS}`}>
      {/* SLIDES STRIP */}
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{
            gap: "var(--gap)",
            transform: `translateX(calc(${current} * (var(--card-w) * -1 - var(--gap))))`,
          }}
        >
          {slides.map((slide, idx) => {
            // art=true  -> admin designed full-bleed creative: object-cover edge-to-edge
            //            on a dark stage, UNCHANGED (the Samsung/bolt look).
            // art=false -> product-led slide: the photo is fitted FULL-BLEED (cover) so its
            //            own background IS the slide background -> no rectangle for ANY
            //            image type. Legibility now comes from a LOCALIZED translucent pad
            //            behind only the left copy (NOT a full-height gradient), so light
            //            white-canvas photos (MacBook/Pixel) no longer get bisected into a
            //            black-left / white-right slide; the product side stays pristine.
            const isArt = !!slide.art;
            const prod = slide.products?.[0];
            const img = isArt ? slide.imageUrl : (prod?.image || slide.imageUrl);
            const disc = prod?.discountPercent ?? 0;
            // spec line mirrors the reference ("Black, 512 GB (12 GB RAM)") from real cols
            const specParts: string[] = [];
            if (prod?.color) specParts.push(prod.color);
            if (prod?.storage) specParts.push(prod.storage + (prod.ram ? ` (${prod.ram} RAM)` : ""));
            else if (prod?.ram) specParts.push(`${prod.ram} RAM`);
            const specLine = specParts.join(", ");

            return (
              <Link
                key={idx}
                href={slide.ctaHref || "/products/all"}
                style={{ width: "var(--card-w)" }}
                className={`group relative block h-[186px] shrink-0 overflow-hidden rounded-xl shadow-sm ring-1 sm:h-[227px] lg:h-[288px] ${
                  isArt ? "bg-gray-900 ring-black/5" : "bg-white ring-gray-200/70"
                }`}
              >
                {isArt ? (
                  <>
                    {/* Pure artwork card (Flipkart-style banner): the uploaded image IS
                        the creative. Plain <img>: admin-pasted hosts are open-ended and an
                        unconfigured host through next/image would 500 the whole homepage. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.imageUrl}
                      alt={slide.headline}
                      loading={idx === 0 ? "eager" : "lazy"}
                      className="absolute inset-0 size-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                    <span className="absolute bottom-2 right-2 z-10 rounded bg-gray-200/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-600">
                      Ad
                    </span>
                  </>
                ) : (
                  <>
                    {/* IMAGE AS THE SLIDE: full-bleed cover so the photo's own canvas
                        (white / dark / colored) becomes the background -> zero rectangle.
                        NO full-height scrim here anymore (that was what bisected light
                        photos); the only overlay is the localized text pad below. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={prod?.name || slide.headline}
                      loading={idx === 0 ? "eager" : "lazy"}
                      className="absolute inset-0 z-0 size-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    {/* LOCALIZED LEGIBILITY PAD: a small rounded translucent panel behind
                        ONLY the left copy. Works on white, black or busy images alike
                        (white text on >=55% black is always readable), and leaves the
                        product side + the image's top/bottom-left corners completely
                        clean, so the photo's background still reads as the slide. */}
                    <span className="absolute inset-0 z-20 flex items-center px-3 sm:px-5 lg:px-7">
                      <span className="flex w-[58%] min-w-0 flex-col justify-center rounded-2xl bg-black/55 px-3 py-2.5 backdrop-blur-sm sm:w-[52%] sm:px-4 sm:py-3">
                        {disc > 0 && (
                          <span className="mb-1.5 inline-flex w-fit items-center rounded-full bg-yellow-400 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wide text-[#0a1024] shadow-sm sm:text-[10px]">
                            {disc}% OFF
                          </span>
                        )}
                        {prod?.brand && (
                          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60 sm:text-[11px]">
                            {prod.brand}
                          </span>
                        )}
                        <span className="mt-0.5 line-clamp-2 font-display text-[15px] font-extrabold leading-[1.1] text-white sm:line-clamp-3 sm:text-[18px] lg:text-[21px]">
                          {slide.headline}
                        </span>
                        {specLine && (
                          <>
                            <span className="mt-1 hidden line-clamp-1 text-[11px] text-white/70 sm:block sm:text-[12px]">
                              {specLine}
                            </span>
                            <span className="mt-1.5 hidden h-0.5 w-7 rounded-full bg-white/50 sm:block" />
                          </>
                        )}
                        <span className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                          <span className="text-[15px] font-black leading-none tabular-nums text-white sm:text-[17px] lg:text-[19px]">
                            {RUPEE}{Math.round(prod?.salePrice ?? 0).toLocaleString("en-IN")}
                          </span>
                          {disc > 0 && (
                            <span className="text-[10px] font-bold text-emerald-300 sm:text-[11px]">
                              {disc}% off
                            </span>
                          )}
                        </span>
                        <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-md bg-white px-3 py-1.5 text-[11px] font-bold text-[#2874f0] shadow-sm transition-transform group-hover:scale-105 sm:px-3.5 sm:py-2 sm:text-[12px]">
                          Shop Now <ArrowRight className="size-3.5" />
                        </span>
                      </span>
                    </span>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* DOT INDICATORS (one per strip position, centered below like Flipkart) */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => goTo(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              current === idx
                ? "w-5 bg-gray-700 shadow-[0_0_4px_rgba(0,0,0,0.4)]"
                : "w-1.5 bg-gray-300 hover:bg-gray-400"
            }`}
          />
        ))}
      </div>

      {/* OPTIONAL ARROWS FOR DESKTOP */}
      <button
        onClick={() => goTo(current - 1)}
        className="absolute left-2 top-[90px] z-20 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50 sm:top-[110px] md:grid lg:top-[140px]"
        aria-label="Previous slide"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        onClick={() => goTo(current + 1)}
        className="absolute right-2 top-[90px] z-20 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50 sm:top-[110px] md:grid lg:top-[140px]"
        aria-label="Next slide"
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}