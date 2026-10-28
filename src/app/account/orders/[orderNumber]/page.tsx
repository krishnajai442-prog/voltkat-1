import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { getActor } from "@/lib/auth/guards";
import { DeliveryTimeline } from "@/components/tracking/DeliveryTimeline";
import { CopyButton } from "./CopyButton";
import {
  ArrowLeft,
  Banknote,
  Check,
  ChevronDown,
  CreditCard,
  Info,
  Landmark,
  QrCode,
  ShieldCheck,
  Star,
  Wallet,
} from "lucide-react";

type AddressSnap = { name?: string; line1?: string; line2?: string; city?: string; state?: string; pincode?: string; phone?: string };

const compact = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const fmtDate = (d: Date | string | null | undefined): string =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const methodLabel = (m: string | null) =>
  m === "COD" ? "Cash On Delivery" : m === "CARD" ? "Card" : m === "UPI" ? "UPI" : m === "NETBANKING" ? "Net Banking" : m === "WALLET" ? "Wallet" : m ?? "—";

/** Small payment-method glyph for the "Paid By" row, like the reference. */
function MethodIcon({ m }: { m: string | null }) {
  const C =
    m === "COD" ? Banknote :
    m === "CARD" ? CreditCard :
    m === "UPI" ? QrCode :
    m === "NETBANKING" ? Landmark :
    Wallet;
  return <C className="size-3.5 text-gray-500" aria-hidden />;
}

/** Flipkart-style collapsible row: bold title + gray subtitle, square chevron button right. */
function InfoRow({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl border border-gray-100 bg-white">
      <summary className="flex cursor-pointer select-none items-center gap-3 p-4">
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold text-gray-900">{title}</span>
          <span className="mt-0.5 block truncate text-[12.5px] text-gray-500">{subtitle}</span>
        </span>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gray-100 text-gray-600">
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="space-y-1.5 border-t border-gray-100 p-4 text-[13px] text-gray-700">{children}</div>
    </details>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "mint" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <span className={tone === "mint" ? "font-semibold text-emerald-600" : "font-medium text-gray-900"}>{value}</span>
    </div>
  );
}

