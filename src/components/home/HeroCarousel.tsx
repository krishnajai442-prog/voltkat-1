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
            // The admin's per-product "Slide image" (if any) is the card's
            // full-bleed background — Flipkart-style, edge-to-edge, never a
            // contained thumbnail in a white box. Placeholder photo only when
            // that input is empty; never the product's primary gallery image.
            const feat = slide.products?.find((p) => p.slideImage);

            return (
              <Link
                key={idx}
                href={slide.ctaHref || "/products/all"}
                style={{ width: "var(--card-w)" }}
                className="group relative block h-[180px] shrink-0 overflow-hidden rounded-xl bg-gray-900 shadow-sm ring-1 ring-black/5 sm:h-[220px] lg:h-[280px]"
              >
                {slide.art ? (
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={feat?.slideImage || slide.imageUrl}
                      alt={feat?.name || slide.headline}
                      loading={idx === 0 ? "eager" : "lazy"}
                      className="absolute inset-0 size-full object-cover object-center opacity-90 transition-opacity group-hover:opacity-80"
                    />

                    {/* Gradient overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

                    {/* Content overlay */}
                    <div className="relative z-10 flex h-full flex-col justify-center px-4 text-white sm:px-6 lg:px-8">
                      {slide.badge && (
                        <span className="mb-1.5 inline-flex w-fit items-center gap-1 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-black shadow-sm animate-pulse">
                          ⚡ {slide.badge}
                        </span>
                      )}
                      <h1 className="max-w-2xl font-display text-lg font-extrabold leading-tight drop-shadow-lg sm:text-2xl lg:text-3xl">
                        {slide.headline}
                        {slide.highlight && (
                          <>
                            <br />
                            <span className="text-yellow-300">{slide.highlight}</span>
                          </>
                        )}
                      </h1>
                      {slide.description && (
                        <p className="mt-1.5 line-clamp-2 max-w-lg text-[11px] text-gray-200 sm:text-sm">
                          {slide.description}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-sm bg-white px-4 py-1.5 text-xs font-bold text-[#2874f0] shadow-lg transition-transform group-hover:scale-105">
                          {slide.ctaLabel || "Shop Now"}
                        </span>
                      </div>
                    </div>
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