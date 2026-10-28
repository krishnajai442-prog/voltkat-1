"use client";

import { LifeBuoy, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Input";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useToast } from "@/components/ui/Toaster";
import { formatDateTime } from "@/lib/utils";

type Ticket = {
  id: string;
  reference: string;
  status: string;
  customer: { name: string; email: string; phone: string | null };
  messages: { id: string; body: string; fromStaff: boolean; author: string; createdAt: string }[];
};

export function AdminTicketThread({ ticket }: { ticket: Ticket }) {
  const router = useRouter();
  const toast = useToast();
  const [body, setBody] = useState("");
  const [status, setStatus] = useState(ticket.status);
  const [busy, setBusy] = useState(false);

  async function reply() {
    if (body.trim().length < 2) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/support/${ticket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, status }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Reply failed");
      setBody("");
      toast.push({ title: "Reply sent" });
      router.refresh();
    } catch (e) {
      toast.push({ tone: "error", title: "Reply failed", body: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <section className="card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
            <LifeBuoy className="size-4 text-electric-600" /> Conversation
          </h2>
          <StatusBadge status={ticket.status} />
        </div>

        <ul className="space-y-3">
          {ticket.messages.map((m) => (
            <li key={m.id} className={`flex ${m.fromStaff ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${m.fromStaff ? "bg-ink-900 text-white" : "bg-canvas text-ink-900"}`}>
                <p>{m.body}</p>
                <p className={`mt-1 text-[10.5px] ${m.fromStaff ? "text-white/50" : "text-ink-400"}`}>
                  {m.author} · {formatDateTime(m.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 border-t border-hairline pt-4">
          <Textarea label="Staff reply" value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Write a clear, helpful reply…" />
          <div className="mt-3 flex gap-2">
            <Button onClick={reply} loading={busy}>
              {!busy && <Send className="size-4" />} Send reply
            </Button>
          </div>
        </div>
      </section>

      <aside className="card h-fit p-4">
        <h2 className="mb-3 font-display text-[15px] font-bold text-ink-900">Ticket controls</h2>
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="OPEN">Open</option>
          <option value="UNDER_REVIEW">Under review</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </Select>
        <div className="mt-4 space-y-1 text-[12.5px] text-ink-400">
          <p><strong className="text-ink-900">Reference:</strong> {ticket.reference}</p>
          <p><strong className="text-ink-900">Customer:</strong> {ticket.customer.name}</p>
          <p><strong className="text-ink-900">Email:</strong> {ticket.customer.email}</p>
          {ticket.customer.phone && <p><strong className="text-ink-900">Phone:</strong> {ticket.customer.phone}</p>}
        </div>
      </aside>
    </div>
  );
}