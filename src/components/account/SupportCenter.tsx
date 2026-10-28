"use client";

import { LifeBuoy, Plus, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { formatDateTime, relativeTime } from "@/lib/utils";

type Message = {
  id: string;
  body: string;
  fromStaff: boolean;
  author: string;
  createdAt: string;
};

type Ticket = {
  id: string;
  reference: string;
  subject: string;
  category: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
};

const STATUS_TONE: Record<string, "info" | "save" | "warn" | "deal" | "neutral"> = {
  OPEN: "warn",
  UNDER_REVIEW: "info",
  RESOLVED: "save",
  CLOSED: "neutral",
};

export function SupportCenter({ tickets }: { tickets: Ticket[] }) {
  const router = useRouter();
  const toast = useToast();

  const [openId, setOpenId] = useState<string | null>(tickets[0]?.id ?? null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    category: "GENERAL",
    message: "",
  });

  const [replies, setReplies] = useState<Record<string, string>>({});
  const [replyBusy, setReplyBusy] = useState<string | null>(null);

  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Could not create ticket.");

      toast.push({ title: "Support ticket created" });
      setForm({ subject: "", category: "GENERAL", message: "" });
      router.refresh();
    } catch (err) {
      toast.push({
        tone: "error",
        title: "Ticket failed",
        body: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setCreating(false);
    }
  }

  async function reply(ticketId: string) {
    const body = replies[ticketId]?.trim();
    if (!body) return;

    setReplyBusy(ticketId);

    try {
      const res = await fetch(`/api/support/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });

      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Reply failed.");

      setReplies((prev) => ({ ...prev, [ticketId]: "" }));
      toast.push({ title: "Reply sent" });
      router.refresh();
    } catch (err) {
      toast.push({
        tone: "error",
        title: "Reply failed",
        body: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setReplyBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <section className="card p-5">
        <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
          <Plus className="size-4 text-electric-600" />
          Open a new ticket
        </h2>

        <form onSubmit={createTicket} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input
            containerClassName="sm:col-span-2"
            label="Subject"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            required
            minLength={4}
            maxLength={120}
          />

          <Select
            label="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="ORDER">Order</option>
            <option value="PAYMENT">Payment</option>
            <option value="PRODUCT">Product</option>
            <option value="RETURN">Return</option>
            <option value="ACCOUNT">Account</option>
            <option value="GENERAL">General</option>
          </Select>

          <Textarea
            containerClassName="sm:col-span-2"
            label="Message"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            rows={5}
            required
            minLength={10}
            placeholder="Describe the issue. Include order number if relevant."
          />

          <div className="sm:col-span-2">
            <Button type="submit" loading={creating}>
              {!creating && <LifeBuoy className="size-4" />}
              Create ticket
            </Button>
          </div>
        </form>
      </section>

      <section className="card overflow-hidden">
        <header className="border-b border-hairline px-4 py-3">
          <h2 className="font-display text-[15px] font-bold text-ink-900">Your tickets</h2>
        </header>

        {tickets.length === 0 ? (
          <p className="p-5 text-[13.5px] text-ink-400">No support tickets yet.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {tickets.map((t) => {
              const open = openId === t.id;

              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : t.id)}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-canvas/50"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-ink-900">{t.subject}</p>
                        <Badge tone={STATUS_TONE[t.status] ?? "neutral"}>
                          {t.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[12px] text-ink-400">
                        {t.reference} · {relativeTime(t.updatedAt)}
                      </p>
                    </div>

                    <span className="shrink-0 text-[12px] font-bold text-electric-600">
                      {open ? "Hide" : "Open"}
                    </span>
                  </button>

                  {open && (
                    <div className="border-t border-hairline bg-canvas/30 p-4">
                      <ul className="space-y-3">
                        {t.messages.map((m) => (
                          <li key={m.id} className={`flex ${m.fromStaff ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                                m.fromStaff ? "bg-ink-900 text-white" : "bg-white text-ink-900 ring-1 ring-hairline"
                              }`}
                            >
                              <p>{m.body}</p>
                              <p className={`mt-1 text-[10.5px] ${m.fromStaff ? "text-white/50" : "text-ink-400"}`}>
                                {m.author} · {formatDateTime(m.createdAt)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-4">
                        <Textarea
                          rows={3}
                          placeholder="Write a reply…"
                          value={replies[t.id] ?? ""}
                          onChange={(e) => setReplies((prev) => ({ ...prev, [t.id]: e.target.value }))}
                        />

                        <Button
                          className="mt-2"
                          size="sm"
                          loading={replyBusy === t.id}
                          onClick={() => void reply(t.id)}
                        >
                          {!replyBusy && <Send className="size-3.5" />}
                          Send reply
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}