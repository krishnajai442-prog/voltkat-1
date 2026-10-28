"use client";

import { ImageIcon, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/Input";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { useToast } from "@/components/ui/Toaster";

type Banner = {
  id: string;
  slot: string;
  title: string;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  imageUrl: string | null;
  active: boolean;
  sortOrder: number;
};

const blank = {
  slot: "PROMO_STRIP",
  title: "",
  subtitle: "",
  ctaLabel: "",
  ctaHref: "",
  imageUrl: "",
  active: true,
  sortOrder: 0,
};

export function BannerManager({ initial, canDelete }: { initial: Banner[]; canDelete: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const [form, setForm] = useState<any>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(editingId ? `/api/admin/banners/${editingId}` : "/api/admin/banners", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json()) as { ok: boolean; banner?: Banner; error?: string };
      if (!json.ok || !json.banner) throw new Error(json.error ?? "Save failed");
      setItems((prev) => editingId ? prev.map((b) => (b.id === editingId ? json.banner! : b)) : [json.banner!, ...prev]);
      setEditingId(null);
      setForm(blank);
      toast.push({ title: editingId ? "Banner updated" : "Banner created" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_24rem]">
      <section className="card overflow-hidden">
        <header className="border-b border-hairline px-4 py-3">
          <h2 className="font-display text-[15px] font-bold text-ink-900">Banners</h2>
        </header>
        <ul className="divide-y divide-hairline">
          {items.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge tone="info">{b.slot}</Badge>
                  {!b.active && <Badge tone="neutral">Inactive</Badge>}
                </div>
                <p className="mt-1.5 font-bold text-ink-900">{b.title}</p>
                {b.subtitle && <p className="mt-0.5 text-[12.5px] text-ink-400">{b.subtitle}</p>}
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    setEditingId(b.id);
                    setForm({
                      slot: b.slot,
                      title: b.title,
                      subtitle: b.subtitle ?? "",
                      ctaLabel: b.ctaLabel ?? "",
                      ctaHref: b.ctaHref ?? "",
                      imageUrl: b.imageUrl ?? "",
                      active: b.active,
                      sortOrder: b.sortOrder,
                    });
                  }}
                  className="rounded-lg border border-hairline px-2.5 py-1.5 text-[12px] font-bold hover:border-electric-300"
                >
                  Edit
                </button>
                {canDelete && (
                  <ConfirmButton url={`/api/admin/banners/${b.id}`} confirmText="Delete banner?" successText="Banner deleted" variant="danger" size="sm">
                    Delete
                  </ConfirmButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <form onSubmit={submit} className="card h-fit space-y-3 p-4">
        <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
          <ImageIcon className="size-4 text-electric-600" />
          {editingId ? "Edit banner" : "Create banner"}
        </h2>
        <Select label="Slot" value={form.slot} onChange={(e: any) => setForm({ ...form, slot: e.target.value })}>
          <option value="HERO_TEXT">Hero text</option>
          <option value="PROMO_STRIP">Promo strip</option>
          <option value="CATEGORY">Category</option>
          <option value="SALE">Sale</option>
          <option value="FOOTER">Footer</option>
        </Select>
        <Input label="Title" value={form.title} onChange={(e: any) => setForm({ ...form, title: e.target.value })} required />
        <Textarea label="Subtitle" value={form.subtitle} onChange={(e: any) => setForm({ ...form, subtitle: e.target.value })} rows={2} />
        <Input label="CTA label" value={form.ctaLabel} onChange={(e: any) => setForm({ ...form, ctaLabel: e.target.value })} />
        <Input label="CTA href" value={form.ctaHref} onChange={(e: any) => setForm({ ...form, ctaHref: e.target.value })} placeholder="/offers" />
        <Input label="Image URL" value={form.imageUrl} onChange={(e: any) => setForm({ ...form, imageUrl: e.target.value })} />
        <Input label="Sort order" type="number" value={form.sortOrder} onChange={(e: any) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
        <Checkbox checked={form.active} onChange={(e: any) => setForm({ ...form, active: e.target.checked })} label="Active" />
        {error && <p role="alert" className="text-[12.5px] font-semibold text-flame-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={busy} className="flex-1">{!busy && <Save className="size-4" />}{editingId ? "Update" : "Create"}</Button>
          {editingId && <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(blank); }}>Cancel</Button>}
        </div>
      </form>
    </div>
  );
}