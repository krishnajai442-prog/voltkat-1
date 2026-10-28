"use client";

import { Loader2, Search, Truck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { TrackingTimeline, type EventVM } from "@/components/tracking/TrackingTimeline";

type TrackResult = {
  orderNumber: string;
  status: string;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  etaFrom?: string | null;
  etaTo?: string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
  token?: string;
  events: EventVM[];
  items: { name: string; quantity: number; image?: string | null }[];
};

export function TrackForm({ initialOrder = "" }: { initialOrder?: string }) {
  const [orderNumber, setOrderNumber] = useState(initialOrder);
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResult | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, identifier }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; result?: TrackResult };
      if (!json.ok || !json.result) throw new Error(json.error ?? "Tracking failed");
      setResult(json.result);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Unable to track order.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="card grid gap-3 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Input
          label="Order number"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
          placeholder="VKXXXXXXXX"
          required
        />
        <Input
          label="Email or mobile"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="you@email.com or 9876543210"
          required
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-electric-500 px-5 text-[14px] font-bold text-white transition-colors hover:bg-electric-600 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          Track
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-xl bg-flame-500/10 px-4 py-3 text-[13px] font-semibold text-flame-600">
          {error}
        </p>
      )}

      {result && (
        <section className="card p-5">
          <header className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-hairline pb-4">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wider text-ink-300">
                Order
              </p>
              <h2 className="font-display text-xl font-bold text-ink-900">
                {result.orderNumber}
              </h2>
              <p className="mt-1 text-[13px] text-ink-400">
                {result.items.length} item(s) · Total paid{" "}
                <strong className="text-ink-900">
                  ₹{result.total.toLocaleString("en-IN")}
                </strong>
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge tone={result.status === "DELIVERED" ? "save" : "info"}>
                {result.status.replace(/_/g, " ")}
              </Badge>
              <Badge tone="neutral">
                {result.paymentMethod} · {result.paymentStatus}
              </Badge>
              {result.token && (
                <Link
                  href={`/order/${result.orderNumber}?tok=${result.token}`}
                  className="text-[12.5px] font-bold text-electric-600 hover:underline"
                >
                  View full invoice →
                </Link>
              )}
            </div>
          </header>

          <div className="mb-5 flex flex-wrap gap-2">
            {result.items.map((i, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-2 rounded-lg bg-canvas px-2.5 py-1.5 text-[12px] font-semibold text-ink-700"
              >
                <Truck className="size-3.5 text-ink-300" />
                {i.name} × {i.quantity}
              </span>
            ))}
          </div>

          <TrackingTimeline
            status={result.status}
            events={result.events}
            eta={
              result.etaFrom && result.etaTo
                ? { from: result.etaFrom, to: result.etaTo }
                : null
            }
            carrier={result.carrier}
            trackingNumber={result.trackingNumber}
          />
        </section>
      )}
    </div>
  );
}