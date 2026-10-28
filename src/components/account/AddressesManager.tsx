"use client";

import { Check, Loader2, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import type { AddressVM } from "@/lib/address-types";

const emptyForm = {
  label: "Home",
  fullName: "",
  phone: "",
  altPhone: "",
  pincode: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  isDefault: false,
};

export function AddressesManager({ initial }: { initial: AddressVM[] }) {
  const router = useRouter();
  const toast = useToast();
  const [addresses, setAddresses] = useState(initial);
  const [showForm, setShowForm] = useState(initial.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError(null);
  }

  function startEdit(a: AddressVM) {
    setEditingId(a.id);
    setForm({
      label: a.label,
      fullName: a.fullName,
      phone: a.phone,
      altPhone: a.altPhone ?? "",
      pincode: a.pincode,
      line1: a.line1,
      line2: a.line2 ?? "",
      city: a.city,
      state: a.state,
      isDefault: a.isDefault,
    });
    setShowForm(true);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const url = editingId ? `/api/account/addresses/${editingId}` : "/api/account/addresses";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        fields?: Record<string, string[]>;
        address?: AddressVM;
      };

      if (!json.ok || !json.address) {
        const first = json.fields ? Object.values(json.fields).flat()[0] : json.error;
        throw new Error(first ?? "Could not save address.");
      }

      setAddresses((prev) => {
        if (editingId) return prev.map((a) => (a.id === editingId ? json.address! : a));
        return [json.address!, ...prev];
      });

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      toast.push({ title: editingId ? "Address updated" : "Address added" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save address.");
    } finally {
      setBusy(false);
    }
  }

  async function setDefault(id: string) {
    const res = await fetch(`/api/account/addresses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    const json = (await res.json()) as { ok: boolean; error?: string };
    if (!json.ok) {
      toast.push({ tone: "error", title: "Could not set default", body: json.error });
      return;
    }
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
    toast.push({ title: "Default address updated" });
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this address?")) return;
    const res = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
    const json = (await res.json()) as { ok: boolean; error?: string };
    if (!json.ok) {
      toast.push({ tone: "error", title: "Delete failed", body: json.error });
      return;
    }
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    toast.push({ tone: "info", title: "Address deleted" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[15px] font-bold text-ink-900">Saved addresses</h2>
        <Button size="sm" onClick={startAdd}>
          <Plus className="size-3.5" /> Add address
        </Button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="card grid gap-3 p-5 sm:grid-cols-2">
          <Select
            containerClassName="sm:col-span-2"
            label="Label"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          >
            <option>Home</option>
            <option>Work</option>
            <option>Other</option>
          </Select>

          <Input containerClassName="sm:col-span-2" label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          <Input label="Mobile" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} required inputMode="numeric" />
          <Input label="Alternate mobile" value={form.altPhone} onChange={(e) => setForm({ ...form, altPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })} inputMode="numeric" />
          <Input label="PIN code" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} required inputMode="numeric" />
          <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
          <Input containerClassName="sm:col-span-2" label="Flat, house no., building, street" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} required />
          <Input containerClassName="sm:col-span-2" label="Area, landmark" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} />
          <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required />

          <div className="sm:col-span-2">
            <Checkbox checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} label="Set as default address" />
          </div>

          {error && (
            <p role="alert" className="sm:col-span-2 rounded-xl bg-flame-500/10 px-3.5 py-2.5 text-[12.5px] font-semibold text-flame-600">
              {error}
            </p>
          )}

          <div className="flex gap-2 sm:col-span-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={busy} className="flex-1">
              {editingId ? "Update address" : "Save address"}
            </Button>
          </div>
        </form>
      )}

      {addresses.length === 0 && !showForm && (
        <p className="card p-5 text-center text-[13.5px] text-ink-400">
          No saved addresses yet. Add one to speed up checkout.
        </p>
      )}

      <ul className="space-y-3">
        {addresses.map((a) => (
          <li key={a.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[14px] font-bold text-ink-900">{a.fullName}</p>
                  <Badge tone="neutral">{a.label}</Badge>
                  {a.isDefault && (
                    <Badge tone="info">
                      <Check className="size-3" /> Default
                    </Badge>
                  )}
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-400">
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} — {a.pincode}
                </p>
                <p className="mt-1 text-[12.5px] font-semibold text-ink-700">
                  ☎ {a.phone}
                  {a.altPhone ? ` · ${a.altPhone}` : ""}
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-1.5">
                <button onClick={() => startEdit(a)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-bold text-ink-400 hover:bg-canvas hover:text-ink-900">
                  <Pencil className="size-3.5" /> Edit
                </button>
                {!a.isDefault && (
                  <button onClick={() => void setDefault(a.id)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-bold text-electric-600 hover:bg-electric-50">
                    <MapPin className="size-3.5" /> Set default
                  </button>
                )}
                <button onClick={() => void remove(a.id)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-bold text-flame-600 hover:bg-flame-500/10">
                  <Trash2 className="size-3.5" /> Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}