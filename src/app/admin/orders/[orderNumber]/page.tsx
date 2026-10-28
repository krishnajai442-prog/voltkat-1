import { notFound } from "next/navigation";
import { CreditCard, MapPin, Package, Truck } from "lucide-react";
import prisma from "@/lib/prisma";
import { adminPage } from "@/lib/admin-page";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AdminOrderActions } from "@/components/admin/AdminOrderActions";
import { TrackingTimeline } from "@/components/tracking/TrackingTimeline";
import { formatDateTime, inr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  await adminPage();
  const { orderNumber } = await params;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      items: { include: { product: { select: { id: true, name: true, stock: true } } } },
      payments: { orderBy: { createdAt: "desc" } },
      trackingEvents: { orderBy: { createdAt: "asc" } },
      returnRequests: { include: { orderItem: { select: { name: true } } } },
    },
  });

  if (!order) notFound();

  const addr = order.addressSnapshot as any;

  return (
    <div>
      <AdminPageHeader title={`Order ${order.orderNumber}`} subtitle={formatDateTime(order.createdAt)}>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatusBadge status={order.status} />
          <StatusBadge status={order.paymentStatus} />
        </div>
      </AdminPageHeader>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <section className="card overflow-hidden">
            <header className="flex items-center gap-2 border-b border-hairline px-4 py-3">
              <Package className="size-4 text-electric-600" />
              <h2 className="font-display text-[15px] font-bold text-ink-900">Items</h2>
            </header>
            <ul className="divide-y divide-hairline">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-bold text-ink-900">{item.name}</p>
                    <p className="mt-0.5 text-[12px] text-ink-400">
                      {item.brand} · SKU {item.productId} · Stock now {item.product?.stock ?? "—"}
                    </p>
                  </div>
                  <p className="text-[13px] font-semibold text-ink-700">×{item.quantity}</p>
                  <p className="w-24 text-right font-bold tabular-nums text-ink-900">{inr(item.lineTotal)}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-4">
            <h2 className="mb-4 flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
              <Truck className="size-4 text-electric-600" /> Tracking
            </h2>
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
              eta={order.etaFrom && order.etaTo ? { from: order.etaFrom.toISOString(), to: order.etaTo.toISOString() } : null}
              carrier={order.carrier}
              trackingNumber={order.trackingNumber}
            />
          </section>
        </div>

        <div className="space-y-4">
          <AdminOrderActions
            orderNumber={order.orderNumber}
            status={order.status}
            carrier={order.carrier ?? ""}
            trackingNumber={order.trackingNumber ?? ""}
          />

          <section className="card p-4">
            <h2 className="mb-3 flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
              <MapPin className="size-4 text-electric-600" /> Customer & address
            </h2>
            <p className="text-[14px] font-bold text-ink-900">{order.user?.name ?? addr.fullName ?? "Guest"}</p>
            <p className="mt-0.5 text-[12.5px] text-ink-400">{order.user?.email ?? order.guestEmail ?? "—"}</p>
            <p className="mt-0.5 text-[12.5px] text-ink-400">{order.user?.phone ?? order.guestPhone ?? addr.phone ?? "—"}</p>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-700">
              {addr.line1 ?? "—"}
              {addr.line2 ? `, ${addr.line2}` : ""}
              {addr.city ? `, ${addr.city}` : ""}
              {addr.state ? `, ${addr.state}` : ""}
              {addr.pincode ? ` — ${addr.pincode}` : ""}
            </p>
          </section>

          <section className="card p-4">
            <h2 className="mb-3 flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
              <CreditCard className="size-4 text-electric-600" /> Payment
            </h2>
            <dl className="space-y-2 text-[13px]">
              <Row k="Method" v={order.paymentMethod} />
              <Row k="Status" v={order.paymentStatus} />
              <Row k="Subtotal" v={inr(order.subtotal)} />
              <Row k="Item discount" v={`− ${inr(order.itemDiscount)}`} />
              <Row k="Coupon" v={order.couponCode ? `${order.couponCode} (− ${inr(order.couponDiscount)})` : "—"} />
              <Row k="Delivery" v={order.deliveryFee === 0 ? "FREE" : inr(order.deliveryFee)} />
              <Row k="COD fee" v={order.codFee === 0 ? "—" : inr(order.codFee)} />
              <Row k="Total" v={inr(order.total)} bold />
            </dl>
            {order.payments[0]?.razorpayPaymentId && (
              <p className="mt-3 font-mono text-[11.5px] text-ink-300">
                Ref: {order.payments[0].razorpayPaymentId}
              </p>
            )}
          </section>

          {order.returnRequests.length > 0 && (
            <section className="card p-4">
              <h2 className="mb-3 font-display text-[15px] font-bold text-ink-900">Return requests</h2>
              <ul className="space-y-2 text-[12.5px]">
                {order.returnRequests.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-canvas px-3 py-2">
                    <span className="min-w-0 truncate">{r.orderItem.name}</span>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-400">{k}</dt>
      <dd className={`tabular-nums ${bold ? "font-display text-[15px] font-bold text-ink-900" : "font-semibold text-ink-900"}`}>{v}</dd>
    </div>
  );
}