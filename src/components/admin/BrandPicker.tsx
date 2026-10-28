"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, Search } from "lucide-react";

export type BrandOption = { id: string; name: string; categories: string[] };

const UNC = "Uncategorized";

export function BrandPicker({ brands, categories, preferred, value, onChange }: {
  brands: BrandOption[];
  categories: string[];
  preferred?: string;
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<string | null>(null); // null = category list view
  const [q, setQ] = useState("");
  const selected = brands.find((b) => b.id === value);

  const cats = useMemo(
    () => [...categories].sort((a, b) => (a === preferred ? -1 : b === preferred ? 1 : a.localeCompare(b))),
    [categories, preferred]
  );

  const countFor = (c: string) => brands.filter((b) => (b.categories ?? []).includes(c)).length;

  const uncItems = useMemo(
    () => brands.filter((b) => (b.categories ?? []).length === 0),
    [brands]
  );

  const items = useMemo(() => {
    if (!cat) return [];
    const base = cat === UNC ? uncItems : brands.filter((b) => (b.categories ?? []).includes(cat));
    const needle = q.trim().toLowerCase();
    return needle ? base.filter((b) => b.name.toLowerCase().includes(needle)) : base;
  }, [cat, brands, uncItems, q]);

  function close() {
    setOpen(false);
    setCat(null);
    setQ("");
  }

  return (
    <div className="relative">
      <span className="mb-1 block text-[12px] font-bold text-gray-700">Brand</span>
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 text-[13px] focus:border-[#2874f0]">
        <span className={selected ? "text-gray-900" : "text-gray-400"}>{selected?.name ?? "Select brand"}</span>
        <ChevronDown className="size-4 text-gray-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={close} />
          <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
            {cat === null ? (
              /* LEVEL 1 — categories only */
              <div className="p-1">
                <p className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">Choose a category</p>
                {cats.map((c) => (
                  <button key={c} type="button" onClick={() => { setCat(c); setQ(""); }}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[13px] font-semibold text-gray-800 hover:bg-gray-50">
                    {c}
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-500">{countFor(c)}</span>
                  </button>
                ))}
                {uncItems.length > 0 && (
                  <button type="button" onClick={() => { setCat(UNC); setQ(""); }}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[13px] font-semibold text-gray-500 hover:bg-gray-50">
                    {UNC}
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-500">{uncItems.length}</span>
                  </button>
                )}
              </div>
            ) : (
              /* LEVEL 2 — brands inside the chosen category, with search */
              <div>
                <div className="flex items-center gap-1 border-b border-gray-100 p-2">
                  <button type="button" onClick={() => { setCat(null); setQ(""); }} aria-label="Back to categories"
                    className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-gray-50">
                    <ChevronLeft className="size-4 text-gray-500" />
                  </button>
                  <p className="text-[12.5px] font-bold text-gray-900">{cat}</p>
                </div>
                <div className="relative border-b border-gray-100 p-2">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                  <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search in ${cat}`}
                    className="h-9 w-full rounded-lg border border-gray-300 pl-8 pr-2 text-[13px] outline-none focus:border-[#2874f0]" />
                </div>
                <div className="max-h-64 overflow-y-auto p-1">
                  {items.length === 0 && (
                    <p className="p-3 text-[12.5px] text-gray-400">
                      {q ? `No ${cat} brands match “${q}”.` : `No brands tagged under ${cat} yet — tag them at /admin/brands.`}
                    </p>
                  )}
                  {items.map((b) => (
                    <button key={b.id} type="button"
                      onClick={() => { onChange(b.id); close(); }}
                      className={`flex w-full rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-gray-50 ${b.id === value ? "font-bold text-[#2874f0]" : "text-gray-800"}`}>
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default BrandPicker;