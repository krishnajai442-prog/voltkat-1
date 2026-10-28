"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Maximize2, ZoomIn } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function Gallery({ images, badge }: { images: { url: string; alt: string }[]; badge?: string }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const frame = useRef<HTMLDivElement>(null);
  const list = images.length ? images : [{ url: "https://picsum.photos/seed/voltkart/900/900", alt: "Product" }];
  const current = list[Math.min(index, list.length - 1)]!;

  function onMove(e: React.MouseEvent) {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect) return;
    setOrigin({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
  }

  return (
    <div>
      <div
        ref={frame}
        onMouseEnter={() => setZoom(true)}
        onMouseLeave={() => setZoom(false)}
        onMouseMove={onMove}
        className="group relative aspect-square overflow-hidden rounded-2xl border border-hairline bg-white"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={current.url}
            initial={{ opacity: 0.6, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-0"
          >
            <Image
              src={current.url}
              alt={current.alt}
              fill
              priority
              sizes="(max-width: 1024px) 92vw, 520px"
              className={cn("object-contain p-4 transition-transform duration-200", zoom && "scale-[2.1]")}
              style={{ transformOrigin: `${origin.x}% ${origin.y}%` }}
            />
          </motion.div>
        </AnimatePresence>

        {badge && (
          <span className="absolute left-3 top-3 rounded-lg bg-gradient-to-r from-flame-500 to-orange-deal px-2.5 py-1 text-[11.5px] font-bold text-white shadow">
            {badge}
          </span>
        )}
        <span className="pointer-events-none absolute right-3 top-3 hidden items-center gap-1 rounded-lg bg-ink-900/80 px-2 py-1 text-[10.5px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
          <ZoomIn className="size-3" /> Hover to zoom
        </span>
        <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-white to-transparent py-3 text-[11px] font-semibold text-ink-300">
          <Maximize2 className="size-3" /> {list.length} photo{list.length > 1 ? "s" : ""}
        </span>
      </div>

      {list.length > 1 && (
        <div role="tablist" aria-label="Product images" className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {list.map((img, i) => (
            <button
              key={img.url + i}
              role="tab"
              aria-selected={i === index}
              aria-label={`View image ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition-all",
                i === index ? "border-electric-500 shadow-glow" : "border-hairline hover:border-electric-300",
              )}
            >
              <Image src={img.url} alt="" fill sizes="64px" className="object-contain p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}