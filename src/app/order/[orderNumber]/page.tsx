import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, LifeBuoy, RotateCcw, ShieldCheck, Star, Truck } from "lucide-react";
import prisma from "@/lib/prisma";
import { getActor } from "@/lib/auth/guards";
import { TrackingTimeline } from "@/components/tracking/TrackingTimeline";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateTime, inr } from "@/lib/utils";
import { CancelOrderButton } from "@/components/order/CancelOrderButton";
import { ReturnRequestButton } from "@/components/order/ReturnRequestButton";
import { ReviewLinks } from "@/components/order/ReviewLinks";
import { PrintButton } from "@/components/order/PrintButton";
import { verifyGuestTrackToken } from "@/lib/track-token";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order details",
  robots: { index: false, follow: false },
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

const PAYMENT_LABEL: Record<string, string> = {
  UPI: "UPI",
  CARD: "Credit / Debit Card",
  NETBANKING: "Net Banking",
  WALLET: "Wallet",
  COD: "Cash / UPI on Delivery",
};

type AddressSnapshot = {
  fullName?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orderNumber } = await params;
  const sp = await searchParams;
  const actor = await getActor();

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
      items: {
        include: {
          product: {
            select: { slug: true, name: true, returnableDays: true },
          },
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      trackingEvents: {
        orderBy: { createdAt: "asc" },
      },
      returnRequests: {
        select: { orderItemId: true, status: true },
      },
    },
  });

  if (!order) notFound();

  const isOwner = actor?.id === order.userId;
  const isStaff =
    !!actor && ["ADMIN", "MANAGER", "STAFF"].includes(actor.role);
  const guestToken = typeof sp.tok === "string" ? sp.tok : undefined;
  const isGuest = !order.userId && verifyGuestTrackToken(orderNumber, guestToken);

  if (!isOwner && !isStaff && !isGuest) {
    redirect(`/track?order=${encodeURIComponent(orderNumber)}`);
  }

  const simulated = sp.simulated === "1";
  const addr = (order.addressSnapshot ?? {}) as AddressSnapshot;
  const payment = order.payments[0];
  const canCancel =
    (isOwner || isStaff) && ["PENDING", "CONFIRMED"].includes(order.status);

  const activeReturnStatuses = new Set([
    "REQUESTED",
    "APPROVED",
    "PICKED_UP",
  ]);

  const returnedItemIds = new Set(
    order.returnRequests
      .filter((r) => activeReturnStatuses.has(r.status))
      .map((r) => r.orderItemId),
  );

  const daysSinceDelivery = order.deliveredAt
    ? (Date.now() - new Date(order.deliveredAt).getTime()) / 86400000
    : null;

  const eligibleReturnItems =
    order.status === "DELIVERED" && daysSinceDelivery !== null
      ? order.items
          .filter((item) => {
            const window = item.product?.returnableDays ?? 7;
            return daysSinceDelivery <= window && !returnedItemIds.has(item.id);
          })
          .map((item) => ({
            id: item.id,
            name: item.name,
            slug: item.product?.slug ?? item.slug,
          }))
      : [];

  const events = order.trackingEvents.map((e) => ({
    id: e.id,
    status: e.status,
    title: e.title,
    description: e.description,
    location: e.location,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <div className="container-x py-8">
      {simulated && (
        <p className="mb-4 rounded-xl bg-amber-offer/10 px-4 py-3 text-[12.5px] font-semibold text-amber-700">
          Development mode: Razorpay keys are not configured, so this order was
          created as a COD-shaped fallback. Set{" "}
          <code>RAZORPAY_KEY_ID</code> and <code>RAZORPAY_KEY_SECRET</code> to
          enable live payments.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          <section className="card overflow-hidden print:break-inside-avoid">
            <div className="relative bg-ink-900 px-5 py-6 text-white sm:px-7">
              <span className="pointer-events-none absolute -right-10 -top-14 size-56 rounded-full bg-mint-500/20 blur-3xl" />

              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-mint-500">
                    <ShieldCheck className="size-4" />
                    {order.status === "DELIVERED"
                      ? "Delivered"
                      : order.status === "CANCELLED"
                        ? "Cancelled"
                        : "Order confirmed"}
                  </p>

                  <h1 className="mt-2 font-display text-2xl font-bold">
                    Order {order.orderNumber}
                  </h1>

                  <p className="mt-1.5 text-[13.5px] text-white/60">
                    Placed {formatDateTime(order.createdAt)} · Invoice{" "}
                    {order.orderNumber}/INV
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge
                      tone={STATUS_TONE[order.status] ?? "neutral"}
                      className="bg-white/12 text-white ring-white/20"
                    >
                      {order.status.replace(/_/g, " ")}
                    </Badge>

                    <Badge
                      tone="neutral"
                      className="bg-white/12 text-white/80 ring-white/20"
                    >
                      {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}{" "}
                      · {order.paymentStatus}
                    </Badge>

                    {order.couponCode && (
                      <Badge
                        tone="save"
                        className="bg-white/12 text-mint-500 ring-white/20"
                      >
                        {order.couponCode} saved {inr(order.couponDiscount)}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 print:hidden">
                  <PrintButton />
                  {canCancel && (
                    <CancelOrderButton
                      orderNumber={order.orderNumber}
                      status={order.status}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <div>
                <h2 className="mb-2 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-ink-300">
                  <Truck className="size-3.5" /> Delivery address
                </h2>

                <p className="text-[14px] font-semibold text-ink-900">
                  {addr.fullName ?? order.user?.name ?? "Customer"}
                </p>

                <p className="mt-1 text-[13px] leading-relaxed text-ink-400">
                  {addr.line1 ?? "Address will be confirmed"}
                  {addr.line2 ? `, ${addr.line2}` : ""}
                  {addr.city ? `, ${addr.city}` : ""}
                  {addr.state ? `, ${addr.state}` : ""}
                  {addr.pincode ? ` — ${addr.pincode}` : ""}
                </p>

                {addr.phone && (
                  <p className="mt-1 text-[13px] font-semibold text-ink-700">
                    ☎ {addr.phone}
                  </p>
                )}
              </div>

              <div>
                <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wider text-ink-300">
                  Payment
                </h2>

                <p className="text-[14px] font-semibold text-ink-900">
                  {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
                </p>

                <p className="mt-1 text-[13px] text-ink-400">
                  Status:{" "}
                  <span
                    className={
                      order.paymentStatus === "PAID"
                        ? "font-bold text-emerald-600"
                        : order.paymentStatus === "FAILED"
                          ? "font-bold text-flame-600"
                          : "font-bold text-amber-600"
                    }
                  >
                    {order.paymentStatus}
                  </span>
                </p>

                {payment?.razorpayPaymentId && (
                  <p className="mt-1 font-mono text-[11.5px] text-ink-300">
                    Ref: {payment.razorpayPaymentId}
                  </p>
                )}

                {order.paymentMethod === "COD" && (
                  <p className="mt-2 text-[12.5px] text-ink-400">
                    Keep exact change or UPI ready at delivery.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-4 font-display text-[15px] font-bold text-ink-900">
              Live tracking
            </h2>

            <TrackingTimeline
              status={order.status}
              events={events}
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
          </section>

          <section className="card overflow-hidden">
            <header className="border-b border-hairline px-5 py-3.5">
              <h2 className="font-display text-[15px] font-bold text-ink-900">
                Items in this order
              </h2>
            </header>

            <ul className="divide-y divide-hairline">
              {order.items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/product/${item.product?.slug ?? item.slug}`}
                    className="group flex gap-3.5 p-4 transition-colors hover:bg-gray-50/60 active:bg-gray-100"
                  >
                    <span className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-canvas">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.name}
                          className="size-full object-contain p-1"
                        />
                      ) : (
                        <span className="grid size-full place-items-center text-[11px] text-ink-300">
                          No image
                        </span>
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-300">
                        {item.brand}
                      </p>

                      <p className="mt-0.5 line-clamp-2 text-[14px] font-semibold text-ink-900">
                        {item.name}
                      </p>

                      <p className="mt-1 text-[12.5px] text-ink-400">
                        Qty {item.quantity} · {item.warrantyMonths}-month warranty
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="font-display text-[15px] font-bold tabular-nums text-ink-900">
                        {inr(item.lineTotal)}
                      </p>

                      {item.unitMrp > item.unitPrice && (
                        <p className="mt-0.5 text-[12px] text-ink-300 line-through tabular-nums">
                          {inr(item.unitMrp * item.quantity)}
                        </p>
                      )}
                    </div>

                    <ChevronRight className="size-4 shrink-0 self-center text-ink-300 transition-colors group-hover:text-ink-500" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5 print:hidden">
            <h2 className="mb-3 font-display text-[15px] font-bold text-ink-900">
              Need something else?
            </h2>

            <div className="flex flex-wrap gap-2">
              {eligibleReturnItems.length > 0 && (
                <ReturnRequestButton items={eligibleReturnItems} />
              )}

              {order.status === "DELIVERED" && (
                <ReviewLinks
                  items={order.items.map((i) => ({
                    slug: i.product?.slug ?? i.slug,
                    name: i.name,
                  }))}
                />
              )}

              <Button
                href="/contact"
                variant="outline"
                size="sm"
                className="inline-flex"
              >
                <LifeBuoy className="size-3.5" /> Contact support
              </Button>

              <Button
                href="/track"
                variant="outline"
                size="sm"
                className="inline-flex"
              >
                <RotateCcw className="size-3.5" /> Track another order
              </Button>
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-[92px] lg:h-fit">
          <div className="card overflow-hidden">
            <header className="border-b border-hairline px-4 py-3.5">
              <h2 className="font-display text-[13px] font-bold uppercase tracking-wider text-ink-400">
                Invoice summary
              </h2>
            </header>

            <div className="space-y-2.5 p-4 text-[13px]">
              <Row label="Total MRP" value={inr(order.subtotalMrp)} />

              <Row
                label="Item discount"
                value={`− ${inr(order.itemDiscount)}`}
                tone="good"
              />

              {order.couponDiscount > 0 && (
                <Row
                  label={`Coupon (${order.couponCode ?? ""})`}
                  value={`− ${inr(order.couponDiscount)}`}
                  tone="good"
                />
              )}

              <Row
                label="Delivery"
                value={order.deliveryFee === 0 ? "FREE" : inr(order.deliveryFee)}
                tone={order.deliveryFee === 0 ? "good" : undefined}
              />

              {order.codFee > 0 && (
                <Row label="COD handling" value={inr(order.codFee)} />
              )}

              <div className="my-1 border-t border-dashed border-hairline" />

              <div className="flex items-baseline justify-between">
                <span className="font-display text-[15px] font-bold text-ink-900">
                  Total payable
                </span>

                <span className="font-display text-xl font-bold tabular-nums text-ink-900">
                  {inr(order.total)}
                </span>
              </div>

              <p className="text-[11px] text-ink-400">
                Includes {inr(order.gstComponent)} GST.
              </p>
            </div>
          </div>

          <div className="card mt-4 p-4">
            <h3 className="flex items-center gap-2 font-display text-[13px] font-bold text-ink-900">
              <Star className="size-4 text-amber-offer" /> After delivery
            </h3>

            <ul className="mt-2 space-y-1.5 text-[12.5px] text-ink-400">
              <li>• Rate your product to help future buyers.</li>
              <li>• Raise a return only for damaged/wrong/non-working units.</li>
              <li>• Keep packaging and invoice for faster support.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-ink-400">{label}</span>
      <span
        className={
          tone === "good"
            ? "font-semibold tabular-nums text-emerald-600"
            : "font-semibold tabular-nums text-ink-900"
        }
      >
        {value}
      </span>
    </div>
  );
}