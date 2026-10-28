"use client";

import { Save, UserCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";

type Initial = {
  name: string;
  email: string;
  phone: string | null;
  whatsappOptIn: boolean;
  marketingOptIn: boolean;
};

export function ProfileClient({ initial }: { initial: Initial }) {
  const router = useRouter();
  const toast = useToast();

  const [form, setForm] = useState({
    name: initial.name,
    phone: initial.phone ?? "",
    whatsappOptIn: initial.whatsappOptIn,
    marketingOptIn: initial.marketingOptIn,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone.replace(/\D/g, "").slice(0, 10),
          whatsappOptIn: form.whatsappOptIn,
          marketingOptIn: form.marketingOptIn,
        }),
      });

      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Could update profile.");

      toast.push({ title: "Profile updated" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could update profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="card p-5">
        <h1 className="flex items-center gap-2 font-display text-xl font-bold text-ink-900">
          <UserCog className="size-5 text-electric-600" />
          Profile settings
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-400">
          Update your name, mobile number and communication preferences.
        </p>
      </header>

      <form onSubmit={submit} className="card space-y-4 p-5">
        <Input
          label="Full name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          minLength={2}
        />

        <Input
          label="Email"
          value={initial.email}
          disabled
          hint="Email is used for login and cannot be changed from this page."
        />

        <Input
          label="Mobile number"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
          inputMode="numeric"
          placeholder="9876543210"
        />

        {/* <Checkbox
          checked={form.whatsappOptIn}
          onChange={(e) => setForm({ ...form, whatsappOptIn: e.target.checked })}
          label="Send order updates and offer alerts on WhatsApp"
        />

        <Checkbox
          checked={form.marketingOptIn}
          onChange={(e) => setForm({ ...form, marketingOptIn: e.target.checked })}
          label="Send me product launches and promotional emails"
        /> */}

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
    </div>
  );
}