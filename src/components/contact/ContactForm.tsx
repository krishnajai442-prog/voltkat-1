"use client";

import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";

export function ContactForm() {
  const toast = useToast();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    topic: "SUPPORT",
    message: "",
    honeypot: "",
  });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Could not send message.");
      setSent(true);
      toast.push({ title: "Message sent", body: "Our team will reply soon." });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="card p-6 text-center">
        <h2 className="font-display text-xl font-bold text-ink-900">Thanks for reaching out</h2>
        <p className="mt-2 text-[13.5px] text-ink-400">
          Your message has been received. Our support team typically replies within 24 working hours.
        </p>
        <Button className="mt-5" variant="outline" onClick={() => setSent(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-5 sm:p-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <Input label="Mobile (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} inputMode="numeric" />
        <Select label="Topic" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>
          <option value="SALES">Sales / product advice</option>
          <option value="SUPPORT">Order support</option>
          <option value="PARTNERSHIP">Partnership</option>
          <option value="PRESS">Press</option>
          <option value="OTHER">Other</option>
        </Select>
      </div>

      <Textarea
        label="Message"
        value={form.message}
        onChange={(e) => setForm({ ...form, message: e.target.value })}
        rows={6}
        required
        minLength={10}
        placeholder="Tell us what you need help with. Include order number if relevant."
      />

      <input
        type="text"
        value={form.honeypot}
        onChange={(e) => setForm({ ...form, honeypot: e.target.value })}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      {error && (
        <p role="alert" className="rounded-xl bg-flame-500/10 px-3.5 py-2.5 text-[12.5px] font-semibold text-flame-600">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" loading={busy}>
        {!busy && <Send className="size-4" />}
        Send message
      </Button>
    </form>
  );
}