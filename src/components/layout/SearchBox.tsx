"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Clock, Search, TrendingUp, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { inr, lsRead, lsWrite, RECENT_SEARCH_KEY } from "@/context/CartContext";
import { cn } from "@/lib/utils";

type Suggestion = {
  slug: string;
  name: string;
  brand: string;
  image: string;
  salePrice: number;
  discountPercent: number;
  ratingAvg: number;
  categorySlug: string;
};

const TRENDING = ["iPhone 16", "Samsung Galaxy S25", "RTX 5070 laptop", "1.5 ton AC", "wireless earphones under 2000", "power bank 20000mAh"];

export function SearchBox({ size = "md" }: { size?: "md" | "lg" }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Suggestion[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  useEffect(() => setQ(params.get("q") ?? ""), [params]);
  useEffect(() => setRecent(lsRead<string[]>(RECENT_SEARCH_KEY, [])), []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const fetchSuggestions = useCallback(async (term: string) => {
    const id = ++seq.current;
    if (term.trim().length < 2) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?suggest=1&q=${encodeURIComponent(term)}`, { cache: "no-store" });
      const json = (await res.json()) as { items?: Suggestion[] };
      if (id === seq.current) setRows(json.items ?? []);
    } catch {
      if (id === seq.current) setRows([]);
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);

  function onChange(value: string) {
    setQ(value);
    setOpen(true);
    setActiveIdx(-1);
    void fetchSuggestions(value);
  }

  function remember(term: string) {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...recent.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, 8);
    setRecent(next);
    lsWrite(RECENT_SEARCH_KEY, next);
  }

  function submit(term?: string) {
    const value = (term ?? q).trim();
    if (!value) return;
    remember(value);
    setOpen(false);
    inputRef.current?.blur();
    if (pathname.startsWith("/products") || pathname === "/search") {
      const next = new URLSearchParams(params.toString());
      next.set("q", value);
      next.delete("page");
      router.push(`/products/all?${next.toString()}`);
    } else {
      router.push(`/products/all?q=${encodeURIComponent(value)}`);
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (activeIdx >= 0 && rows[activeIdx]) {
        e.preventDefault();
        remember(rows[activeIdx]!.name);
        router.push(`/product/${rows[activeIdx]!.slug}`);
        setOpen(false);
      } else submit();
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => {
        const max = rows.length - 1;
        return e.key === "ArrowDown" ? Math.min(max, i + 1) : Math.max(-1, i - 1);
      });
    }
  };

  const showPanel = open && (q.trim().length > 0 || recent.length > 0);

  return (
    <div ref={boxRef} className="relative">
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl bg-white/12 px-3 transition-all focus-within:bg-white focus-within:shadow-lift",
          size === "lg" ? "h-14" : "h-11",
        )}
      >
        <Search className="size-4 shrink-0 text-ink-300 group-focus-within:text-electric-500" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="vk-search-listbox"
          aria-autocomplete="list"
          aria-label="Search for phones, laptops, appliances"
          placeholder="Search for phones, laptops, ACs, earphones…"
          className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-white/50 focus:text-ink-900 focus:placeholder:text-ink-300"
        />
        {q && (
          <button onClick={() => onChange("")} aria-label="Clear search" className="grid size-7 place-items-center rounded-lg text-ink-300 hover:bg-ink-900/5">
            <X className="size-3.5" />
          </button>
        )}
        <button
          onClick={() => submit()}
          className="hidden rounded-lg bg-electric-500 px-3 py-1.5 text-[12px] font-bold text-white hover:bg-electric-600 sm:block"
        >
          Search
        </button>
      </div>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            id="vk-search-listbox"
            role="listbox"
            aria-label="Search suggestions"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-x-0 top-[calc(100%+8px)] z-[60] max-h-[70vh] overflow-y-auto rounded-2xl border border-hairline bg-white p-2 shadow-lift"
          >
            {rows.length > 0 && (
              <ul className="space-y-0.5">
                {rows.map((r, i) => (
                  <li key={r.slug} role="option" aria-selected={i === activeIdx}>
                    <Link
                      href={`/product/${r.slug}`}
                      onClick={() => {
                        remember(r.name);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-xl p-2 transition-colors",
                        i === activeIdx ? "bg-electric-50" : "hover:bg-canvas",
                      )}
                    >
                      <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-canvas">
                        <Image src={r.image} alt="" fill sizes="44px" className="object-contain" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold text-ink-900">{r.name}</span>
                        <span className="block text-[11.5px] text-ink-400">
                          {r.brand} · {r.categorySlug.replace("-", " ")}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-[13.5px] font-bold text-ink-900">{inr(r.salePrice)}</span>
                        {r.discountPercent > 0 && (
                          <span className="block text-[11px] font-semibold text-mint-500">{r.discountPercent}% off</span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {loading && rows.length === 0 && (
              <div className="space-y-1 p-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton h-14 rounded-xl" />
                ))}
              </div>
            )}

            {!loading && q.trim().length >= 2 && rows.length === 0 && (
              <div className="px-3 py-6 text-center">
                <p className="text-sm font-semibold text-ink-900">No matches for “{q}”</p>
                <p className="mt-1 text-xs text-ink-400">Try a brand, category or spec — e.g. “1.5 ton AC”, “RTX laptop”.</p>
                <button onClick={() => submit()} className="mt-3 text-[13px] font-semibold text-electric-600 hover:underline">
                  See all results →
                </button>
              </div>
            )}

            {q.trim().length < 2 && (
              <div className="grid gap-3 p-2 sm:grid-cols-2">
                {recent.length > 0 && (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-ink-300">
                      <Clock className="size-3" /> Recent
                    </p>
                    <ul className="space-y-0.5">
                      {recent.map((r) => (
                        <li key={r}>
                          <button
                            onClick={() => submit(r)}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-ink-700 hover:bg-canvas"
                          >
                            <Search className="size-3 text-ink-300" /> {r}
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => {
                        setRecent([]);
                        lsWrite(RECENT_SEARCH_KEY, []);
                      }}
                      className="mt-1 px-2 text-[11px] font-semibold text-ink-300 hover:text-flame-600"
                    >
                      Clear history
                    </button>
                  </div>
                )}
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-ink-300">
                    <TrendingUp className="size-3" /> Trending
                  </p>
                  <ul className="space-y-0.5">
                    {TRENDING.map((t) => (
                      <li key={t}>
                        <button
                          onClick={() => submit(t)}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-ink-700 hover:bg-canvas"
                        >
                          <TrendingUp className="size-3 text-ink-300" /> {t}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}