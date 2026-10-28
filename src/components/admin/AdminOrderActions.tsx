"use client";

import { Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";

const NEXT: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function AdminOrderActions({
  orderNumber,
  status,
  carrier,
  trackingNumber,
}: {
  orderNumber: string;
  status: string;
  carrier: string;
  trackingNumber: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const options = NEXT[status] ?? [];
  const [next, setNext] = useState(options[0] ?? "");
  const [_carrier, setCarrier] = useState(carrier || "Delhivery Partner Network");
  const [_tracking, setTracking] = useState(trackingNumber);
  const [note, setNote] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);

  if (!options.length) {
    return (
      <section className="card p-4">
        <h2 className="font-display text-[15px] font-bold text-ink-900">Status</h2>
        <p className="mt-2 text-[13px] text-ink-400">This order is in a terminal state.</p>
      </section>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderNumber}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next, carrier: _carrier, trackingNumber: _tracking, note, location }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Status update failed");
      toast.push({ title: "Order status updated" });
      router.refresh();
    } catch (err) {
      toast.push({ tone: "error", title: "Update failed", body: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-4">
      <h2 className="font-display text-[15px] font-bold text-ink-900">Advance status</h2>

      <Select label="Next status" value={next} onChange={(e) => setNext(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>{o.replace(/_/g, " ")}</option>
        ))}
      </Select>

      {next === "SHIPPED" && (
        <>
          <Input label="Carrier" value={_carrier} onChange={(e) => setCarrier(e.target.value)} />
          <Input label="Tracking number (optional)" value={_tracking} onChange={(e) => setTracking(e.target.value)} placeholder="auto-generated if blank" />
        </>
      )}

      <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Bengaluru HDC" />
      <Textarea label="Internal note / customer message" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />

      <Button type="submit" loading={busy} block>
        {!busy && <Send className="size-4" />}
        Update status
      </Button>
    </form>
  );
}