export default async function TrackOrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const decodedNum = decodeURIComponent(orderNumber);

  const me = await getActor();
  if (!me?.email) notFound();

  // items select no longer pulls the product relation: the recommendation grid used to
  // scope by category, but it is now a whole-catalog random draw, so categoryId is dead.
  const order = await prisma.order.findFirst({
    where: { orderNumber: decodedNum, OR: [{ userId: me.id }, { guestEmail: me.email }] },
    include: {
      items: {
        select: {
          name: true, quantity: true, unitPrice: true, image: true, brand: true, productId: true, slug: true,
        },
      },
    },
  });
  if (!order) notFound();

  const cancelled = order.status === "CANCELLED";
  const delivered = order.status === "DELIVERED";
  const inTransit = ["CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY"].includes(order.status);

  const statusSummary = delivered
    ? { tone: "green" as const, label: `Delivered, ${fmtDate(order.deliveredAt)}` }
    : cancelled
      ? { tone: "red" as const, label: `Cancelled${order.cancelledAt ? `, ${fmtDate(order.cancelledAt)}` : ""}` }
      : inTransit
        ? { tone: "blue" as const, label: `In Transit · ${order.status.toLowerCase().replace(/_/g, " ")}` }
        : { tone: "gray" as const, label: "Pending" };

  const RETURN_WINDOW_DAYS = 7;
  const returnWindowEnd = order.deliveredAt
    ? new Date(new Date(order.deliveredAt).getTime() + RETURN_WINDOW_DAYS * 864e5)
    : null;
  const returnWindowEnded = returnWindowEnd ? returnWindowEnd.getTime() < Date.now() : false;

  // addressSnapshot is read defensively (not in the confirmed scalar set); the money and
  // payment fields below ARE typed Order columns, so they're read directly (no casts).
  const addr = (order as unknown as { addressSnapshot?: AddressSnap | null }).addressSnapshot ?? null;
  const addrLine = addr ? [addr.line1, addr.line2, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ") : null;
  const paymentMethod = order.paymentMethod;
  const paymentStatus = order.paymentStatus;
  const subtotalMrp = order.subtotalMrp;
  const subtotal = order.subtotal;
  const deliveryFee = order.deliveryFee;
  const codFee = order.codFee;
  const couponDiscount = order.couponDiscount;
  const gstComponent = order.gstComponent;
  const total = order.total;

  // "Products For You": a per-request RANDOM draw over the ENTIRE active+in-stock catalog
  // (no category gate, no deterministic orderBy, no fixed window), excluding this order's
  // own items. This is the dynamic guarantee: a product you publish later is eligible on
  // the next load with no rebuild. (Scale: id-only scan of the active set, same pattern as
  // the account sponsored pool; switch to a random-skip/TABLESAMPLE pick if it ever grows
  // very large.)
  const excludeSet = new Set(order.items.map((i) => i.productId));
  const candIds = await prisma.product.findMany({
    where: { active: true, stock: { gt: 0 } },
    select: { id: true },
  });
  const pool = candIds.filter((c) => !excludeSet.has(c.id));
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = a;
  }
  const pickedIds = shuffled.slice(0, 12).map((r) => r.id);
  const forYouRows = pickedIds.length
    ? await prisma.product.findMany({
        where: { id: { in: pickedIds } },
        select: {
          id: true, slug: true, name: true, mrp: true, salePrice: true, ratingAvg: true, ratingCount: true,
          brand: { select: { name: true } },
          images: { select: { url: true, isPrimary: true }, orderBy: { position: "asc" as const } },
        },
      })
    : [];
  const byId = new Map(forYouRows.map((r) => [r.id, r] as const));
  const forYou = pickedIds
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  return (
    <article className="container-x mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <Link
            href="/account/orders"
            aria-label="Back to orders"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-gray-700 hover:bg-gray-100"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="truncate font-display text-[20px] font-bold">Order Details</h1>
        </div>
        <Link
          href="/account/support"
          className="shrink-0 rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-[13px] font-bold text-gray-800 hover:bg-gray-50"
        >
          Help
        </Link>
      </header>

      <section className="space-y-2 rounded-xl border border-gray-100 bg-white p-4">
        {order.items.map((item) => (
          <Link
            key={item.productId}
            href={`/product/${item.slug}`}
            className="-mx-2 flex items-start gap-3 rounded-xl p-2 transition-colors hover:bg-gray-50 active:bg-gray-100"
          >
            <span className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-gray-50">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt={item.name} className="size-full object-contain p-1" />
              ) : (
                <span className="grid size-full place-items-center bg-gray-100 text-[11px] font-bold text-gray-400">
                  {item.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold leading-snug text-gray-900">{item.name}</span>
              <span className="mt-1 block text-[12.5px] text-gray-500">
                {item.brand} · Qty: {item.quantity}
              </span>
              <span className="mt-1 block text-[14px] font-bold text-gray-900">
                {inr(Number(item.unitPrice) * item.quantity)}
              </span>
            </span>
            <ChevronDown className="mt-7 size-4 shrink-0 -rotate-90 text-gray-400" />
          </Link>
        ))}
      </section>

      <section className="px-1">
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-medium text-gray-500">Order #{decodedNum}</span>
          <CopyButton value={decodedNum} />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        {/* Collapsed by default (chevron-down), matching the reference; tap to reveal the timeline. */}
        <details className="group">
          <summary className="flex cursor-pointer select-none items-center gap-3 p-4">
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-full text-white ${
                statusSummary.tone === "green" ? "bg-emerald-500"
                : statusSummary.tone === "red" ? "bg-rose-500"
                : statusSummary.tone === "blue" ? "bg-[#2874f0]" : "bg-gray-400"
              }`}
            >
              <Check className="size-4" strokeWidth={3} />
            </span>
            <p
              className={`flex-1 text-[15px] font-bold ${
                statusSummary.tone === "green" ? "text-emerald-700"
                : statusSummary.tone === "red" ? "text-rose-700"
                : statusSummary.tone === "blue" ? "text-[#2874f0]" : "text-gray-700"
              }`}
            >
              {statusSummary.label}
            </p>
            <ChevronDown className="size-4 text-gray-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-gray-100 p-4">
            <DeliveryTimeline
              order={{
                status: order.status,
                createdAt: order.createdAt,
                confirmedAt: order.confirmedAt,
                processedAt: (order as any).processedAt ?? null,
                shippedAt: order.shippedAt,
                outForDeliveryAt: (order as any).outForDeliveryAt ?? null,
                deliveredAt: order.deliveredAt,
                cancelledAt: order.cancelledAt,
              }}
            />
          </div>
        </details>
      </section>

      {delivered && returnWindowEnd && (
        <section className="space-y-2">
          <h2 className="text-[15px] font-bold text-gray-900">VoltKart&apos;s promise</h2>
          <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-[#2874f0]">
              <ShieldCheck className="size-5" />
            </span>
            <p className="text-[13.5px] font-bold text-gray-900">
              Return window {returnWindowEnded ? "ended" : "ends"} on {fmtDate(returnWindowEnd)}
            </p>
          </div>
        </section>
      )}

      {/* Our OWN promo banner in the reference's banner slot — same visual language (dark
          navy, corner mark, headline, orange action chip, big typographic offer), but it
          advertises VoltKart's /offers page, not a financial product we don't sell and not
          Flipkart's trademarked Pay-Later creative. Static marketing, no data needed. */}
      <Link
        href="/offers"
        className="group relative block overflow-hidden rounded-xl bg-gradient-to-br from-[#0a1a3f] via-[#102a5c] to-[#15306e] p-4 text-white shadow-sm sm:p-5"
      >
        <span className="absolute left-3 top-3 grid size-7 place-items-center rounded-md bg-yellow-400 text-[13px] font-black text-[#0a1a3f]">
          V
        </span>
        <span className="absolute right-3 top-3 text-[10px] font-bold uppercase tracking-widest text-blue-200">
          VoltKart Offers
        </span>
        <div className="mt-7 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] font-black leading-tight sm:text-[17px]">Extra savings on every order</p>
            <span className="mt-2 inline-block rounded bg-orange-500 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-white transition-transform group-hover:scale-105">
              View offers ›
            </span>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-[26px] font-black leading-none text-yellow-300 sm:text-[34px]">UP TO</p>
            <p className="font-display text-[32px] font-black leading-none text-yellow-300 sm:text-[44px]">50% OFF</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-blue-200">Festival deals live</p>
          </div>
        </div>
      </Link>

      <InfoRow
        title="Delivery details"
        subtitle={`Delivered to ${addr?.name ?? "you"}${addr?.city ? ` in ${addr.city}` : ""}`}
      >
        <p className="font-semibold">{addr?.name ?? "Recipient"}</p>
        <p className="text-gray-600">{addrLine ?? "Address on file"}</p>
        {addr?.phone && <p className="text-gray-500">{addr.phone}</p>}
      </InfoRow>

      <InfoRow
        title="Price details"
        subtitle={`Paid ${inr(total)} by ${methodLabel(paymentMethod)}`}
      >
        <Row label="Listing price" value={inr(subtotalMrp)} />
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-gray-600">
            Special price
            <span title="Price after applicable item discounts" className="inline-flex">
              <Info className="size-3 text-gray-400" aria-hidden />
            </span>
          </span>
          <span className="font-medium text-gray-900">{inr(subtotal)}</span>
        </div>
        {couponDiscount > 0 && <Row label="Coupon discount" value={`-${inr(couponDiscount)}`} tone="mint" />}
        {deliveryFee > 0 && <Row label="Delivery fee" value={inr(deliveryFee)} />}
        {codFee > 0 && <Row label="COD fee" value={inr(codFee)} />}
        {gstComponent > 0 && <Row label="GST" value={inr(gstComponent)} />}
        <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
          <span className="font-bold text-gray-900">Total amount</span>
          <span className="font-bold text-gray-900">{inr(total)}</span>
        </div>
                <div className="mt-1 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
          <span className="text-gray-600">Paid By</span>
          <span className="flex items-center gap-1.5 font-medium text-gray-900">
            <MethodIcon m={paymentMethod} /> {methodLabel(paymentMethod)}
          </span>
        </div>
        <a
          href={`/api/orders/${encodeURIComponent(decodedNum)}/invoice`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] font-bold text-gray-800 transition-colors hover:bg-gray-50"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
          </svg>
          Download Invoice
        </a>
        <p className="pt-1 text-[12px] text-gray-500">
          
          {paymentStatus === "PAID" ? "Payment successful" : "Awaiting payment"} · {methodLabel(paymentMethod)}
        </p>
      </InfoRow>

      {cancelled && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          This order was cancelled
          {order.cancelledAt ? ` on ${new Date(order.cancelledAt).toLocaleString("en-IN")}` : ""}.
          {order.cancelReason ? ` Reason: ${order.cancelReason}` : ""}
        </section>
      )}

      {forYou.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[15px] font-bold text-gray-900">Products For You</h2>
          <div className="grid grid-cols-2 gap-3">
            {forYou.map((p) => {
              const img = p.images.find((i) => i.isPrimary)?.url ?? p.images[0]?.url ?? null;
              const d = p.mrp > p.salePrice ? Math.round(((p.mrp - p.salePrice) / p.mrp) * 100) : 0;
              return (
                <Link key={p.id} href={`/product/${p.slug}`} className="block rounded-xl border border-gray-100 bg-white p-2">
                  <span className="relative block aspect-square overflow-hidden rounded-lg bg-gray-50">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={p.name} className="size-full object-contain p-2" />
                    ) : (
                      <span className="grid size-full place-items-center bg-gray-100 text-[11px] font-bold text-gray-400">
                        {p.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    {(p.ratingAvg > 0 || p.ratingCount > 0) && (
                      <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded bg-white/95 px-1.5 py-0.5 text-[11px] font-bold text-gray-800 shadow-sm">
                        {Number(p.ratingAvg).toFixed(1)} <Star className="size-2.5 fill-emerald-600 text-emerald-600" />
                        <span className="font-semibold text-gray-500">{compact(p.ratingCount)}+</span>
                      </span>
                    )}
                  </span>
                  <p className="mt-1 line-clamp-2 text-[12.5px] font-semibold leading-snug text-gray-900">
                    {p.brand?.name} {p.name}
                  </p>
                  <p className="mt-1 flex flex-wrap items-baseline gap-1.5">
                    {d > 0 && <span className="text-[11.5px] font-bold text-emerald-600">↓{d}%</span>}
                    {d > 0 && <span className="text-[11px] text-gray-400 line-through">{inr(p.mrp)}</span>}
                    <span className="text-[13px] font-bold text-gray-900">{inr(p.salePrice)}</span>
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </article>
  );
}