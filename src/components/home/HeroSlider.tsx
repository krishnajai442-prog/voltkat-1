"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { gradientFor } from "@/lib/slide-gradients";
import type { HeroSlideVM } from "@/lib/home-slides";
import { cn, inr } from "@/lib/utils";

export function HeroSlider({ slides }: { slides: HeroSlideVM[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);
  const count = slides.length;

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  useEffect(() => {
    if (count <= 1 || paused) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (!count) return null;

  const go = (n: number) => setIndex((n + count) % count);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured collections"
      className="relative isolate overflow-hidden bg-ink-900 text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchStart.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        const end = e.changedTouches[0]?.clientX;
        if (start == null || end == null) return;

        const diff = end - start;
        if (Math.abs(diff) > 50) {
          go(diff > 0 ? index - 1 : index + 1);
        }

        touchStart.current = null;
      }}
    >
      <div className="relative min-h-[30rem] sm:min-h-[34rem] lg:min-h-[38rem]">
        {slides.map((slide, i) => {
          const g = gradientFor(slide.gradient);
          const main = slide.products[0];
          const extras = slide.products.slice(1, 3);

          return (
            <div
              key={slide.id}
              aria-hidden={i !== index}
              className={cn(
                "absolute inset-0 transition-opacity duration-700 ease-out",
                i === index ? "opacity-100" : "pointer-events-none opacity-0",
                g.stage,
              )}
            >
              <div className="container-x relative grid min-h-[30rem] items-center gap-8 py-10 sm:min-h-[34rem] lg:grid-cols-[1.05fr_0.95fr] lg:min-h-[38rem]">
                <div>
                  <span
                    className={cn(
                      "inline-flex rounded-full bg-gradient-to-r px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow",
                      g.badge,
                    )}
                  >
                    {slide.badge}
                  </span>

                  <h1 className="mt-4 font-display text-[clamp(2rem,5vw,3.35rem)] font-bold leading-[1.05]">
                    {slide.headline}{" "}
                    {slide.highlight && (
                      <span
                        className={cn(
                          "bg-gradient-to-r bg-clip-text text-transparent",
                          g.headline,
                        )}
                      >
                        {slide.highlight}
                      </span>
                    )}
                  </h1>

                  {slide.description && (
                    <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-white/65">
                      {slide.description}
                    </p>
                  )}

                  <div className="mt-6 flex flex-wrap gap-2.5">
                    <Link
                      href={slide.ctaHref ?? "/products/all"}
                      className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-6 text-[13.5px] font-bold text-ink-900 transition-colors hover:bg-electric-50"
                    >
                      {slide.ctaLabel}
                    </Link>

                    {slide.secondaryLabel && (
                      <Link
                        href={slide.secondaryHref ?? "/offers"}
                        className="inline-flex h-12 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-6 text-[13.5px] font-bold text-white transition-colors hover:bg-white/20"
                      >
                        {slide.secondaryLabel}
                      </Link>
                    )}
                  </div>

                  {main && (
                    <div className="mt-6 flex flex-wrap items-center gap-3 text-[12.5px] text-white/55">
                      <span>Starting {inr(main.salePrice)}</span>
                      {main.discountPercent > 0 && (
                        <Badge
                          tone="deal"
                          className="bg-white/12 text-amber-300 ring-white/20"
                        >
                          {main.discountPercent}% off
                        </Badge>
                      )}
                      <span>{slide.products.length} highlighted</span>
                    </div>
                  )}
                </div>

                <div className="relative min-h-[18rem]">
                  <div
                    className={cn(
                      "absolute left-1/2 top-1/2 size-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl",
                      g.glow,
                    )}
                  />

                  {main ? (
                    <div className="relative mx-auto aspect-square w-full max-w-[24rem]">
                      <div
                        className={cn(
                          "absolute inset-4 rounded-[2rem] bg-white/5 ring-1 backdrop-blur",
                          g.ring,
                        )}
                      />

                      <Image
                        src={main.image}
                        alt={main.name}
                        fill
                        priority={i === 0}
                        sizes="(max-width: 1024px) 80vw, 420px"
                        className="relative z-10 object-contain p-6 drop-shadow-2xl"
                      />

                      <div className="absolute bottom-2 left-1/2 z-20 w-max max-w-[90%] -translate-x-1/2 truncate rounded-full bg-ink-950/70 px-3 py-1.5 text-[12px] font-bold text-white backdrop-blur">
                        {main.name}
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-white/30">
                      No product linked
                    </div>
                  )}

                  <div className="absolute -bottom-2 right-0 flex gap-2">
                    {extras.map((p) => (
                      <Link
                        key={p.slug}
                        href={`/product/${p.slug}`}
                        className="group relative size-20 overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur sm:size-24"
                      >
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          sizes="96px"
                          className="object-contain p-2 transition-transform group-hover:scale-105"
                        />
                        <span className="absolute inset-x-1 bottom-1 truncate rounded bg-ink-950/70 px-1.5 py-0.5 text-[9.5px] font-bold">
                          {inr(p.salePrice)}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => go(index - 1)}
        aria-label="Previous slide"
        className="absolute left-3 top-1/2 z-20 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 md:grid"
      >
        <ChevronLeft className="size-5" />
      </button>

      <button
        type="button"
        onClick={() => go(index + 1)}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 z-20 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 md:grid"
      >
        <ChevronRight className="size-5" />
      </button>

      <div className="absolute inset-x-0 bottom-4 z-20 flex items-center justify-center gap-2">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => go(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === index}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === index ? "w-7 bg-white" : "w-2.5 bg-white/35 hover:bg-white/60",
            )}
          />
        ))}

        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Resume carousel" : "Pause carousel"}
          className="ml-2 grid size-7 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
        >
          {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
        </button>
      </div>
    </section>
  );
}