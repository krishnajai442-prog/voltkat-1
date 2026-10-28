"use client";

import { ArrowDown, ArrowUp, Save, Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/Input";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ImageUploadButton } from "@/components/admin/ImageUploadButton";
import { ImagePreviewModal } from "@/components/admin/ImagePreviewModal";
import { useToast } from "@/components/ui/Toaster";
import { SLIDE_GRADIENTS } from "@/lib/slide-gradients";

type Slide = {
  id: string;
  badge: string;
  headline: string;
  highlight: string | null;
  description: string | null;
  ctaLabel: string;
  ctaHref: string | null;
  secondaryLabel: string | null;
  secondaryHref: string | null;
  image: string | null;
  gradient: string;
  active: boolean;
  sortOrder: number;
   startsAt: string | null;
  endsAt: string | null;
  productIds: string[];
  productImages: Record<string, string>;
};

const blank = {
  badge: "MEGA OFFER",
  headline: "",
  highlight: "",
  description: "",
  ctaLabel: "Shop Now",
  ctaHref: "",
  secondaryLabel: "",
  secondaryHref: "",
  image: "",
  gradient: "MIDNIGHT",
  active: true,
  sortOrder: 0,
  startsAt: "",
  endsAt: "",
  productIds: [] as string[],
  productImages: {} as Record<string, string>,
};

export function SlideManager({ initial, products, canDelete }: { initial: Slide[]; products: { id: string; name: string }[]; canDelete: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const [form, setForm] = useState<any>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pq, setPq] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
            // Coerce edit-load nulls to "" so the payload is always strings (belt to the
      // schema's nullish() braces), and attach the per-product slide artwork map.
      const payload = {
        ...form,
        highlight: form.highlight ?? "",
        description: form.description ?? "",
        image: form.image ?? "",
        ctaHref: form.ctaHref ?? "",
        secondaryLabel: form.secondaryLabel ?? "",
        secondaryHref: form.secondaryHref ?? "",
        productImages: Object.fromEntries(
          (form.productIds as string[]).map((id: string) => [id, form.productImages?.[id] ?? ""]),
        ),
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
      };
      const res = await fetch(editingId ? `/api/admin/slides/${editingId}` : "/api/admin/slides", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { ok: boolean; slide?: Slide; error?: string };
      if (!json.ok || !json.slide) throw new Error(json.error ?? "Save failed");
      setItems((prev) => editingId ? prev.map((s) => (s.id === editingId ? json.slide! : s)) : [...prev, json.slide!]);
      setEditingId(null);
      setForm(blank);
      toast.push({ title: editingId ? "Slide updated" : "Slide created" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function move(id: string, dir: -1 | 1) {
    const idx = items.findIndex((s) => s.id === id);
    const swap = items[idx + dir];
    if (!swap) return;
    const next = [...items];
    next[idx] = swap;
    next[idx + dir] = items[idx]!;
    setItems(next);
    await fetch("/api/admin/slides/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((s) => s.id) }),
    }).catch(() => router.refresh());
    router.refresh();
  }

    async function toggleActive(id: string) {
    const target = items.find((s) => s.id === id);
    if (!target) return;
    const next = !target.active;
    setToggling(id);
    try {
      const res = await fetch(`/api/admin/slides/${id}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Toggle failed");
      setItems((prev) => prev.map((s) => (s.id === id ? { ...s, active: next } : s)));
      toast.push({ title: next ? "Slide activated" : "Slide deactivated" });
      router.refresh();
    } catch (e) {
      toast.push({ tone: "error", title: "Toggle failed", body: e instanceof Error ? e.message : undefined });
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_26rem]">
      <section className="card overflow-hidden">
        <header className="border-b border-hairline px-4 py-3">
          <h2 className="font-display text-[15px] font-bold text-ink-900">Custom slides</h2>
        </header>
        <ul className="divide-y divide-hairline">
          {items.map((s, idx) => (
            <li key={s.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="violet">{s.badge}</Badge>
                    {!s.active && <Badge tone="neutral">Inactive</Badge>}
                    <span className="text-[11.5px] text-ink-300">#{idx + 1}</span>
                  </div>
                  {s.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.image} alt="" className="mb-1.5 mt-1.5 size-10 rounded border border-hairline object-cover" />
                  )}
                  <p className="mt-1.5 font-bold text-ink-900">{s.headline}</p>
                  {s.description && <p className="mt-0.5 line-clamp-2 text-[12.5px] text-ink-400">{s.description}</p>}
                  <p className="mt-1 text-[11.5px] text-ink-300">{s.productIds.length} product(s) attached</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => move(s.id, -1)} disabled={idx === 0} className="grid size-8 place-items-center rounded-lg border border-hairline disabled:opacity-30" aria-label="Move up"><ArrowUp className="size-3.5" /></button>
                  <button onClick={() => move(s.id, 1)} disabled={idx === items.length - 1} className="grid size-8 place-items-center rounded-lg border border-hairline disabled:opacity-30" aria-label="Move down"><ArrowDown className="size-3.5" /></button>
                  <button
                    onClick={() => {
                      setEditingId(s.id);
                    setForm({ ...s, productImages: s.productImages ?? {}, startsAt: s.startsAt?.slice(0, 16) ?? "", endsAt: s.endsAt?.slice(0, 16) ?? "" });
                    }}
                    className="rounded-lg border border-hairline px-2.5 py-1.5 text-[12px] font-bold hover:border-electric-300"
                  >
                   Edit
                  </button>
                  <button
                    onClick={() => void toggleActive(s.id)}
                    disabled={toggling === s.id}
                    className={`rounded-lg border px-2.5 py-1.5 text-[12px] font-bold transition-colors disabled:opacity-40 ${
                      s.active
                        ? "border-hairline text-ink-600 hover:border-flame-300 hover:text-flame-600"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400"
                    }`}
                  >
                    {toggling === s.id ? "…" : s.active ? "Deactivate" : "Activate"}
                  </button>
                  {canDelete && (
                    <ConfirmButton url={`/api/admin/slides/${s.id}`} confirmText="Delete slide?" successText="Slide deleted" variant="danger" size="sm">
                      Delete
                    </ConfirmButton>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <form onSubmit={submit} className="card h-fit space-y-3 p-4">
        <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
          <SlidersHorizontal className="size-4 text-electric-600" />
          {editingId ? "Edit slide" : "Create slide"}
        </h2>
        <Input label="Badge" value={form.badge} onChange={(e: any) => setForm({ ...form, badge: e.target.value })} required />
        <Input label="Headline" value={form.headline} onChange={(e: any) => setForm({ ...form, headline: e.target.value })} required />
        <Input label="Highlight (last words)" value={form.highlight ?? ""} onChange={(e: any) => setForm({ ...form, highlight: e.target.value })} />
        <Textarea label="Description" value={form.description ?? ""} onChange={(e: any) => setForm({ ...form, description: e.target.value })} rows={2} />
        <div>
          <p className="mb-1.5 text-[12.5px] font-bold text-ink-700">Banner image (optional — full-bleed artwork)</p>
          <div className="grid grid-cols-[auto_auto_1fr] items-center gap-2">
            {form.image ? (
              <button type="button" onClick={() => setPreview(form.image)} title="Click to preview full image"
                className="relative block size-12 cursor-zoom-in overflow-hidden rounded border border-hairline bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image} alt="" className="size-full object-cover" />
              </button>
            ) : (
              <div className="size-12 rounded border border-dashed border-hairline" />
            )}
            <ImageUploadButton onUploaded={(url) => setForm({ ...form, image: url })} />
            <Input value={form.image ?? ""} onChange={(e: any) => setForm({ ...form, image: e.target.value })} placeholder="…or paste a URL" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input label="CTA label" value={form.ctaLabel} onChange={(e: any) => setForm({ ...form, ctaLabel: e.target.value })} />
          <Input label="CTA href" value={form.ctaHref ?? ""} onChange={(e: any) => setForm({ ...form, ctaHref: e.target.value })} />
          <Input label="Secondary label" value={form.secondaryLabel ?? ""} onChange={(e: any) => setForm({ ...form, secondaryLabel: e.target.value })} />
          <Input label="Secondary href" value={form.secondaryHref ?? ""} onChange={(e: any) => setForm({ ...form, secondaryHref: e.target.value })} />
        </div>
        <Select label="Gradient theme" value={form.gradient} onChange={(e: any) => setForm({ ...form, gradient: e.target.value })}>
          {Object.values(SLIDE_GRADIENTS).map((g) => (
            <option key={g.id} value={g.id}>{g.label}</option>
          ))}
        </Select>
        <Input label="Starts" type="datetime-local" value={form.startsAt ?? ""} onChange={(e: any) => setForm({ ...form, startsAt: e.target.value })} />
        <Input label="Ends" type="datetime-local" value={form.endsAt ?? ""} onChange={(e: any) => setForm({ ...form, endsAt: e.target.value })} />
        <Checkbox checked={form.active} onChange={(e: any) => setForm({ ...form, active: e.target.checked })} label="Active" />

                <div>
          <p className="mb-1.5 text-[12.5px] font-bold text-ink-700">Attach up to 3 products</p>
          <div className="mb-2 flex gap-2">
            <input
              value={pq}
              onChange={(e) => setPq(e.target.value)}
              placeholder="Search products (any word, e.g. rog, dell)"
              className="h-9 flex-1 rounded-lg border border-hairline px-2.5 text-[12.5px] outline-none focus:border-electric-400"
            />
            {pq.trim() && (
              <button
                type="button"
                onClick={() => setPq("")}
                className="rounded-lg border border-hairline px-3 text-[12px] font-semibold text-ink-600 hover:bg-ink-50"
              >
                Clear
              </button>
            )}
          </div>
          {pq.trim() && (
            <p className="mb-1 text-[11px] text-ink-400">
              Filtering as you type — selected products always stay visible so you can uncheck them.
            </p>
          )}
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-hairline p-2">
            {(() => {
              const q = pq.trim().toLowerCase();
              const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
              // Live any-word filter. Selected rows are NEVER hidden, so the
              // per-product "Slide image" input stays reachable and uncheckable
              // even when it doesn't match the current query.
              const visible = products.filter((p) => {
                if (form.productIds.includes(p.id)) return true;
                if (!tokens.length) return true;
                const h = p.name.toLowerCase();
                return tokens.some((t) => h.includes(t));
              });
              if (!visible.length) {
                return <p className="p-2 text-[12.5px] text-ink-400">No products match “{pq.trim()}”.</p>;
              }
              return visible.map((p) => {
              const checked = form.productIds.includes(p.id);
              return (
                  <div key={p.id} className="rounded-lg px-1 py-0.5">
                  <label className="flex cursor-pointer items-center gap-2 text-[12.5px]">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && form.productIds.length >= 3}
                      onChange={(e) => {
                        setForm((f: any) => ({
                          ...f,
                          productIds: e.target.checked ? [...f.productIds, p.id].slice(0, 3) : f.productIds.filter((id: string) => id !== p.id),
                        }));
                      }}
                      className="size-3.5 accent-electric-500"
                    />
                    <span className="truncate">{p.name}</span>
                  </label>
                  {checked && (
                    <div className="ml-5 mt-1 grid grid-cols-[auto_1fr] items-center gap-1.5">
                      <ImageUploadButton
                        label="Slide image"
                        onUploaded={(url) => setForm((f: any) => ({ ...f, productImages: { ...f.productImages, [p.id]: url } }))}
                      />
                      <Input
                        value={form.productImages?.[p.id] ?? ""}
                        onChange={(e: any) => setForm((f: any) => ({ ...f, productImages: { ...f.productImages, [p.id]: e.target.value } }))}
                        placeholder="…or paste a URL (slide-specific)"
                      />
                    </div>
                  )}
                 </div>
              );
              });
            })()}
          </div>
        </div>

        {error && <p role="alert" className="text-[12.5px] font-semibold text-flame-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={busy} className="flex-1">{!busy && <Save className="size-4" />}{editingId ? "Update" : "Create"}</Button>
          {editingId && <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(blank); }}>Cancel</Button>}
        </div>
      </form>

      {preview && <ImagePreviewModal url={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}