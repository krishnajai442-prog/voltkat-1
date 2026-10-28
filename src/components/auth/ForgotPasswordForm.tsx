"use client";

import { KeyRound, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Could not send reset link.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset link.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-mint-500/10 px-4 py-3.5 text-[13.5px] font-semibold text-emerald-700">
          If that email matches an account, a reset link is on its way.
        </div>
        <Button block variant="outline" href="/auth/login">
          Back to login
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        required
      />

      {error && (
        <p role="alert" className="rounded-xl bg-flame-500/10 px-3.5 py-2.5 text-[12.5px] font-semibold text-flame-600">
          {error}
        </p>
      )}

      <Button block size="lg" type="submit" loading={busy}>
        {!busy && <KeyRound className="size-4" />}
        Send reset link
      </Button>

      <p className="text-center text-[12.5px] text-ink-400">
        Remembered it?{" "}
        <Link href="/auth/login" className="font-semibold text-electric-600 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}