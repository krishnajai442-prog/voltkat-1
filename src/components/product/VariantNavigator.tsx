"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type SiblingProduct = {
  id: string; slug: string; name: string;
  color: string | null; storage: string | null; ram: string | null;
  salePrice: number; mrp: number; stock: number; lowStockAt: number;
  image: string | null;
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const colorOf = (s: SiblingProduct) => s.color?.trim() || "Default";
const variantKey = (s: SiblingProduct) =>
  [s.storage, s.ram].map((x) => x?.trim()).filter(Boolean).join(" + ") || "Single variant";
const isOut = (s: SiblingProduct) => s.stock <= 0;
const isLow = (s: SiblingProduct) => s.stock > 0 && s.stock <= s.lowStockAt;

export function VariantNavigator({ siblings, currentId }: {
  siblings: SiblingProduct[];
  currentId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const current = siblings.find((s) => s.id === currentId) ?? siblings[0];
  if (!current) return null;

  const colorOrder: string[] = [];
  for (const s of siblings) if (!colorOrder.includes(colorOf(s))) colorOrder.push(colorOf(s));
  const ofColor = (c: string) => siblings.filter((s) => colorOf(s) === c);
    const repOf = (c: string): SiblingProduct => {
    const list = ofColor(c);
    return (
      list.find((s) => variantKey(s) === variantKey(current) && !isOut(s)) ??
      list.find((s) => variantKey(s) === variantKey(current)) ??
      list.find((s) => !isOut(s)) ??
      list[0]!
    );
  };
  const go = (slug: string, id: string) => {
    if (busy) return;
    setBusy(id);
    router.push(`/product/${slug}`);
  };

  const curColor = colorOf(current);
  const variants = ofColor(curColor);

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[13.5px] font-bold text-gray-900">
          Selected Color: <span className="font-medium text-gray-700">{curColor}</span>
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {colorOrder.map((c) => {
            const rep = repOf(c);
            const out = ofColor(c).every(isOut);
            const sel = c === curColor;
            return (
              <button key={c} type="button" onClick={() => go(rep.slug, rep.id)} disabled={busy !== null}
                aria-label={c}
                className={`relative size-16 shrink-0 overflow-hidden rounded-xl border-2 bg-gray-50 p-1 transition-colors ${sel ? "border-gray-900" : "border-gray-200 hover:border-gray-400"}`}>
                {rep.image
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={rep.image} alt={c} className="size-full rounded-lg object-contain" />
                  : <span className="grid size-full place-items-center rounded-lg bg-gray-100 text-[10px] font-bold text-gray-500">{c.slice(0, 2).toUpperCase()}</span>}
                {out && (
                  <span className="absolute inset-x-0 bottom-0 bg-white/90 py-0.5 text-center text-[8.5px] font-bold text-gray-600">
                    Out of stock
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[13.5px] font-bold text-gray-900">
          Variant: <span className="font-medium text-gray-700">{variantKey(current)}</span>
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {variants.map((s) => {
            const sel = s.id === current.id;
            const out = isOut(s);
            const d = s.mrp > s.salePrice ? Math.round(((s.mrp - s.salePrice) / s.mrp) * 100) : 0;
            return (
              <button key={s.id} type="button" onClick={() => go(s.slug, s.id)} disabled={busy !== null}
                className={`rounded-xl border p-2.5 text-left transition-colors ${sel ? "border-gray-900 bg-white" : "border-gray-200 bg-white hover:border-gray-400"}`}>
                <p className="text-[12px] font-bold text-gray-900">{variantKey(s)}</p>
                {out ? (
                  <p className="mt-1 text-[11px] font-semibold text-orange-500">Out of stock</p>
                ) : (
                  <>
                    {d > 0 && (
                      <p className="mt-1 text-[11px] font-bold text-emerald-600">
                        ↓{d}% <span className="font-medium text-gray-400 line-through">{inr(s.mrp)}</span>
                      </p>
                    )}
                    <p className="text-[12.5px] font-bold text-gray-900">{inr(s.salePrice)}</p>
                    {isLow(s) && <p className="text-[11px] font-semibold text-orange-500">{s.stock} left</p>}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default VariantNavigator;