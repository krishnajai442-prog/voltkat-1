"use client";

import { Loader2, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, PasswordInput } from "@/components/ui/Input";
import { useCart } from "@/context/CartContext";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const { setUser } = useCart();
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
        body: JSON.stringify({ email, password, admin: false }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        user?: { id: string; name: string; email: string; role: string };
        redirect?: string;
      };

      if (!json.ok || !json.user) throw new Error(json.error ?? "Unable to sign in.");

      setUser(json.user);
      const dest =
        next && next.startsWith("/") && !next.startsWith("/admin")
          ? next
          : json.redirect ?? "/account";

      router.push(dest);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        required
      />

      <PasswordInput
        label="Password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        required
      />

      {error && (
        <p role="alert" className="rounded-xl bg-flame-500/10 px-3.5 py-2.5 text-[12.5px] font-semibold text-flame-600">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <Link href="/auth/forgot-password" className="text-[12.5px] font-semibold text-electric-600 hover:underline">
          Forgot password?
        </Link>
        <Link href="/auth/register" className="text-[12.5px] font-semibold text-ink-400 hover:text-ink-900">
          Create account
        </Link>
      </div>

      <Button block size="lg" type="submit" loading={busy}>
        {!busy && <LogIn className="size-4" />}
        Sign in
      </Button>
    </form>
  );
}