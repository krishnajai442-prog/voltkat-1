"use client";

import { Mail, MapPin, Phone, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/components/ui/Toaster";
import { NAV_CATEGORIES } from "@/lib/nav";

export function Footer() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [busy, setBusy] = useState(false);

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone, whatsappOptIn, honeypot }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Subscription failed.");

      toast.push({ title: "Subscribed", body: "You’ll receive VoltKart deal alerts." });
      setEmail("");
      setPhone("");
      setWhatsappOptIn(false);
    } catch (err) {
      toast.push({
        tone: "error",
        title: "Subscription failed",
        body: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <footer className="mt-12 border-t border-hairline bg-ink-900 text-white">
      <div className="container-x grid gap-10 py-12 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1.2fr]">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-electric-500 to-violet-accent">
              <Sparkles className="size-5" />
            </span>
            <span className="font-display text-xl font-bold">
              Volt<span className="text-electric-400">Kart</span>
            </span>
          </Link>

          <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-white/55">
            India’s premium single-store electronics retailer. Genuine products, transparent pricing,
            no-cost EMI, exchange support and dependable delivery.
          </p>

          <div className="mt-5 space-y-2 text-[13px] text-white/55">
            <p className="flex items-center gap-2">
              <Phone className="size-4 text-electric-400" />
              1800-120-4567
            </p>
            <p className="flex items-center gap-2">
              <Mail className="size-4 text-electric-400" />
              support@voltkart.in
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="size-4 text-electric-400" />
              Bengaluru • Mumbai • Delhi NCR
            </p>
          </div>
        </div>

        <FooterCol
          title="Shop"
          links={[
            { href: "/products/all", label: "All Products" },
            ...NAV_CATEGORIES.map((c) => ({ href: `/products/${c.slug}`, label: c.name })),
          ]}
        />

        <FooterCol
          title="Help"
          links={[
            { href: "/track", label: "Track Order" },
            { href: "/offers", label: "Offers & Coupons" },
            { href: "/contact", label: "Contact Support" },
            { href: "/account", label: "My Account" },
          ]}
        />

        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white/70">
            Deal alerts
          </h3>
          <p className="mt-3 text-[13px] leading-relaxed text-white/55">
            Get launch drops, coupon codes and festival sale reminders.
          </p>

          <form onSubmit={subscribe} className="mt-4 space-y-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="Email address"
              required
              className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-[13.5px] text-white outline-none placeholder:text-white/35 focus:border-electric-400"
            />

            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              inputMode="numeric"
              placeholder="Mobile number (optional)"
              className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-[13.5px] text-white outline-none placeholder:text-white/35 focus:border-electric-400"
            />

            <label className="flex cursor-pointer items-start gap-2 text-[12.5px] text-white/55">
              <input
                type="checkbox"
                checked={whatsappOptIn}
                onChange={(e) => setWhatsappOptIn(e.target.checked)}
                className="mt-0.5 size-4 accent-electric-500"
              />
              Send updates on WhatsApp
            </label>

            <input
              type="text"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute left-[-9999px] h-0 w-0 opacity-0"
            />

            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-electric-500 text-[13.5px] font-bold text-white transition-colors hover:bg-electric-600 disabled:opacity-60"
            >
              <Send className="size-4" />
              {busy ? "Subscribing…" : "Subscribe"}
            </button>
          </form>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-x flex flex-wrap items-center justify-between gap-3 py-5 text-[12px] text-white/40">
          <p>© {new Date().getFullYear()} VoltKart Retail Pvt. Ltd. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/contact" className="hover:text-white">Privacy</Link>
            <Link href="/contact" className="hover:text-white">Terms</Link>
            <Link href="/contact" className="hover:text-white">Return Policy</Link>
            <Link href="/contact" className="hover:text-white">Warranty</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white/70">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className="text-[13.5px] text-white/55 transition-colors hover:text-white">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}