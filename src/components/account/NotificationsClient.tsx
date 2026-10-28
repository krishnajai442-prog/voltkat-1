"use client";

import { Bell, CheckCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { relativeTime } from "@/lib/utils";

export type NotificationVM = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
  channel: string;
};

export function NotificationsClient({ initial }: { initial: NotificationVM[] }) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState(false);

  const unread = items.filter((i) => !i.read).length;

  async function markOne(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await fetch("/api/account/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => undefined);
  }

  async function markAll() {
    setBusy(true);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await fetch("/api/account/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => undefined);
    setBusy(false);
  }

  if (!items.length) {
    return (
      <EmptyState
        icon={<Bell className="size-6" />}
        title="No notifications yet"
        body="Order updates, support replies and offer alerts will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[15px] font-bold text-ink-900">
          Notifications {unread > 0 && <span className="text-electric-600">({unread} unread)</span>}
        </h2>
        {unread > 0 && (
          <Button size="sm" variant="outline" onClick={markAll} loading={busy}>
            {!busy && <CheckCheck className="size-3.5" />} Mark all read
          </Button>
        )}
      </div>

      <ul className="card divide-y divide-hairline">
        {items.map((n) => (
          <li key={n.id} className={`p-4 ${n.read ? "" : "bg-electric-50/40"}`}>
            <div className="flex items-start gap-3">
              <span className={`mt-1 size-2 shrink-0 rounded-full ${n.read ? "bg-ink-300/30" : "bg-electric-500"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13.5px] font-bold text-ink-900">{n.title}</p>
                  <Badge tone="neutral">{n.channel.replace(/_/g, " ")}</Badge>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-400">{n.body}</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-[11.5px] text-ink-300">{relativeTime(n.createdAt)}</span>
                  {n.href && (
                    <Link href={n.href} onClick={() => void markOne(n.id)} className="text-[12px] font-bold text-electric-600 hover:underline">
                      Open
                    </Link>
                  )}
                  {!n.read && (
                    <button onClick={() => void markOne(n.id)} className="text-[12px] font-bold text-ink-400 hover:text-ink-900">
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}