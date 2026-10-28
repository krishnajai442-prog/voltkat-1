"use client";

import { RotateCcw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Input";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useToast } from "@/components/ui/Toaster";
import { inr, relativeTime } from "@/lib/utils";

type Return = {
  id: string;
  status: string;
  reason: string;
  details: string | null;
  resolution: string | null;
  adminNote: string | null;
  createdAt: string;
  orderNumber: string;
  orderTotal: number;
  paymentStatus: string;
  customer: string;
  email: string;
  itemName: string;
  itemTotal: number;
  productId: string | null;
  stock: number | null;
};

const OPTIONS = ["APPROVED", "REJECTED", "PICKED_UP", "REPLACED", "REFUNDED", "CLOSED"];

export function ReturnsManager({ initial, canRefund }: { initial: Return[]; canRefund: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, string>>(
    Object.fromEntries(initial.map((r) => [r.id, r.status === "REQUESTED" ? "APPROVED" : r.status])),
  );

  async function decide(id: string) {
    const status = statuses[id] ?? "APPROVED";
    if (status === "REFUNDED" && !canRefund) {
      toast.push({ tone: "error", title: "Admin only", body: "Refunds require ADMIN role." });
      return;
    }

    setBusy(id);
    try {
      const res = await fetch(`/api/admin/returns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote: notes[id] ?? "" }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; return?: { id: string; status: string } };
      if (!json.ok) throw new Error(json.error ?? "Decision failed");
      setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status: json.return!.status } : r)));
      toast.push({ title: "Return updated" });
      router.refresh();
    } catch (e) {
      toast.push({ tone: "error", title: "Update failed", body: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card overflow-hidden">
      <header className="flex items-center gap-2 border-b border-hairline px-4 py-3">
        <RotateCcw className="size-4 text-electric-600" />
        <h2 className="font-display text-[15px] font-bold text-ink-900">Return requests</h2>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[70rem] text-[13px]">
          <thead className="bg-canvas text-left text-[11px] font-bold uppercase tracking-wider text-ink-300">
            <tr>
              <th className="px-4 py-3">Request</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Decision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {items.map((r) => (
              <tr key={r.id} className="align-top hover:bg-canvas/50">
                <td className="px-4 py-3">
                  <p className="font-bold text-ink-900">{r.orderNumber}</p>
                  <p className="mt-0.5 text-[11.5px] text-ink-400">{relativeTime(r.createdAt)}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink-900">{r.customer}</p>
                  <p className="text-[11.5px] text-ink-400">{r.email}</p>
                </td>
                <td className="max-w-64 px-4 py-3">
                  <p className="truncate font-semibold text-ink-900">{r.itemName}</p>
                  <p className="mt-0.5 text-[11.5px] text-ink-400">{inr(r.itemTotal)} · stock {r.stock ?? "—"}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink-900">{r.reason.replace(/_/g, " ")}</p>
                  {r.details && <p className="mt-1 line-clamp-3 text-[12px] text-ink-400">{r.details}</p>}
                </td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3">
                  <div className="w-64 space-y-2">
                    <Select value={statuses[r.id] ?? "APPROVED"} onChange={(e) => setStatuses((s) => ({ ...s, [r.id]: e.target.value }))}>
                      {OPTIONS.filter((o) => o !== "REFUNDED" || canRefund).map((o) => (
                        <option key={o} value={o}>{o.replace(/_/g, " ")}</option>
                      ))}
                    </Select>
                    <Textarea
                      rows={2}
                      placeholder="Internal note / customer message"
                      value={notes[r.id] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                    />
                    <Button size="sm" loading={busy === r.id} onClick={() => void decide(r.id)} block>
                      {!busy && <Save className="size-3.5" />} Save decision
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}