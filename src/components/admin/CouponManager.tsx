"use client";

import { Gift, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/Input";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { useToast } from "@/components/ui/Toaster";
import { formatDate, inr } from "@/lib/utils";

type Option = { id: string; name: string };
type Coupon = {
  id: string;
  code: string;
  description: string | null;
  type: "PERCENT" | "FIXED";
  value: number;
  scope: "ALL" | "CATEGORY" | "BRAND";
  categoryId: string | null;
  brandId: string | null;
  categoryName: string | null;
  brandName: string | null;
  minOrderValue: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  perUserLimit: number;
  active: boolean;
  startsAt: string;
  endsAt: string | null;
};

const blank = {
  code: "",
  description: "",
  type: "PERCENT" as const,
  value: 10,
  scope: "ALL" as const,
  categoryId: "",
  brandId: "",
  minOrderValue: 0,
  maxDiscount: 0,
  usageLimit: 0,
  perUserLimit: 1,
  active: true,
  startsAt: new Date().toISOString().slice(0, 16),
  endsAt: "",
  broadcast: false,
};

export function CouponManager({
  initial,
  categories,
  brands,
  canDelete,
}: {
  initial: Coupon[];
  categories: Option[];
  brands: Option[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const [form, setForm] = useState<any>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(c: Coupon) {
    setEditingId(c.id);
    setForm({
      code: c.code,
      description: c.description ?? "",
      type: c.type,
      value: c.value,
      scope: c.scope,
      categoryId: c.categoryId ?? "",
      brandId: c.brandId ?? "",
      minOrderValue: c.minOrderValue,
      maxDiscount: c.maxDiscount ?? 0,
      usageLimit: c.usageLimit ?? 0,
      perUserLimit: c.perUserLimit,
      active: c.active,
      startsAt: c.startsAt.slice(0, 16),
      endsAt: c.endsAt?.slice(0, 16) ?? "",
      broadcast: false,
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const payload = {
        ...form,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        categoryId: form.scope === "CATEGORY" ? form.categoryId : undefined,
        brandId: form.scope === "BRAND" ? form.brandId : undefined,
      };

      const res = await fetch(editingId ? `/api/admin/coupons/${editingId}` : "/api/admin/coupons", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; coupon?: Coupon };
      if (!json.ok || !json.coupon) throw new Error(json.error ?? "Save failed");

      setItems((prev) =>
        editingId ? prev.map((c) => (c.id === editingId ? json.coupon! : c)) : [json.coupon!, ...prev],
      );
      setEditingId(null);
      setForm(blank);
      toast.push({ title: editingId ? "Coupon updated" : "Coupon created" });
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
          <h2 className="font-display text-[15px] font-bold text-ink-900">Live & scheduled coupons</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-[13px]">
            <thead className="bg-canvas text-left text-[11px] font-bold uppercase tracking-wider text-ink-300">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Usage</th>
                <th className="px-4 py-3">Validity</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-canvas/50">
                  <td className="px-4 py-3">
                    <p className="font-display font-bold tracking-wider text-ink-900">{c.code}</p>
                    <p className="mt-0.5 text-[11.5px] text-ink-400">{c.description ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 font-bold tabular-nums">
                    {c.type === "PERCENT" ? `${c.value}%` : inr(c.value)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="neutral">{c.scope}</Badge>
                    <p className="mt-1 text-[11.5px] text-ink-400">
                      {c.categoryName ?? c.brandName ?? "Storewide"}
                    </p>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {c.usedCount}
                    {c.usageLimit ? ` / ${c.usageLimit}` : ""}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-ink-400">
                    {formatDate(c.startsAt)}
                    {c.endsAt ? ` → ${formatDate(c.endsAt)}` : " → open"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => startEdit(c)} className="rounded-lg border border-hairline px-2.5 py-1.5 text-[12px] font-bold hover:border-electric-300">
                        Edit
                      </button>
                      {canDelete && (
                        <ConfirmButton
                          url={`/api/admin/coupons/${c.id}`}
                          confirmText="Delete this coupon?"
                          successText="Coupon deleted"
                          variant="danger"
                          size="sm"
                        >
                          Delete
                        </ConfirmButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <form onSubmit={submit} className="card h-fit space-y-3 p-4">
        <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
          <Gift className="size-4 text-electric-600" />
          {editingId ? "Edit coupon" : "Create coupon"}
        </h2>

        <Input label="Code" value={form.code} onChange={(e: any) => setForm({ ...form, code: e.target.value.toUpperCase() })} required minLength={3} maxLength={24} />
        <Textarea label="Description" value={form.description} onChange={(e: any) => setForm({ ...form, description: e.target.value })} rows={2} />
        <Select label="Type" value={form.type} onChange={(e: any) => setForm({ ...form, type: e.target.value })}>
          <option value="PERCENT">Percentage</option>
          <option value="FIXED">Fixed ₹</option>
        </Select>
        <Input label="Value" type="number" value={form.value} onChange={(e: any) => setForm({ ...form, value: Number(e.target.value) })} required min={1} max={form.type === "PERCENT" ? 90 : 200000} />
        <Select label="Scope" value={form.scope} onChange={(e: any) => setForm({ ...form, scope: e.target.value })}>
          <option value="ALL">All products</option>
          <option value="CATEGORY">Category</option>
          <option value="BRAND">Brand</option>
        </Select>
        {form.scope === "CATEGORY" && (
          <Select label="Category" value={form.categoryId} onChange={(e: any) => setForm({ ...form, categoryId: e.target.value })} required>
            <option value="">Select</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        )}
        {form.scope === "BRAND" && (
          <Select label="Brand" value={form.brandId} onChange={(e: any) => setForm({ ...form, brandId: e.target.value })} required>
            <option value="">Select</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Input label="Min order" type="number" value={form.minOrderValue} onChange={(e: any) => setForm({ ...form, minOrderValue: Number(e.target.value) })} />
          <Input label="Max discount" type="number" value={form.maxDiscount} onChange={(e: any) => setForm({ ...form, maxDiscount: Number(e.target.value) })} />
          <Input label="Usage limit" type="number" value={form.usageLimit} onChange={(e: any) => setForm({ ...form, usageLimit: Number(e.target.value) })} />
          <Input label="Per user" type="number" value={form.perUserLimit} onChange={(e: any) => setForm({ ...form, perUserLimit: Number(e.target.value) })} />
        </div>
        <Input label="Starts" type="datetime-local" value={form.startsAt} onChange={(e: any) => setForm({ ...form, startsAt: e.target.value })} />
        <Input label="Ends" type="datetime-local" value={form.endsAt} onChange={(e: any) => setForm({ ...form, endsAt: e.target.value })} />
        <Checkbox checked={form.active} onChange={(e: any) => setForm({ ...form, active: e.target.checked })} label="Active" />
        {!editingId && (
          <Checkbox checked={form.broadcast} onChange={(e: any) => setForm({ ...form, broadcast: e.target.checked })} label="Broadcast to subscribers on creation" />
        )}

        {error && <p role="alert" className="text-[12.5px] font-semibold text-flame-600">{error}</p>}

        <div className="flex gap-2">
          <Button type="submit" loading={busy} className="flex-1">
            {!busy && <Save className="size-4" />}
            {editingId ? "Update" : "Create"}
          </Button>
          {editingId && (
            <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(blank); }}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}