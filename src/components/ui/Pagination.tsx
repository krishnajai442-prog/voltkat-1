// Pagination.tsx
"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function Pagination({ page, perPage, total }: { page: number; perPage: number; total: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;

  const go = (p: number) => {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(p));
    router.push(`?${next.toString()}`);
  };

  const window = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pages || Math.abs(p - page) <= 1,
  );

  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5" aria-label="Pagination">
      <button
        onClick={() => go(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className="grid size-9 place-items-center rounded-lg border border-hairline bg-white text-ink-700 disabled:opacity-40 hover:border-electric-300"
      >
        <ChevronLeft className="size-4" />
      </button>
      {window.map((p, idx) => (
        <span key={p} className="flex items-center gap-1.5">
          {idx > 0 && p - window[idx - 1]! > 1 && <span className="px-1 text-ink-300">…</span>}
          <button
            onClick={() => go(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              "size-9 rounded-lg text-[13px] font-semibold tabular-nums transition-colors",
              p === page ? "bg-ink-900 text-white" : "border border-hairline bg-white text-ink-700 hover:border-electric-300",
            )}
          >
            {p}
          </button>
        </span>
      ))}
      <button
        onClick={() => go(page + 1)}
        disabled={page === pages}
        aria-label="Next page"
        className="grid size-9 place-items-center rounded-lg border border-hairline bg-white text-ink-700 disabled:opacity-40 hover:border-electric-300"
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}