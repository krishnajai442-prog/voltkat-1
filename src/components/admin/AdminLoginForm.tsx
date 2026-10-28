"use client";

import { Lock, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, PasswordInput } from "@/components/ui/Input";

export function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, admin: true }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Invalid admin credentials.");

      router.push(next && next.startsWith("/admin") ? next : "/admin/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-x flex min-h-dvh items-center justify-center py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-ink-900 text-white">
            <Lock className="size-5" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold text-ink-900">
            Admin Console
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-400">
            Restricted access. Authorized staff only.
          </p>
        </div>

        <form onSubmit={onSubmit} className="card space-y-4 p-6">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@voltkart.in"
            autoComplete="username"
            required
          />

          <PasswordInput
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />

          {error && (
            <p role="alert" className="rounded-xl bg-flame-500/10 px-3.5 py-2.5 text-[12.5px] font-semibold text-flame-600">
              {error}
            </p>
          )}

          <Button block size="lg" type="submit" loading={busy}>
            {!busy && <LogIn className="size-4" />}
            Sign in
          </Button>

          <p className="text-center text-[12px] text-ink-400">
            No public admin signup. First admin is created only via{" "}
            <code>npm run seed:admin</code>.
          </p>
        </form>

        <p className="mt-4 text-center text-[12.5px] text-ink-400">
          <Link href="/" className="font-semibold text-electric-600 hover:underline">
            Back to storefront
          </Link>
        </p>
      </div>
    </div>
  );
}