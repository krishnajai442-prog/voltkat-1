import type { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { getActor } from "@/lib/auth/guards";
import { TrackingTimeline } from "@/components/tracking/TrackingTimeline";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatDateTime, inr, normalizeMobile } from "@/lib/utils";
import { createGuestTrackToken } from "@/lib/track-token";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Track order",
  description: "Track your VoltKart order using order number and email/mobile.",
};

const STATUS_TONE: Record<
  string,
  "info" | "save" | "warn" | "deal" | "neutral" | "violet"
> = {
  PENDING: "warn",
  CONFIRMED: "info",
  PROCESSING: "info",
  SHIPPED: "violet",
  OUT_FOR_DELIVERY: "warn",
  DELIVERED: "save",
  CANCELLED: "deal",
};

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const actor = await getActor();

  const orderNumber =
    typeof sp.order === "string" ? sp.order.trim().toUpperCase() : "";
  const identifier =
    typeof sp.id === "string"
      ? sp.id.trim().toLowerCase()
      : typeof sp.email === "string"
        ? sp.email.trim().toLowerCase()
        : typeof sp.phone === "string"
          ? sp.phone.trim()
          : "";

  let order = null;
  let error: string | null = null;

  if (orderNumber) {
    order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        user: { select: { id: true, email: true, phone: true } },
        items: { select: { name: true, quantity: true }, take: 3 },
        trackingEvents: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!order) {
      error = "Order not found. Check the order number.";
    } else {
      const isOwner = actor?.id === order.userId;
      const isStaff =
        !!actor && ["ADMIN", "MANAGER", "STAFF"].includes(actor.role);

      const normalizedIdentifier = normalizeMobile(identifier) ?? identifier;

      const matches =
        order.user?.email?.toLowerCase() === normalizedIdentifier ||
        order.guestEmail?.toLowerCase() === normalizedIdentifier ||
        order.user?.phone === normalizedIdentifier ||
        order.guestPhone === normalizedIdentifier;

      if (!isOwner && !isStaff && !matches) {
        error =
          "For privacy, enter the email or mobile number used while placing the order.";
        order = null;
      }
    }
  }

  return (
    <div className="container-x py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-electric-600">
            Order tracking
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-ink-900">
            Track your VoltKart order
          </h1>
          <p className="mt-2 text-[13.5px] text-ink-400">
            Enter your order number and the email or mobile used at checkout.
          </p>
        </header>

        <form method="get" action="/track" className="card grid gap-3 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Input
            label="Order number"
            name="order"
            defaultValue={orderNumber}
            placeholder="VKXXXXXXXX"
            required
          />

          <Input
            label="Email or mobile"
            name="id"
            defaultValue={identifier}
            placeholder="you@email.com or 9876543210"
            required
          />

          <Button type="submit" size="lg" className="h-12">
            Track
          </Button>
        </form>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-flame-500/10 px-4 py-3 text-[13px] font-semibold text-flame-600">
            {error}
          </p>
        )}

        {order && (
          <section className="card mt-6 overflow-hidden">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-canvas/60 px-5 py-4">
              <div>
                <p className="font-display text-lg font-bold text-ink-900">
                  {order.orderNumber}
                </p>
                <p className="mt-0.5 text-[12.5px] text-ink-400">
                  Placed {formatDateTime(order.createdAt)} · {inr(order.total)}
                </p>
              </div>

              <Badge tone={STATUS_TONE[order.status] ?? "neutral"}>
                {order.status.replace(/_/g, " ")}
              </Badge>
            </header>

            <div className="p-5">
              <TrackingTimeline
                status={order.status}
                events={order.trackingEvents.map((e) => ({
                  id: e.id,
                  status: e.status,
                  title: e.title,
                  description: e.description,
                  location: e.location,
                  createdAt: e.createdAt.toISOString(),
                }))}
                eta={
                  order.etaFrom && order.etaTo
                    ? {
                        from: order.etaFrom.toISOString(),
                        to: order.etaTo.toISOString(),
                      }
                    : null
                }
                carrier={order.carrier}
                trackingNumber={order.trackingNumber}
              />
            </div>

            <div className="border-t border-hairline p-5">
              <h2 className="mb-3 font-display text-[15px] font-bold text-ink-900">
                Items
              </h2>

              <ul className="space-y-2 text-[13px] text-ink-700">
                {order.items.map((item, idx) => (
                  <li key={idx} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate">{item.name}</span>
                    <span className="shrink-0 font-bold tabular-nums">
                      Qty {item.quantity}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
  href={`/order/${order.orderNumber}?tok=${createGuestTrackToken(order.orderNumber)}`}
  size="sm"
>
  View full invoice
</Button>

                <Button href="/contact" variant="outline" size="sm">
                  Need help?
                </Button>
              </div>
            </div>
          </section>
        )}

        <p className="mt-6 text-center text-[12.5px] text-ink-400">
          Registered customer?{" "}
          <Link href="/account/orders" className="font-bold text-electric-600 hover:underline">
            View all orders
          </Link>
        </p>
      </div>
    </div>
  );
}