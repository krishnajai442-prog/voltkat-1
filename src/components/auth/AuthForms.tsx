"use client";

import { KeyRound, Loader2, LogIn, Mail, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, PasswordInput } from "@/components/ui/Input";

function AuthShell({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="container-x flex min-h-[calc(100dvh-8rem)] items-center justify-center py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-ink-900 text-white">
            {icon}
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold text-ink-900">{title}</h1>
          <p className="mt-1 text-[13.5px] text-ink-400">{subtitle}</p>
        </div>

        <div className="card p-6">{children}</div>

        <p className="mt-4 text-center text-[12.5px] text-ink-400">
          <Link href="/" className="font-semibold text-electric-600 hover:underline">
            Back to storefront
          </Link>
        </p>
      </div>
    </div>
  );
}

function safeNext(next: string | null) {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

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
        redirect?: string;
      };

      if (!json.ok) throw new Error(json.error ?? "Invalid credentials.");

      router.push(next ?? json.redirect ?? "/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Sign in" subtitle="Access orders, wishlist and support." icon={<LogIn className="size-5" />}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
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

        <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
          <Link href="/auth/forgot-password" className="font-semibold text-electric-600 hover:underline">
            Forgot password?
          </Link>
          <Link href="/auth/register" className="font-semibold text-ink-700 hover:underline">
            Create account
          </Link>
        </div>

        {/* <p className="text-center text-[12px] text-ink-400">
          Staff?{" "}
          <Link href="/admin/login" className="font-semibold text-violet-accent hover:underline">
            Admin login
          </Link>
        </p> */}
      </form>
    </AuthShell>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone: form.phone.replace(/\D/g, "").slice(0, 10),
        }),
      });

      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        fields?: Record<string, string[]>;
        redirect?: string;
      };

      if (!json.ok) {
        const first = json.fields ? Object.values(json.fields).flat()[0] : json.error;
        throw new Error(first ?? "Registration failed.");
      }

      router.push(next ?? json.redirect ?? "/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create account" subtitle="Faster checkout, order history and wishlist." icon={<UserPlus className="size-5" />}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Full name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          minLength={2}
        />

        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />

                  <div className="space-y-1.5">
          <label className="text-[12px] font-bold uppercase tracking-wider text-gray-500">
            Mobile number <span className="text-red-500">*</span>
          </label>

          <div className="flex">
            <span className="flex h-11 shrink-0 items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-100 px-3 text-sm font-semibold text-gray-600">
              +91
            </span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              required
              value={form.phone}
              onChange={(e) =>
                setForm({
                  ...form,
                  phone: e.target.value
                    .replace(/\D/g, "")
                    .replace(/^0+(?=\d)/, "")
                    .slice(0, 10),
                })
              }
              placeholder="9876543210"
              className="h-11 w-full rounded-r-lg border border-gray-300 px-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-[#2874f0] focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {form.phone.length > 0 && form.phone.length < 10 && (
            <p className="text-[11px] font-semibold text-orange-500">
              Enter a valid 10-digit mobile number.
            </p>
          )}
        </div>

        <PasswordInput
          label="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          hint="Min 10 chars, upper, lower, number and special character."
        />

        {/* <Checkbox
          checked={form.whatsappOptIn}
          onChange={(e) => setForm({ ...form, whatsappOptIn: e.target.checked })}
          label="Send order updates on WhatsApp"
        /> */}

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

        <Button block size="lg" type="submit" loading={busy}>
          {!busy && <UserPlus className="size-4" />}
          Create account
        </Button>

        <p className="text-center text-[12.5px] text-ink-400">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-semibold text-electric-600 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

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

  return (
    <AuthShell title="Reset password" subtitle="We’ll email you a secure reset link." icon={<KeyRound className="size-5" />}>
      {sent ? (
        <div className="space-y-4 text-center">
          <p className="text-[13.5px] text-ink-700">
            If that email matches an account, a reset link is on its way.
          </p>
          <Button href="/auth/login" block>
            Back to sign in
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {error && (
            <p role="alert" className="rounded-xl bg-flame-500/10 px-3.5 py-2.5 text-[12.5px] font-semibold text-flame-600">
              {error}
            </p>
          )}

          <Button block size="lg" type="submit" loading={busy}>
            {!busy && <Mail className="size-4" />}
            Send reset link
          </Button>

          <p className="text-center text-[12.5px] text-ink-400">
            Remembered it?{" "}
            <Link href="/auth/login" className="font-semibold text-electric-600 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!token) {
      setError("Reset token is missing. Request a new link.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Password reset failed.");

      router.push("/auth/login");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Set new password" subtitle="Choose a strong new password." icon={<KeyRound className="size-5" />}>
      <form onSubmit={onSubmit} className="space-y-4">
        <PasswordInput
          label="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <PasswordInput
          label="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />

        {error && (
          <p role="alert" className="rounded-xl bg-flame-500/10 px-3.5 py-2.5 text-[12.5px] font-semibold text-flame-600">
            {error}
          </p>
        )}

        <Button block size="lg" type="submit" loading={busy}>
          {!busy && <KeyRound className="size-4" />}
          Update password
        </Button>

        <p className="text-center text-[12.5px] text-ink-400">
          <Link href="/auth/forgot-password" className="font-semibold text-electric-600 hover:underline">
            Request a new link
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}