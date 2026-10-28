import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import prisma from "@/lib/prisma";
import { getActor } from "@/lib/auth/guards";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { MarkNotificationsRead } from "@/components/account/MarkNotificationsRead";
import { formatDateTime, relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountNotificationsPage() {
  const actor = await getActor();
  if (!actor) redirect("/auth/login?next=/account/notifications");

  const notifications = await prisma.notification.findMany({
    where: { userId: actor.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-ink-900">Notifications</h1>
          <p className="mt-1 text-[13px] text-ink-400">
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </p>
        </div>

        <MarkNotificationsRead count={unread} />
      </header>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="size-6" />}
          title="No notifications yet"
          body="Order updates, return updates and support replies will appear here."
        />
      ) : (
        <ul className="card divide-y divide-hairline">
          {notifications.map((n) => (
            <li key={n.id} className={`p-4 ${n.read ? "bg-white" : "bg-electric-50/40"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-[14px] font-bold text-ink-900">{n.title}</p>
                    {!n.read && <Badge tone="info">New</Badge>}
                  </div>

                  <p className="mt-1 text-[13px] leading-relaxed text-ink-400">{n.body}</p>

                  <p className="mt-2 text-[11.5px] text-ink-300">
                    {relativeTime(n.createdAt)} · {formatDateTime(n.createdAt)}
                  </p>
                </div>

                {n.href && (
                  <a
                    href={n.href}
                    className="shrink-0 text-[12.5px] font-bold text-electric-600 hover:underline"
                  >
                    Open
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}