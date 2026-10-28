"use client";

import { Check, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import type { AddressVM } from "@/lib/address-types";

const blank = {
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

export function AddressesClient({ initial }: { initial: AddressVM[] }) {
  const router = useRouter();
  const toast = useToast();

  const [items, setItems] = useState(initial);
  const [form, setForm] = useState({ ...blank });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ ...blank });
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch(editingId ? `/api/account/addresses/${editingId}` : "/api/account/addresses", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Could save address.");

      toast.push({ title: editingId ? "Address updated" : "Address added" });
      cancelEdit();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could save address.");
    } finally {
      setBusy(false);
    }
  }

  async function makeDefault(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/account/addresses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Could update default address.");
      setItems((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
      toast.push({ title: "Default address updated" });
      router.refresh();
    } catch (err) {
      toast.push({
        tone: "error",
        title: "Update failed",
        body: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this address?")) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Could delete address.");
      setItems((prev) => prev.filter((a) => a.id !== id));
      if (editingId === id) cancelEdit();
      toast.push({ title: "Address deleted" });
      router.refresh();
    } catch (err) {
      toast.push({
        tone: "error",
        title: "Delete failed",
        body: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-ink-900">Saved addresses</h1>
        <Button size="sm" onClick={() => { cancelEdit(); }}>
          <Plus className="size-3.5" />
          Add address
        </Button>
      </header>

      {items.length === 0 ? (
        <p className="card p-5 text-[13.5px] text-ink-400">No saved addresses yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-[15px] font-bold text-ink-900">{a.fullName}</p>
                    <Badge tone="neutral">{a.label}</Badge>
                    {a.isDefault && <Badge tone="info">Default</Badge>}
                  </div>

                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-400">
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} — {a.pincode}
                  </p>

                  <p className="mt-1 text-[12.5px] font-semibold text-ink-700">
                    ☎ {a.phone}
                    {a.altPhone ? ` · Alt ${a.altPhone}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(a)}>
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>

                  {!a.isDefault && (
                    <Button size="sm" variant="outline" loading={busy} onClick={() => void makeDefault(a.id)}>
                      <Check className="size-3.5" />
                      Set default
                    </Button>
                  )}

                  <Button size="sm" variant="danger" loading={busy} onClick={() => void remove(a.id)}>
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="card space-y-4 p-5">
        <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
          <MapPin className="size-4 text-electric-600" />
          {editingId ? "Edit address" : "Add new address"}
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Home / Office" />
          <Input label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          <Input label="Mobile" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} inputMode="numeric" required />
          <Input label="Alternate mobile" value={form.altPhone} onChange={(e) => setForm({ ...form, altPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })} inputMode="numeric" />
          <Input label="PIN code" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} inputMode="numeric" required />
          <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
          <Input containerClassName="sm:col-span-2" label="Flat, house no., building, street" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} required />
          <Input containerClassName="sm:col-span-2" label="Area, landmark" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} />
          <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required />
        </div>

        <Checkbox
          checked={form.isDefault}
          onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
          label="Make this my default delivery address"
        />

        {error && (
          <p role="alert" className="rounded-xl bg-flame-500/10 px-3.5 py-2.5 text-[12.5px] font-semibold text-flame-600">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" loading={busy}>
            {editingId ? "Update address" : "Save address"}
          </Button>
          {editingId && (
            <Button type="button" variant="outline" onClick={cancelEdit}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}