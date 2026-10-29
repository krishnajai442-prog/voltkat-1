import { notFound } from "next/navigation";
import { CheckCircle2, ChevronRight, Headset, ShieldAlert, ShoppingBag } from "lucide-react";
import prisma from "@/lib/prisma";
import { inr } from "@/lib/utils";
import { GuardedImg, RecommendationsRail } from "@/components/order/thanks-client";
import { ThanksFooter } from "@/components/order/ThanksFooter";

export const dynamic = "force-dynamic";

const METHOD: Record<string, string> = { UPI: "UPI", CARD: "Card", NETBANKING: "Net Banking", WALLET: "Wallet", COD: "Cash on Delivery" };

type AddressSnap = {
  name?: string; phone?: string; line1?: string; line2?: string;
  city?: string; state?: string; pincode?: string;
};

function etaLabel(from: Date | null, to: Date | null): string | null {
  const d = to ?? from;
  if (!d) return null;
  const dt = new Date(d);
  return `${dt.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })} ’${String(dt.getFullYear()).slice(2)}`;
}

export default async function OrderResponsePage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order) notFound();

  const [items, cats] = await Promise.all([
    prisma.orderItem.findMany({ where: { orderId: order.id }, orderBy: { id: "asc" } }),
        prisma.category.findMany({
      where: { active: true },
      select: {
        slug: true,
        name: true,
        products: {
          where: { active: true },
          take: 1,
          select: { images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } },
        },
      },
      take: 8,
      orderBy: { name: "asc" },
    }),
  ]);

  const eta = etaLabel(order.etaFrom, order.etaTo);
  const speed = order.deliveryMode === "EXPRESS" ? "Express delivery" : "Standard delivery";
  const method = METHOD[order.paymentMethod] ?? order.paymentMethod;
  const seedId = items[0]?.productId;
  const addr = (order.addressSnapshot as AddressSnap) ?? {};

  return (
    <main className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-4">
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* ── MAIN COLUMN ── */}
        <div className="min-w-0">
          <div className="card flex items-start justify-between gap-4 p-5">
            <div className="min-w-0">
              <h1 className="font-display text-[20px] font-extrabold text-ink-900 sm:text-[24px]">Thanks for shopping with us!</h1>
              <p className="mt-1 text-[13px] text-ink-500">{eta ? <>Delivery by <span className="font-semibold text-ink-700">{eta}</span></> : <>We&rsquo;ll confirm your delivery date shortly</>}</p>
              <a href="/track" className="mt-1 inline-block text-[13px] font-semibold text-[#2874f0] hover:underline">Track &amp; manage order</a>
              <p className="mt-2 text-[12px] text-ink-400">Order #{order.orderNumber} &middot; {method} &middot; {speed}</p>
            </div>
            <span className="grid size-16 shrink-0 place-items-center rounded-full bg-emerald-50 sm:size-20">
              <CheckCircle2 className="size-9 text-emerald-600 sm:size-12" strokeWidth={2.5} />
            </span>
          </div>

          <a href="/contact" className="card mt-3 flex items-center gap-3 border-amber-200 bg-amber-50 p-3 no-underline">
            <ShoppingBag className="size-5 shrink-0 text-amber-600" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold text-ink-900">Shop responsibly</span>
              <span className="block text-[12px] text-ink-500">Cancellations &amp; returns are free as per our policy</span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-ink-400" />
          </a>

          <h2 className="mt-5 font-display text-[15px] font-bold text-ink-900">{eta ? <>Delivery by {eta}</> : speed}</h2>
          <a href="/" className="mt-3 block w-full rounded-xl bg-[#2874f0] py-3.5 text-center text-[14px] font-bold text-white no-underline transition-colors hover:bg-[#1f5fc9]">Continue Shopping</a>

          <p className="mt-3 text-[12px] leading-relaxed text-ink-500">
            Your order is saved to your account{order.guestPhone ? <> and we&rsquo;ll notify <span className="font-semibold text-ink-700">{order.guestPhone}</span></> : null}. Track its progress anytime from the <a href="/track" className="font-semibold text-[#2874f0] hover:underline">Track</a> page.
          </p>

          <div className="card mt-4 divide-y divide-hairline">
            {items.map((it) => (
              <div key={it.id} className="flex items-start gap-3 p-4">
                <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-canvas"><GuardedImg src={it.image} name={it.name} /></span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink-900">{it.name}</p>
                  <p className="mt-1 text-[12px] text-ink-500">Qty: {it.quantity}</p>
                  <p className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-[13px] font-bold tabular-nums text-ink-900">{inr(it.unitPrice)}</span>
                    {it.unitMrp > it.unitPrice && <span className="text-[11px] text-ink-300 line-through tabular-nums">{inr(it.unitMrp)}</span>}
                  </p>
                </div>
                <span className="shrink-0 text-[13px] font-bold tabular-nums text-ink-900">{inr(it.lineTotal)}</span>
              </div>
            ))}
          </div>

          {cats.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-3 font-display text-[15px] font-bold text-ink-900">You might be also interested in</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                                {cats.map((c) => {
                  const img = c.products[0]?.images[0]?.url ?? null;
                  return (
                    <a key={c.slug} href={`/products/${c.slug}`} className="card flex w-[120px] shrink-0 flex-col items-center gap-2 p-3 text-center no-underline transition-shadow hover:shadow-md">
                      <span className="relative grid size-16 place-items-center overflow-hidden rounded-full bg-canvas">
                        {img ? (
                          <GuardedImg src={img} name={c.name} className="size-full object-contain p-1" />
                        ) : (
                          <span className="text-[12px] font-black text-[#2874f0]">{c.name.slice(0, 2).toUpperCase()}</span>
                        )}
                      </span>
                      <span className="line-clamp-2 text-[12px] font-semibold text-ink-700">{c.name}</span>
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          {seedId && <RecommendationsRail seedId={seedId} />}

          <div className="card mt-6 flex items-start gap-3 border-red-200 bg-red-50 p-3">
            <ShieldAlert className="size-5 shrink-0 text-red-600" />
            <p className="text-[12px] leading-relaxed text-ink-700">
              <span className="font-bold text-red-700">Beware of fraudulent calls &amp; messages!</span> VoltKart never asks for your bank OTP/PIN for offers, and never demands money over a call or message. <a href="/contact" className="font-semibold text-[#2874f0] hover:underline">Read more</a>
            </p>
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <aside className="min-w-0 space-y-4">
          <div className="card p-4">
            <div className="flex items-center gap-2">
              <Headset className="size-5 text-[#2874f0]" />
              <p className="text-[13px] font-bold text-ink-900">Why call? Just click!</p>
            </div>
            <a href="/account/orders" className="mt-3 block w-full rounded-lg bg-[#2874f0] py-2.5 text-center text-[13px] font-bold text-white no-underline hover:bg-[#1f5fc9]">Go to My Orders</a>
          </div>

          <div className="card p-4">
            <p className="text-[13px] font-bold text-ink-900">Delivery address</p>
            {addr.name || addr.line1 ? (
              <div className="mt-1 text-[12px] leading-relaxed text-ink-700">
                {addr.name && <p className="font-semibold">{addr.name}</p>}
                {addr.phone && <p>{addr.phone}</p>}
                {addr.line1 && <p>{addr.line1}</p>}
                {addr.line2 && <p>{addr.line2}</p>}
                <p>{[addr.city, addr.state].filter(Boolean).join(", ")} {addr.pincode}</p>
              </div>
            ) : order.guestPhone ? (
              <p className="mt-1 text-[12px] text-ink-500">Phone number: <span className="font-semibold text-ink-700">{order.guestPhone}</span></p>
            ) : (
              <p className="mt-1 text-[12px] text-ink-400">Manage your address from your account.</p>
            )}
            <a href="/account/addresses" className="mt-2 inline-block text-[12px] font-semibold text-[#2874f0] hover:underline">Change or Add address</a>
          </div>
        </aside>
      </div>

      <ThanksFooter categories={cats} />
    </main>
  );
}
