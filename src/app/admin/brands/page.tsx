"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toaster";

type B = { id: string; name: string; categories: string[] };

export default function AdminBrandsPage() {
  const toast = useToast();
  const [brands, setBrands] = useState<B[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/brands").then((r) => r.json())
      .then((j) => { setBrands(j.brands ?? []); setCats(j.categories ?? []); })
      .catch(() => {});
  }, []);

  const tagsOf = (b: B) => draft[b.id] ?? b.categories;
  const toggle = (b: B, c: string) => {
    const cur = tagsOf(b);
    setDraft((d) => ({ ...d, [b.id]: cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c] }));
  };
  const dirty = (b: B) => JSON.stringify(tagsOf(b).slice().sort()) !== JSON.stringify(b.categories.slice().sort());

  async function save(b: B) {
    setSaving(b.id);
    try {
      const res = await fetch("/api/admin/brands", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: b.id, categories: tagsOf(b) }),
      });
      if (!res.ok) throw new Error();
      setBrands((bs) => bs.map((x) => (x.id === b.id ? { ...x, categories: tagsOf(b) } : x)));
      setDraft((d) => { const n = { ...d }; delete n[b.id]; return n; });
      toast.push({ title: "Brand categories saved", body: b.name });
    } catch { toast.push({ title: "Save failed" }); }
    setSaving(null);
  }

  const list = brands.filter((b) => b.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="container-x py-6">
      <h1 className="mb-1 font-display text-[20px] font-bold text-gray-900">Brands</h1>
      <p className="mb-4 text-[12.5px] text-gray-500">Tag each brand with the categories it sells in — the product form groups brands by these tags.</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search brand"
        className="mb-4 h-10 w-full max-w-sm rounded-lg border border-gray-300 px-3 text-[13px] outline-none focus:border-[#2874f0]" />
      <div className="space-y-1 rounded-xl border border-gray-200 bg-white p-3">
        {list.map((b) => (
          <div key={b.id} className="grid items-center gap-2 border-b border-gray-100 py-2 last:border-0 sm:grid-cols-[220px_1fr_auto]">
            <p className="text-[13px] font-semibold text-gray-900">{b.name}</p>
            <div className="flex flex-wrap gap-3">
              {cats.map((c) => (
                <label key={c} className="flex items-center gap-1.5 text-[12.5px] text-gray-700">
                  <input type="checkbox" checked={tagsOf(b).includes(c)} onChange={() => toggle(b, c)} /> {c}
                </label>
              ))}
            </div>
            <button type="button" disabled={!dirty(b) || saving === b.id} onClick={() => save(b)}
              className="justify-self-end rounded-lg bg-ink-900 px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-30">
              {saving === b.id ? "Saving…" : "Save"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}