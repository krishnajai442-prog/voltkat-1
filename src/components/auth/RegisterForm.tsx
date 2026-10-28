"use client";

import { Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, PasswordInput } from "@/components/ui/Input";
import { PasswordChecklist } from "@/components/auth/PasswordChecklist";
import { useCart } from "@/context/CartContext";
import { PASSWORD_RULES } from "@/lib/validators";

export function RegisterForm({ next }: { next?: string }) {
  const router = useRouter();
  const { setUser } = useCart();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    whatsappOptIn: false,
    honeypot: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allRulesPass = PASSWORD_RULES.every((r) => r.test(form.password));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allRulesPass) {
      setError("Please meet all password requirements.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        user?: { id: string; name: string; email: string; role: string };
      };

      if (!json.ok || !json.user) throw new Error(json.error ?? "Could not create account.");

      setUser(json.user);
      router.push(next && next.startsWith("/") ? next : "/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        label="Full name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="Rahul Sharma"
        autoComplete="name"
        required
        minLength={2}
      />

      <Input
        label="Email"
        type="email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        placeholder="you@email.com"
        autoComplete="email"
        required
      />

      <Input
        label="Mobile number"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
        placeholder="9876543210"
        inputMode="numeric"
        autoComplete="tel"
      />

      <div>
        <PasswordInput
          label="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="Create a strong password"
          autoComplete="new-password"
          required
        />
        <div className="mt-2.5">
          <PasswordChecklist value={form.password} />
        </div>
      </div>

      <Checkbox
        checked={form.whatsappOptIn}
        onChange={(e) => setForm({ ...form, whatsappOptIn: e.target.checked })}
        label="Send me order updates and offer alerts on WhatsApp"
      />

      {/* honeypot */}
      <input
        type="text"
        name="company_website"
        value={form.honeypot}
        onChange={(e) => setForm({ ...form, honeypot: e.target.value })}
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      {error && (
        <p role="alert" className="rounded-xl bg-flame-500/10 px-3.5 py-2.5 text-[12.5px] font-semibold text-flame-600">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <Link href="/auth/login" className="text-[12.5px] font-semibold text-electric-600 hover:underline">
          Already have an account?
        </Link>
      </div>

      <Button block size="lg" type="submit" loading={busy}>
        {!busy && <UserPlus className="size-4" />}
        Create account
      </Button>
    </form>
  );
}