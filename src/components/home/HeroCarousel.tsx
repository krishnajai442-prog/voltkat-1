"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type SlideProduct = {
  slug: string;
  name: string;
  image: string;
  salePrice: number;
  /** ONLY the admin-supplied per-slide artwork; null when that input was empty. */
  slideImage?: string | null;
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
            // art=true  -> admin designed full-bleed creative (cover, edge-to-edge).
            // art=false -> product-led slide: show the WHOLE product contained on a
            //            light stage, exactly like a product card, never cropped.
            const isArt = !!slide.art;
            const prod = slide.products?.[0];
            const img = isArt ? slide.imageUrl : (prod?.image || slide.imageUrl);

            return (
              <Link
                key={idx}
                href={slide.ctaHref || "/products/all"}
                style={{ width: "var(--card-w)" }}
                className={`group relative block h-[180px] shrink-0 overflow-hidden rounded-xl shadow-sm ring-1 sm:h-[220px] lg:h-[280px] ${
                  isArt ? "bg-gray-900 ring-black/5" : "bg-gradient-to-r from-sky-50 via-white to-indigo-50/60 ring-gray-200/70"
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
                    {/* soft glow behind the product, like the reference creative */}
                    <span aria-hidden className="pointer-events-none absolute right-[-10%] top-1/2 size-40 -translate-y-1/2 rounded-full bg-sky-200/50 blur-2xl sm:size-56" />
                    <span className="relative z-10 flex h-full items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
                      <span className="min-w-0 flex-1">
                        {slide.badge && (
                          <span className="mb-1.5 inline-flex w-fit items-center gap-1 rounded-full bg-[#2874f0] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white shadow">
                            {slide.badge}
                          </span>
                        )}
                        <h2 className="max-w-md font-display text-base font-extrabold leading-tight text-gray-900 sm:text-xl lg:text-2xl">
                          {slide.headline}
                          {slide.highlight && (
                            <>
                              <br />
                              <span className="text-[#2874f0]">{slide.highlight}</span>
                            </>
                          )}
                        </h2>
                        {slide.description && (
                          <p className="mt-1 line-clamp-2 max-w-xs text-[11px] text-gray-500 sm:text-[12.5px]">
                            {slide.description}
                          </p>
                        )}
                        <span className="mt-2.5 inline-flex items-center rounded-sm bg-[#2874f0] px-3.5 py-1.5 text-[11px] font-bold text-white shadow transition-transform group-hover:scale-105 sm:text-xs">
                          {slide.ctaLabel || "Shop Now"}
                        </span>
                      </span>
                      <span className="relative h-full w-[40%] shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img}
                          alt={prod?.name || slide.headline}
                          loading={idx === 0 ? "eager" : "lazy"}
                          className="absolute inset-0 size-full object-contain object-center drop-shadow-xl transition-transform duration-500 group-hover:scale-[1.03]"
                        />
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