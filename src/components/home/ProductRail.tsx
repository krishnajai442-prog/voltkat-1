"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import type { CardVM } from "@/lib/catalog";

export function ProductRail({ items }: { items: CardVM[] }) {
  const ref = useRef<HTMLDivElement>(null);

  if (!items.length) return null;

  const scroll = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({
      left: dir * el.clientWidth * 0.8,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label="Scroll left"
        className="absolute -left-2 top-1/2 z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full border border-hairline bg-white text-ink-700 shadow-soft hover:border-electric-300 md:grid"
      >
        <ChevronLeft className="size-4" />
      </button>

      <div
        ref={ref}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1"
      >
        {items.map((p) => (
          <div
            key={p.id}
            className="w-[62%] shrink-0 snap-start sm:w-[38%] md:w-[30%] lg:w-[23.5%] xl:w-[19%]"
          >
            <ProductCard product={p} compact />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label="Scroll right"
        className="absolute -right-2 top-1/2 z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full border border-hairline bg-white text-ink-700 shadow-soft hover:border-electric-300 md:grid"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}