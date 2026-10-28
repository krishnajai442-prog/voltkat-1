"use client";

import { useEffect, useState } from "react";
import { ProductOptionsEditor, type OptionsPayload } from "@/components/admin/ProductOptionsEditor";
import { useToast } from "@/components/ui/Toaster";

type Row = { id: string; name: string };
const EMPTY: OptionsPayload = { colors: [], variants: [], optionGroups: [] };

export default function AdminProductOptionsPage() {
  const toast = useToast();
  const [products, setProducts] = useState<Row[]>([]);
  const [selected, setSelected] = useState("");
  const [options, setOptions] = useState<OptionsPayload>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/product-options")
      .then((r) => r.json())
      .then((j) => setProducts(j.products ?? []))
      .catch(() => setProducts([]));
  }, []);

  async function load(id: string) {
    setSelected(id);
    if (!id) { setOptions(EMPTY); return; }
    setLoading(true);
    try {
      const j = await fetch(`/api/admin/product-options?id=${encodeURIComponent(id)}`).then((r) => r.json());
      const p = j.product ?? {};
      setOptions({ colors: p.colorOptions ?? [], variants: p.variants ?? [], optionGroups: p.optionGroups ?? [] });
    } catch {
      toast.push({ title: "Could not load options" });
    }
    setLoading(false);
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/product-options", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected, ...options }),
      });
      if (!res.ok) throw new Error();
      toast.push({ title: "Options saved", body: "The product page reflects this immediately." });
    } catch {
      toast.push({ title: "Save failed" });
    }
    setSaving(false);
  }

  return (
    <div className="container-x py-6">
      <h1 className="mb-1 font-display text-[20px] font-bold text-gray-900">Product options</h1>
      <p className="mb-4 text-[12.5px] text-gray-500">
        Edit colours, option groups (e.g. System Memory) and price variants for any product.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={selected}
          onChange={(e) => load(e.target.value)}
          className="h-10 min-w-[260px] rounded-lg border border-gray-300 bg-white px-2 text-[13px] outline-none focus:border-[#2874f0]"
        >
          <option value="">Select a product…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {loading ? <span className="text-[12px] text-gray-400">Loading…</span> : null}
      </div>

      {selected ? (
        <>
          <ProductOptionsEditor value={options} onChange={setOptions} />
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-xl bg-ink-900 px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-electric-600 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save options"}
            </button>
          </div>
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-[12.5px] text-gray-400">
          Pick a product above to edit its colours, groups and variants.
        </p>
      )}
    </div>
  );
}