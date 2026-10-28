"use client";

import { SlidersHorizontal } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { SORT_OPTIONS } from "@/lib/catalog";
import { Drawer } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function ListingToolbar({
  total,
  loading,
  filterSlot,
  crumb,
}: {
  total: number;
  loading?: boolean;
  filterSlot: React.ReactNode;
  crumb: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const sort = params.get("sort") ?? "popular";

  return (
    <>
      <div className="sticky top-16 z-30 -mx-4 mb-4 flex items-center gap-3 border-b border-hairline bg-canvas/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:bg-white/90 sm:px-4 lg:top-[68px]">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-ink-900">
            {crumb} <span className="font-normal text-ink-400">· {total.toLocaleString("en-IN")} products</span>
          </p>
          {params.get("q") && <p className="truncate text-[11.5px] text-ink-400">Results for “{params.get("q")}”</p>}
        </div>

        <button
          onClick={() => setOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-hairline bg-white px-3 text-[12.5px] font-bold text-ink-700 lg:hidden"
        >
          <SlidersHorizontal className="size-3.5" /> Filters
        </button>

        <label className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-400">
          <span className="hidden sm:inline">Sort by</span>
          <select
            value={sort}
            onChange={(e) => {
              const next = new URLSearchParams(params.toString());
              next.set("sort", e.target.value);
              next.delete("page");
              router.push(`?${next.toString()}`, { scroll: false });
            }}
            className="h-9 rounded-lg border border-hairline bg-white px-2 text-[12.5px] font-semibold text-ink-900 outline-none focus:border-electric-400"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && (
        <div className="mb-3 h-0.5 w-full overflow-hidden rounded-full bg-electric-50">
          <div className="h-full w-1/3 animate-[marquee_1.2s_linear_infinite] bg-electric-500" />
        </div>
      )}

      <Drawer open={open} onClose={() => setOpen(false)} title="Filters" side="left">
        {filterSlot}
      </Drawer>
    </>
  );
}

export function ActiveChips() {
  const router = useRouter();
  const params = useSearchParams();
  const entries = Array.from(params.entries()).filter(
    ([k]) => !["sort", "page", "q"].includes(k),
  );
  if (!entries.length) return null;
  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {entries.map(([k, v]) => (
        <button
          key={k + v}
          onClick={() => {
            const next = new URLSearchParams(params.toString());
            next.delete(k);
            next.delete("page");
            router.push(`?${next.toString()}`, { scroll: false });
          }}
          className={cn("inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white px-2.5 py-1 text-[11.5px] font-semibold text-ink-700 hover:border-flame-500/50 hover:text-flame-600")}
        >
          {k}: {decodeURIComponent(v).replace(/,/g, ", ")}
          <span aria-hidden>✕</span>
        </button>
      ))}
    </div>
  );
}