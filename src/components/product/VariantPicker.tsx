"use client";

import { useState } from "react";

export type ColorOption = { name: string; image?: string | null };
export type VariantOption = { label: string; add: number; mrpAdd?: number; available?: boolean; note?: string };
export type OptionGroup = { name: string; values: { label: string; add?: number }[] };

type Props = {
  colors: (string | ColorOption)[];
  colorOptions?: (string | ColorOption)[];
  variants: VariantOption[];
  optionGroups?: OptionGroup[];
  basePrice: number;
  baseMrp: number;
  name: string;
  brand: string;
  storage: string | null;
  ram: string | null;
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const offPct = (mrp: number, price: number) => (mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0);
const norm = (c: string | ColorOption): ColorOption => (typeof c === "string" ? { name: c, image: null } : c);

export function VariantPicker({ colors, colorOptions, variants, optionGroups, basePrice, baseMrp }: Props) {
  const colorList: ColorOption[] = ((colorOptions && colorOptions.length ? colorOptions : colors) ?? []).map(norm);
  const groupList: OptionGroup[] = optionGroups ?? [];
  const variantList: VariantOption[] = variants ?? [];

  const [colorIdx, setColorIdx] = useState(0);
  const [groupIdx, setGroupIdx] = useState<number[]>(groupList.map(() => 0));
  const [varIdx, setVarIdx] = useState(0);

  const groupAdd = groupList.reduce((sum, g, gi) => {
    const sel = groupIdx[gi] ?? 0;
    return sum + (g.values[sel]?.add ?? 0);
  }, 0);
  const selected = variantList[varIdx] ?? variantList[0];
  const selectedColor = colorList[Math.min(colorIdx, colorList.length - 1)];

  return (
    <div className="space-y-4">
      {colorList.length > 0 && (
        <div>
          <p className="mb-2 text-[13.5px] font-bold text-gray-900">
            Selected Color: <span className="font-medium text-gray-700">{selectedColor?.name}</span>
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {colorList.map((c, i) => (
              <button key={i} type="button" onClick={() => setColorIdx(i)} aria-label={c.name}
                className={`size-16 shrink-0 overflow-hidden rounded-xl border-2 bg-gray-50 p-1 ${i === colorIdx ? "border-gray-900" : "border-gray-200"}`}>
                {c.image
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={c.image} alt={c.name} className="size-full rounded-lg object-contain" />
                  : <span className="grid size-full place-items-center rounded-lg bg-gray-100 text-[11px] font-bold text-gray-500">{c.name.slice(0, 2).toUpperCase()}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {groupList.map((g, gi) => {
        const sel = groupIdx[gi] ?? 0;
        return (
          <div key={gi}>
            <p className="mb-2 text-[13.5px] font-bold text-gray-900">
              {g.name}: <span className="font-medium text-gray-700">{g.values[sel]?.label}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {g.values.map((v, vi) => (
                <button key={vi} type="button"
                  onClick={() => setGroupIdx((cur) => cur.map((k, j) => (j === gi ? vi : k)))}
                  className={`rounded-lg border px-3.5 py-2 text-[12.5px] font-semibold ${vi === sel ? "border-gray-900 bg-white text-gray-900" : "border-gray-200 bg-gray-50 text-gray-600"}`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {variantList.length > 0 && (
        <div>
          <p className="mb-2 text-[13.5px] font-bold text-gray-900">
            Variant: <span className="font-medium text-gray-700">{selected?.label}</span>
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {variantList.map((v, i) => {
              const avail = v.available !== false;
              const vPrice = basePrice + groupAdd + (v.add ?? 0);
              const vMrp = baseMrp + groupAdd + (v.mrpAdd ?? v.add ?? 0);
              const d = offPct(vMrp, vPrice);
              const sel = i === varIdx;
              return (
                <button key={i} type="button" disabled={!avail} onClick={() => setVarIdx(i)}
                  className={`rounded-xl border p-2.5 text-left transition-colors ${sel ? "border-gray-900 bg-white" : avail ? "border-gray-200 bg-white hover:border-gray-400" : "border-dashed border-gray-300 bg-gray-50"}`}>
                  <p className="text-[12px] font-bold text-gray-900">{v.label}</p>
                  {avail ? (
                    <>
                      {d > 0 ? (
                        <p className="mt-1 text-[11px] font-bold text-emerald-600">
                          ↓{d}% <span className="font-medium text-gray-400 line-through">{inr(vMrp)}</span>
                        </p>
                      ) : null}
                      <p className="text-[12.5px] font-bold text-gray-900">{inr(vPrice)}</p>
                    </>
                  ) : (
                    <p className="mt-1 text-[11px] text-gray-400">{v.note || "Unavailable"}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default VariantPicker;