"use client";

import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input } from "@/components/ui/Input";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/components/ui/Toaster";

type Initial = {
  name: string;
  email: string;
  phone: string | null;
  whatsappOptIn: boolean;
  role: string;
};

export function ProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const toast = useToast();
  const { setUser } = useCart();
  const [form, setForm] = useState({
    name: initial.name,
    phone: initial.phone ?? "",
    whatsappOptIn: initial.whatsappOptIn,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        fields?: Record<string, string[]>;
        user?: { id: string; name: string; email: string; role: string };
      };

      if (!json.ok || !json.user) {
        const first = json.fields ? Object.values(json.fields).flat()[0] : json.error;
        throw new Error(first ?? "Could not update profile.");
      }

      setUser(json.user);
      toast.push({ title: "Profile updated" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-5">
      <div>
        <h2 className="font-display text-[15px] font-bold text-ink-900">Personal information</h2>
        <p className="mt-1 text-[12.5px] text-ink-400">
          Email is locked for security. Contact support to change it.
        </p>
      </div>

      <Input label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <Input label="Email" value={initial.email} disabled />
      <Input
        label="Mobile number"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
        inputMode="numeric"
        placeholder="9876543210"
      />

      <Checkbox
        checked={form.whatsappOptIn}
        onChange={(e) => setForm({ ...form, whatsappOptIn: e.target.checked })}
        label="Enable WhatsApp order updates and offer alerts"
      />

      {error && (
        <p role="alert" className="rounded-xl bg-flame-500/10 px-3.5 py-2.5 text-[12.5px] font-semibold text-flame-600">
          {error}
        </p>
      )}

      <Button type="submit" loading={busy}>
        {!busy && <Save className="size-4" />}
        Save changes
      </Button>
    </form>
  );
}