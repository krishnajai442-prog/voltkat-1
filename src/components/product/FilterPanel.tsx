"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { FACETS, PRICE_BUCKETS, type Facets } from "@/lib/catalog";
import { inr } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

type Props = {
  facets: Facets;
  categorySlug: string; // "all" | real slug
  defaults: {
    brands?: string[];
    subtypes?: string[];
    ram?: string[];
    storage?: string[];
    screenSize?: string[];
    processor?: string[];
    color?: string[];
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    minDiscount?: number;
    inStock?: boolean;
    warranty?: number;
  };
};

export function FilterPanel({ facets, categorySlug, defaults }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState<Record<string, boolean>>({ brand: true, price: true });

  const activeKeys = useMemo(() => FACETS[(categorySlug as keyof typeof FACETS)] ?? FACETS.all, [categorySlug]);
  const selected = useMemo(
    () => ({
      brand: (params.get("brands") ?? "").split(",").filter(Boolean),
      subtype: (params.get("subtypes") ?? "").split(",").filter(Boolean),
      ram: (params.get("ram") ?? "").split(",").filter(Boolean),
      storage: (params.get("storage") ?? "").split(",").filter(Boolean),
      screenSize: (params.get("screenSize") ?? "").split(",").filter(Boolean),
      processor: (params.get("processor") ?? "").split(",").filter(Boolean),
      color: (params.get("color") ?? "").split(",").filter(Boolean),
    }),
    [params],
  );

  const patch = useCallback(
    (updates: Record<string, string | number | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "" ) next.delete(k);
        else next.set(k, String(v));
      }
      next.delete("page");
      router.push(`?${next.toString()}`, { scroll: false });
    },
    [params, router],
  );

  function toggle(key: keyof typeof selected, param: string, value: string) {
    const list = selected[key];
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    patch({ [param]: next.join(",") || null });
  }

  const clearAll = () => {
    const next = new URLSearchParams();
    const q = params.get("q");
    const sort = params.get("sort");
    if (q) next.set("q", q);
    if (sort) next.set("sort", sort);
    router.push(`?${next.toString()}`, { scroll: false });
  };

  const activeCount =
    Object.values(selected).flat().length +
    (defaults.minPrice ? 1 : 0) +
    (defaults.maxPrice ? 1 : 0) +
    (params.get("minRating") ? 1 : 0) +
    (params.get("minDiscount") ? 1 : 0) +
    (params.get("inStock") ? 1 : 0) +
    (params.get("warranty") ? 1 : 0);

  const group = (id: string, title: string, body: React.ReactNode) => (
    <section className="border-b border-hairline py-3.5 last:border-0">
      <button
        onClick={() => setOpen((o) => ({ ...o, [id]: !o[id] }))}
        aria-expanded={Boolean(open[id])}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-[12.5px] font-bold uppercase tracking-wider text-ink-700">{title}</span>
        <ChevronDown className={cn("size-4 text-ink-300 transition-transform", open[id] && "rotate-180")} />
      </button>
      {open[id] && <div className="mt-3">{body}</div>}
    </section>
  );

  const checkList = (
    key: keyof typeof selected,
    param: string,
    values: string[],
    limit = 8,
  ) => {
    if (!values.length) return null;
    const shown = open[`more-${key}`] ? values : values.slice(0, limit);
    return (
      <>
        <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
          {shown.map((v) => (
            <li key={v}>
              <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-ink-700 hover:text-ink-900">
                <input
                  type="checkbox"
                  checked={selected[key].includes(v)}
                  onChange={() => toggle(key, param, v)}
                  className="size-3.5 rounded border-hairline accent-electric-500"
                />
                <span className="truncate">{v}</span>
              </label>
            </li>
          ))}
        </ul>
        {values.length > limit && (
          <button
            onClick={() => setOpen((o) => ({ ...o, [`more-${key}`]: !o[`more-${key}`] }))}
            className="mt-2 text-[12px] font-bold text-electric-600 hover:underline"
          >
            {open[`more-${key}`] ? "Show less" : `Show all ${values.length}`}
          </button>
        )}
      </>
    );
  };

  return (
    <div className="text-ink-900">
      <div className="flex items-center justify-between pb-2">
        <h2 className="font-display text-sm font-bold">Filters {activeCount > 0 && <span className="text-electric-600">({activeCount})</span>}</h2>
        {activeCount > 0 && (
          <button onClick={clearAll} className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink-400 hover:text-flame-600">
            <RotateCcw className="size-3" /> Clear all
          </button>
        )}
      </div>

      {activeKeys.includes("price") &&
        group(
          "price",
          "Price",
          <div className="space-y-3">
            <ul className="space-y-1.5">
              {PRICE_BUCKETS.map((b) => {
                const on = String(defaults.minPrice) === String(b.min) && String(defaults.maxPrice) === String(b.max);
                return (
                  <li key={b.label}>
                    <button
                      onClick={() => patch(on ? { minPrice: null, maxPrice: null } : { minPrice: b.min, maxPrice: b.max ?? null })}
                      className={cn(
                        "w-full rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors",
                        on ? "bg-electric-50 font-bold text-electric-700" : "text-ink-700 hover:bg-canvas",
                      )}
                    >
                      {b.label}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center gap-2">
              <input
                type="number"
                defaultValue={defaults.minPrice ?? ""}
                min={0}
                placeholder="Min"
                aria-label="Minimum price"
                onKeyDown={(e) => {
                  if (e.key === "Enter") patch({ minPrice: (e.target as HTMLInputElement).value || null });
                }}
                onBlur={(e) => patch({ minPrice: e.target.value || null })}
                className="h-9 w-full rounded-lg border border-hairline px-2 text-[13px] outline-none focus:border-electric-400"
              />
              <span className="text-ink-300">—</span>
              <input
                type="number"
                defaultValue={defaults.maxPrice ?? ""}
                min={0}
                placeholder="Max"
                aria-label="Maximum price"
                onKeyDown={(e) => {
                  if (e.key === "Enter") patch({ maxPrice: (e.target as HTMLInputElement).value || null });
                }}
                onBlur={(e) => patch({ maxPrice: e.target.value || null })}
                className="h-9 w-full rounded-lg border border-hairline px-2 text-[13px] outline-none focus:border-electric-400"
              />
            </div>
            <p className="text-[11px] text-ink-300">
              Range in catalogue: {inr(facets.priceRange.min)} – {inr(facets.priceRange.max)}
            </p>
          </div>,
        )}

      {activeKeys.includes("brand") && group("brand", "Brand", checkList("brand", "brands", facets.brands.map((b) => b.slug).map((s) => facets.brands.find((b) => b.slug === s)!.name)))}
      {activeKeys.includes("subtype") && group("subtype", "Product type", checkList("subtype", "subtypes", facets.subtypes))}
      {activeKeys.includes("ram") && group("ram", "RAM", checkList("ram", "ram", facets.ram))}
      {activeKeys.includes("storage") && group("storage", "Storage", checkList("storage", "storage", facets.storage))}
      {activeKeys.includes("screenSize") && group("screenSize", "Screen size", checkList("screenSize", "screenSize", facets.screenSize))}
      {activeKeys.includes("processor") && group("processor", "Processor", checkList("processor", "processor", facets.processor, 6))}
      {activeKeys.includes("color") && group("color", "Colour", checkList("color", "color", facets.color))}

      {activeKeys.includes("rating") &&
        group(
          "rating",
          "Customer rating",
          <ul className="space-y-1">
            {[4, 3, 2].map((r) => {
              const on = params.get("minRating") === String(r);
              return (
                <li key={r}>
                  <button
                    onClick={() => patch({ minRating: on ? null : r })}
                    className={cn("w-full rounded-lg px-2.5 py-1.5 text-left text-[13px]", on ? "bg-electric-50 font-bold text-electric-700" : "hover:bg-canvas")}
                  >
                    {r}★ & above
                  </button>
                </li>
              );
            })}
          </ul>,
        )}

      {activeKeys.includes("discount") &&
        group(
          "discount",
          "Discount",
          <ul className="space-y-1">
            {[10, 20, 30, 40].map((d) => {
              const on = params.get("minDiscount") === String(d);
              return (
                <li key={d}>
                  <button
                    onClick={() => patch({ minDiscount: on ? null : d })}
                    className={cn("w-full rounded-lg px-2.5 py-1.5 text-left text-[13px]", on ? "bg-electric-50 font-bold text-electric-700" : "hover:bg-canvas")}
                  >
                    {d}% and above
                  </button>
                </li>
              );
            })}
          </ul>,
        )}

      {activeKeys.includes("availability") &&
        group(
          "availability",
          "Availability",
          <label className="flex cursor-pointer items-center gap-2.5 text-[13px]">
            <input
              type="checkbox"
              checked={Boolean(defaults.inStock)}
              onChange={(e) => patch({ inStock: e.target.checked ? 1 : null })}
              className="size-3.5 accent-electric-500"
            />
            Exclude out of stock
          </label>,
        )}

      {activeKeys.includes("warranty") &&
        group(
          "warranty",
          "Warranty",
          <div className="flex flex-wrap gap-1.5">
            {[6, 12, 24, 60].map((w) => {
              const on = params.get("warranty") === String(w);
              return (
                <button
                  key={w}
                  onClick={() => patch({ warranty: on ? null : w })}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold",
                    on ? "border-electric-500 bg-electric-50 text-electric-700" : "border-hairline text-ink-700 hover:border-electric-300",
                  )}
                >
                  {w >= 12 ? `${w / 12} yr` : `${w} mo`}+
                </button>
              );
            })}
          </div>,
        )}

      <div className="pt-4 lg:hidden">
        <Button block onClick={clearAll} variant="outline" size="sm">
          Reset filters
        </Button>
      </div>
    </div>
  );
}