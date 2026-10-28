"use client";

import { Eye, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatDate, inr, relativeTime } from "@/lib/utils";

type Row = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  active: boolean;
  whatsappOptIn: boolean;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  lastOrderNumber: string | null;
};

type Detail = {
  user: Row & { role: string };
  orders: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    total: number;
    itemCount: number;
    createdAt: string;
  }[];
  reviews: { id: string; rating: number; body: string; createdAt: string }[];
  tickets: { id: string; reference: string; subject: string; status: string; createdAt: string }[];
  feedback: { id: string; overall: number | null; comment: string; createdAt: string }[];
};

export function CustomersTable({ initial }: { initial: Row[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function view(id: string) {
    setOpenId(id);
    setBusy(true);
    setDetail(null);
    setError(null);

    try {
      const res = await fetch(`/api/admin/customers/${id}`, { cache: "no-store" });
      const json = (await res.json()) as { ok: boolean; detail?: Detail; error?: string };
      if (!json.ok || !json.detail) throw new Error(json.error ?? "Failed to load customer.");
      setDetail(json.detail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load customer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[58rem] text-[13px]">
            <thead className="bg-canvas text-left text-[11px] font-bold uppercase tracking-wider text-ink-300">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Spent</th>
                <th className="px-4 py-3">Last order</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-hairline">
              {initial.map((c) => (
                <tr key={c.id} className="hover:bg-canvas/50">
                  <td className="px-4 py-3">
                    <p className="font-bold text-ink-900">{c.name}</p>
                    <p className="mt-0.5 text-[11.5px] text-ink-400">Joined {formatDate(c.createdAt)}</p>
                  </td>

                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900">{c.email}</p>
                    <p className="mt-0.5 text-[11.5px] text-ink-400">{c.phone ?? "—"}</p>
                  </td>

                  <td className="px-4 py-3 tabular-nums">{c.orderCount}</td>

                  <td className="px-4 py-3 font-bold tabular-nums text-ink-900">{inr(c.totalSpent)}</td>

                  <td className="px-4 py-3">
                    {c.lastOrderNumber ? (
                      <>
                        <Link href={`/admin/orders/${c.lastOrderNumber}`} className="font-bold text-electric-600 hover:underline">
                          {c.lastOrderNumber}
                        </Link>
                        <p className="mt-0.5 text-[11.5px] text-ink-400">{relativeTime(c.lastOrderAt)}</p>
                      </>
                    ) : (
                      <span className="text-ink-300">No orders</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void view(c.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-[12px] font-bold text-ink-700 hover:border-electric-300"
                    >
                      <Eye className="size-3.5" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Drawer open={Boolean(openId)} onClose={() => setOpenId(null)} title="Customer detail" side="right">
        {busy && (
          <div className="flex items-center gap-2 text-[13px] text-ink-400">
            <Loader2 className="size-4 animate-spin" />
            Loading customer…
          </div>
        )}

        {error && <p className="text-[13px] font-semibold text-flame-600">{error}</p>}

        {detail && (
          <div className="space-y-5">
            <section>
              <h3 className="font-display text-[15px] font-bold text-ink-900">{detail.user.name}</h3>
              <p className="mt-1 text-[12.5px] text-ink-400">{detail.user.email}</p>
              <p className="mt-0.5 text-[12.5px] text-ink-400">{detail.user.phone ?? "No phone"}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone={detail.user.active ? "save" : "neutral"}>
                  {detail.user.active ? "Active" : "Inactive"}
                </Badge>
                <Badge tone="info">{detail.user.role}</Badge>
                {detail.user.whatsappOptIn && <Badge tone="violet">WhatsApp opt-in</Badge>}
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-2 text-[12.5px]">
                <Stat k="Orders" v={String(detail.user.orderCount)} />
                <Stat k="Spent" v={inr(detail.user.totalSpent)} />
                <Stat k="Joined" v={formatDate(detail.user.createdAt)} />
                <Stat k="Last order" v={detail.user.lastOrderAt ? relativeTime(detail.user.lastOrderAt) : "—"} />
              </dl>
            </section>

            <Section title="Recent orders">
              {detail.orders.length === 0 ? (
                <Empty text="No orders yet." />
              ) : (
                <ul className="space-y-2">
                  {detail.orders.map((o) => (
                    <li key={o.id} className="rounded-xl border border-hairline p-3">
                      <div className="flex items-center justify-between gap-3">
                        <Link href={`/admin/orders/${o.orderNumber}`} className="font-bold text-ink-900 hover:text-electric-600">
                          {o.orderNumber}
                        </Link>
                        <span className="font-bold tabular-nums text-ink-900">{inr(o.total)}</span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={o.status} />
                        <StatusBadge status={o.paymentStatus} />
                        <span className="text-[11.5px] text-ink-400">{o.itemCount} item(s)</span>
                      </div>

                      <p className="mt-1 text-[11.5px] text-ink-300">{relativeTime(o.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Reviews">
              {detail.reviews.length === 0 ? (
                <Empty text="No reviews yet." />
              ) : (
                <ul className="space-y-2">
                  {detail.reviews.map((r) => (
                    <li key={r.id} className="rounded-xl border border-hairline p-3">
                      <p className="text-[12.5px] font-bold text-ink-900">{r.rating}★</p>
                      <p className="mt-1 line-clamp-3 text-[12.5px] text-ink-700">{r.body}</p>
                      <p className="mt-1 text-[11px] text-ink-300">{relativeTime(r.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Support tickets">
              {detail.tickets.length === 0 ? (
                <Empty text="No tickets yet." />
              ) : (
                <ul className="space-y-2">
                  {detail.tickets.map((t) => (
                    <li key={t.id} className="rounded-xl border border-hairline p-3">
                      <div className="flex items-center justify-between gap-3">
                        <Link href={`/admin/support/${t.id}`} className="font-bold text-ink-900 hover:text-electric-600">
                          {t.reference}
                        </Link>
                        <StatusBadge status={t.status} />
                      </div>
                      <p className="mt-1 truncate text-[12.5px] text-ink-700">{t.subject}</p>
                      <p className="mt-1 text-[11px] text-ink-300">{relativeTime(t.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Feedback">
              {detail.feedback.length === 0 ? (
                <Empty text="No feedback yet." />
              ) : (
                <ul className="space-y-2">
                  {detail.feedback.map((f) => (
                    <li key={f.id} className="rounded-xl border border-hairline p-3">
                      <p className="text-[12.5px] font-bold text-ink-900">
                        {f.overall ? `${f.overall}/5 overall` : "Feedback"}
                      </p>
                      <p className="mt-1 line-clamp-3 text-[12.5px] text-ink-700">{f.comment || "No comment"}</p>
                      <p className="mt-1 text-[11px] text-ink-300">{relativeTime(f.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        )}
      </Drawer>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-300">{title}</h4>
      {children}
    </section>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-canvas p-2.5">
      <dt className="text-[10.5px] font-bold uppercase tracking-wider text-ink-300">{k}</dt>
      <dd className="mt-1 text-[13px] font-bold tabular-nums text-ink-900">{v}</dd>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl bg-canvas p-3 text-[12.5px] text-ink-400">{text}</p>;
}