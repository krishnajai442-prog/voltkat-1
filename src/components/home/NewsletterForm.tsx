"use client";

import { motion } from "framer-motion";
import { Check, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/Input";

export function NewsletterForm({ variant = "footer" }: { variant?: "footer" | "band" }) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [wa, setWa] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone: phone || undefined, whatsappOptIn: wa }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Failed");
      setState("done");
      setMsg("You're in. Expect drop alerts before the sale goes public.");
    } catch (err) {
      setState("error");
      setMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (state === "done") {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2.5 rounded-xl bg-mint-500/12 px-4 py-3 text-[13.5px] font-semibold text-emerald-700">
        <Check className="size-4" /> {msg}
      </motion.div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={variant === "band" ? "mx-auto flex w-full max-w-xl flex-col gap-3 sm:flex-row" : "space-y-3"}>
      <div className={variant === "band" ? "flex flex-1 gap-2" : "space-y-2"}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          aria-label="Email address for deal alerts"
          className="h-11 min-w-0 flex-1 rounded-xl border border-hairline bg-white px-3.5 text-[14px] text-ink-900 outline-none focus:border-electric-400 focus:ring-4 focus:ring-electric-500/10"
        />
        {variant === "band" && (
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="numeric"
            maxLength={10}
            placeholder="Mobile (optional)"
            aria-label="Mobile number for WhatsApp alerts"
            className="h-11 w-40 rounded-xl border border-hairline bg-white px-3.5 text-[14px] outline-none focus:border-electric-400"
          />
        )}
        <button
          type="submit"
          disabled={state === "busy"}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-electric-500 px-5 text-[13.5px] font-bold text-white transition-colors hover:bg-electric-600 disabled:opacity-60"
        >
          {state === "busy" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {variant === "band" ? "Subscribe" : "Notify me"}
        </button>
      </div>
      <Checkbox
        checked={wa}
        onChange={(e) => setWa(e.target.checked)}
        label={
          variant === "band" ? (
            "Also send offer alerts on WhatsApp"
          ) : (
            <span className="text-white/60">
              Enable WhatsApp alerts for new arrivals & flash deals
            </span>
          )
        }
        className={variant === "band" ? "text-ink-400" : ""}
      />
      {variant !== "band" && (
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="numeric"
          maxLength={10}
          placeholder="Mobile number (for WhatsApp)"
          aria-label="Mobile number"
          className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-3.5 text-[14px] text-white outline-none placeholder:text-white/40 focus:border-electric-400"
        />
      )}
      {msg && state === "error" && <p role="alert" className="text-[12.5px] font-semibold text-flame-500">{msg}</p>}
      <p className={`text-[11px] ${variant === "band" ? "text-ink-300" : "text-white/35"}`}>
        No spam. Unsubscribe in one tap. Read our privacy policy.
      </p>
    </form>
  );
}