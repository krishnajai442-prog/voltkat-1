"use client";

import { Plus, Trash2 } from "lucide-react";
import { ImageUploadButton } from "@/components/admin/ImageUploadButton";

export type OptionsPayload = { colors: any[]; variants: any[]; optionGroups: any[] };

const normColor = (c: any) => (typeof c === "string" ? { name: c, image: "" } : { name: c?.name ?? "", image: c?.image ?? "" });

export function ProductOptionsEditor({ value, onChange }: {
  value: OptionsPayload;
  onChange: (v: OptionsPayload) => void;
}) {
  const colors = (value.colors ?? []).map(normColor);
  const variants = value.variants ?? [];
  const groups = value.optionGroups ?? [];

  const set = (patch: Partial<OptionsPayload>) => onChange({ colors, variants, optionGroups: groups, ...patch });
  const patchAt = <T,>(arr: T[], i: number, p: Partial<T>): T[] => arr.map((x, k) => (k === i ? { ...x, ...p } : x));

  const input = "h-9 w-full rounded-lg border border-gray-300 px-2 text-[13px] outline-none focus:border-[#2874f0]";

  return (
    <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-4">
      {/* COLORS — name + uploaded swatch */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[13.5px] font-bold text-gray-900">Colours</h3>
          <button type="button" onClick={() => set({ colors: [...colors, { name: "", image: "" }] })}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#2874f0]"><Plus className="size-3.5" /> Add colour</button>
        </div>
        <div className="space-y-2">
          {colors.map((c, i) => (
                        <div key={i} className="grid grid-cols-[1fr_auto_auto_1fr_auto] items-center gap-2">
              <input className={input} placeholder="Name (e.g. Sky Blue)" value={c.name ?? ""}
                onChange={(e) => set({ colors: patchAt(colors, i, { name: e.target.value }) })} />
              {c.image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={c.image} alt="" className="size-9 rounded-lg border border-gray-200 bg-white object-contain" />
                : <span className="grid size-9 place-items-center rounded-lg bg-gray-100 text-[10px] font-bold text-gray-400">{(c.name || "?").slice(0, 2).toUpperCase()}</span>}
              <ImageUploadButton label="Swatch" onUploaded={(url) => set({ colors: patchAt(colors, i, { image: url }) })} />
              <input className={input} placeholder="…or paste a URL" value={c.image ?? ""}
                onChange={(e) => set({ colors: patchAt(colors, i, { image: e.target.value }) })} />
              <button type="button" aria-label="Remove colour" onClick={() => set({ colors: colors.filter((_, k) => k !== i) })}
                className="grid size-9 place-items-center rounded-lg border border-gray-200 text-red-500"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      </section>

      {/* OPTION GROUPS */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[13.5px] font-bold text-gray-900">Option groups (e.g. System Memory)</h3>
          <button type="button" onClick={() => set({ optionGroups: [...groups, { name: "", values: [{ label: "", add: 0 }] }] })}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#2874f0]"><Plus className="size-3.5" /> Add group</button>
        </div>
        <div className="space-y-3">
          {groups.map((g, gi) => (
            <div key={gi} className="rounded-lg border border-gray-200 p-2.5">
              <div className="mb-2 flex gap-2">
                <input className={input} placeholder="Group name (e.g. System Memory)" value={g.name ?? ""}
                  onChange={(e) => set({ optionGroups: patchAt(groups, gi, { name: e.target.value }) })} />
                <button type="button" aria-label="Remove group" onClick={() => set({ optionGroups: groups.filter((_, k) => k !== gi) })}
                  className="grid size-9 shrink-0 place-items-center rounded-lg border border-gray-200 text-red-500"><Trash2 className="size-4" /></button>
              </div>
              <div className="space-y-2">
                {(g.values ?? []).map((v: any, vi: number) => (
                  <div key={vi} className="grid grid-cols-[1fr_110px_auto] gap-2">
                    <input className={input} placeholder="Value (e.g. 24 GB)" value={v.label ?? ""}
                      onChange={(e) => set({ optionGroups: patchAt(groups, gi, { values: patchAt(g.values, vi, { label: e.target.value }) }) })} />
                    <input className={input} type="number" placeholder="Price add ₹" value={v.add ?? 0}
                      onChange={(e) => set({ optionGroups: patchAt(groups, gi, { values: patchAt(g.values, vi, { add: Number(e.target.value) }) }) })} />
                    <button type="button" aria-label="Remove value"
                      onClick={() => set({ optionGroups: patchAt(groups, gi, { values: g.values.filter((_: any, k: number) => k !== vi) }) })}
                      className="grid size-9 place-items-center rounded-lg border border-gray-200 text-red-500"><Trash2 className="size-4" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => set({ optionGroups: patchAt(groups, gi, { values: [...(g.values ?? []), { label: "", add: 0 }] }) })}
                  className="text-[12px] font-semibold text-[#2874f0]">+ Add value</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* VARIANTS */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[13.5px] font-bold text-gray-900">Variants (price = base + group add + variant add)</h3>
          <button type="button" onClick={() => set({ variants: [...variants, { label: "", add: 0, available: true }] })}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#2874f0]"><Plus className="size-3.5" /> Add variant</button>
        </div>
        <div className="space-y-2">
          {variants.map((v, i) => (
            <div key={i} className="rounded-lg border border-gray-200 p-2.5">
              <div className="grid grid-cols-[1.4fr_100px_100px_auto] gap-2">
                <input className={input} placeholder="Label (e.g. 128 GB + 4 GB)" value={v.label ?? ""}
                  onChange={(e) => set({ variants: patchAt(variants, i, { label: e.target.value }) })} />
                <input className={input} type="number" placeholder="Add ₹" value={v.add ?? 0}
                  onChange={(e) => set({ variants: patchAt(variants, i, { add: Number(e.target.value) }) })} />
                <input className={input} type="number" placeholder="MRP add ₹" value={v.mrpAdd ?? v.add ?? 0}
                  onChange={(e) => set({ variants: patchAt(variants, i, { mrpAdd: Number(e.target.value) }) })} />
                <button type="button" aria-label="Remove variant" onClick={() => set({ variants: variants.filter((_, k) => k !== i) })}
                  className="grid size-9 place-items-center rounded-lg border border-gray-200 text-red-500"><Trash2 className="size-4" /></button>
              </div>
              <div className="mt-2 grid grid-cols-[auto_1fr] items-center gap-2">
                <label className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-700">
                  <input type="checkbox" checked={v.available !== false}
                    onChange={(e) => set({ variants: patchAt(variants, i, { available: e.target.checked }) })} />
                  Available
                </label>
                <input className={input} placeholder="Note when unavailable (e.g. Available in other colours)" value={v.note ?? ""}
                  onChange={(e) => set({ variants: patchAt(variants, i, { note: e.target.value }) })} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default ProductOptionsEditor;