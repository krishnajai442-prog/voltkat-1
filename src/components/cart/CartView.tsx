"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Heart, Info, PartyPopper, ShieldCheck, Star, Tag, Trash2, Truck, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { QuantityStepper } from "@/components/ui/Stepper";
import { Skeleton } from "@/components/ui/Skeleton";
import { CartRecommendRail } from "@/components/cart/CartRecommendRail";
import { ProductThumb } from "@/components/cart/ProductThumb";
import { useCart } from "@/context/CartContext";
import { emiPlans, inr } from "@/lib/utils";
import type { CardVM } from "@/lib/catalog";

export type CartProduct = CardVM;

function Stars({ avg }: { avg: number }) {
  const full = Math.round(avg);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Rated ${avg.toFixed(1)} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} className={`size-3 ${i < full ? "fill-emerald-600 text-emerald-600" : "fill-gray-200 text-gray-200"}`} />
      ))}
    </span>
  );
}

function ribbonFor(discount: number): { text: string; cls: string } | null {
  if (discount >= 50) return { text: "Top Discount of the Sale", cls: "bg-emerald-600 text-white" };
  if (discount >= 20) return { text: "Saver Deal", cls: "bg-emerald-100 text-emerald-800" };
  return null;
}

function variantFor(p: CardVM): string {
  return [
    p.color,
    p.subtype,
    p.ram && p.storage ? `${p.ram} RAM / ${p.storage}` : null,
    p.screenSize,
    p.processor,
  ].filter(Boolean).join(", ");
}

// ADD: truthful trust chip for the video's "Assured" slot — real fields only, never
// the word "Assured" (that names a Flipkart program we don't run).
function trustFor(p: CardVM): string | null {
  if (p.returnableDays > 0) return "Returnable";
  if (p.exchangeEligible) return "Exchange";
  if (p.ratingAvg >= 4) return "Top rated";
  return null;
}

export function CartView({ catalog }: { catalog: Record<string, CartProduct> }) {
  const {
    items, quote, quoting, setQty, remove, saveForLater, couponCode, applyCoupon,
    removeCoupon, deliveryMode, setDeliveryMode, toggleWishlist, ready,
  } = useCart();
  const [code, setCode] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponMsg, setCouponMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const active = items.filter((i) => !i.savedForLater);
  const saved = items.filter((i) => i.savedForLater);
  const cartIds = items.map((i) => i.productId);

  if (!ready) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (<Skeleton key={i} className="h-32 w-full rounded-2xl" />))}
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (!active.length && !saved.length) {
    return (
      <EmptyState
        icon={<Truck className="size-6" />}
        title="Your cart is empty"
        body="Add a phone, a laptop or an appliance — coupons and EMI options appear right here."
        action={
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            <Button href="/products/all">Start shopping</Button>
            <Button href="/offers" variant="outline">See live offers</Button>
          </div>
        }
      />
    );
  }

  return (
    <>
      <div className="grid gap-6 pb-20 lg:grid-cols-[1fr_22.5rem] lg:pb-0">
        <div className="min-w-0 space-y-3">
          <AnimatePresence initial={false}>
            {active.map((line) => {
              const p = catalog[line.productId];
              if (!p) return null;
              const ribbon = ribbonFor(p.discountPercent);
              const variant = variantFor(p);
              const trust = trustFor(p);
              const oos = p.stock <= 0;
              const low = !oos && p.stock <= p.lowStockAt;
              return (
                <motion.article
                  key={line.productId}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -18, height: 0, marginBottom: -12 }}
                  transition={{ duration: 0.22 }}
                  className="card relative flex gap-3.5 p-3.5 sm:gap-4 sm:p-4"
                >
                  {ribbon && (
                    <span className={`pointer-events-none absolute left-0 top-0 z-10 rounded-br-xl rounded-tl-2xl px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${ribbon.cls}`}>
                      {ribbon.text}
                    </span>
                  )}
                  {oos && (
                    <span className="pointer-events-none absolute right-2 top-2 z-10 rounded bg-rose-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                      Out Of Stock
                    </span>
                  )}
                  <Link href={`/product/${p.slug}`} className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-canvas sm:size-28">
                    <ProductThumb src={p.image} name={p.name} />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-300">{p.brand}</p>
                    <Link href={`/product/${p.slug}`} className="mt-0.5 line-clamp-2 text-[14px] font-semibold text-ink-900 hover:text-electric-600">
                      {p.name}
                    </Link>

                    {(p.ratingAvg > 0 || variant || trust) && (
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        {p.ratingAvg > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-ink-700">
                            <Stars avg={p.ratingAvg} />
                            <span className="tabular-nums">{p.ratingAvg.toFixed(1)}</span>
                            <span className="text-ink-300">· ({p.ratingCount.toLocaleString("en-IN")})</span>
                          </span>
                        )}
                        {trust && (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-bold text-emerald-700">
                            <ShieldCheck className="size-3" /> {trust}
                          </span>
                        )}
                        {variant && <span className="text-[11.5px] text-ink-400">{variant}</span>}
                      </div>
                    )}

                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="font-display text-[16px] font-bold tabular-nums text-ink-900">{inr(p.salePrice * line.quantity)}</span>
                      {p.mrp > p.salePrice && (
                        <>
                          <span className="text-[12.5px] text-ink-300 line-through tabular-nums">{inr(p.mrp * line.quantity)}</span>
                          <Badge tone="deal">{p.discountPercent}% off</Badge>
                        </>
                      )}
                    </div>

                    {low && <p className="mt-1 text-[11.5px] font-bold text-flame-600">Only {p.stock} left</p>}

                    <p className="mt-1 text-[11.5px] text-ink-400">
                      {p.stock > 0 ? (
                        <span className="text-emerald-600">In stock — {p.stock} available · delivery {deliveryMode === "EXPRESS" ? "in 24–48 hrs" : "in 3–6 days"}</span>
                      ) : (
                        <span className="text-flame-600">Out of stock — reduce quantity</span>
                      )}
                    </p>

                    {/* ADD: per-row dated delivery line from real quote.etaTo */}
                    {quote?.etaTo && (
                      <p className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-semibold text-ink-700">
                        <Truck className="size-3.5 text-electric-600" />
                        {deliveryMode === "EXPRESS" ? "EXPRESS" : "Standard"} delivery by{" "}
                        {new Date(quote.etaTo).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                      </p>
                    )}

                    <div className="mt-auto grid grid-cols-3 divide-x divide-hairline border-t border-hairline">
                      <button onClick={() => void saveForLater(p.id, true)} className="inline-flex items-center justify-center gap-1 py-2.5 text-[12px] font-semibold text-ink-500 hover:text-ink-900">
                        <Undo2 className="size-3.5" /> Save for later
                      </button>
                      <button onClick={() => void remove(p.id)} className="inline-flex items-center justify-center gap-1 py-2.5 text-[12px] font-semibold text-ink-500 hover:text-flame-600">
                        <Trash2 className="size-3.5" /> Remove
                      </button>
                      <button onClick={() => void toggleWishlist(p.id)} className="inline-flex items-center justify-center gap-1 py-2.5 text-[12px] font-semibold text-ink-500 hover:text-flame-500">
                        <Heart className="size-3.5" /> Wishlist
                      </button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>

          {saved.length > 0 && (
            <section className="card p-4">
              <h2 className="mb-3 font-display text-[14px] font-bold text-ink-900">Saved for later ({saved.length})</h2>
              <ul className="space-y-3">
                {saved.map((line) => {
                  const p = catalog[line.productId];
                  if (!p) return null;
                  return (
                    <li key={line.productId} className="flex items-center gap-3">
                      <Link href={`/product/${p.slug}`} className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-canvas">
                        <ProductThumb src={p.image} name={p.name} imgClass="absolute inset-0 size-full object-contain p-1" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/product/${p.slug}`} className="block truncate text-[13px] font-semibold text-ink-900 hover:text-electric-600">{p.name}</Link>
                        <p className="text-[12.5px] font-bold tabular-nums text-ink-400">{inr(p.salePrice)}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => void saveForLater(p.id, false)}>Move to cart</Button>
                      <button onClick={() => void remove(p.id)} aria-label="Remove" className="p-1.5 text-ink-300 hover:text-flame-600"><Trash2 className="size-4" /></button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="card p-4">
            <h2 className="mb-3 flex items-center gap-2 font-display text-[14px] font-bold text-ink-900">
              <Truck className="size-4 text-electric-600" /> Delivery speed
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { id: "STANDARD" as const, title: "Standard", body: "3–6 days", fee: (quote?.subtotal ?? 0) >= 999 ? "FREE" : inr(49) },
                { id: "EXPRESS" as const, title: "Express", body: "24–48 hrs in metros", fee: inr(99) },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setDeliveryMode(m.id)}
                  aria-pressed={deliveryMode === m.id}
                  className={`rounded-xl border p-3.5 text-left transition-all ${deliveryMode === m.id ? "border-electric-500 bg-electric-50 shadow-glow" : "border-hairline hover:border-electric-300"}`}
                >
                  <p className="text-[13.5px] font-bold text-ink-900">{m.title}</p>
                  <p className="mt-0.5 text-[12px] text-ink-400">{m.body}</p>
                  <p className="mt-1.5 text-[12.5px] font-bold tabular-nums text-electric-600">{m.fee}</p>
                </button>
              ))}
            </div>
          </section>

          <CartRecommendRail title="Suggested for You" subtitle="Based on your activity" source="random" exclude={cartIds} />
          <CartRecommendRail title="Items you may have missed" source="recent" exclude={cartIds} />
          <CartRecommendRail title="Recently Viewed" source="recent" />
        </div>

        <aside className="lg:sticky lg:top-[92px] lg:h-fit">
          {quote && quote.savingsTotal > 0 && (
            <div className="mb-3 flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-center text-[13px] font-bold text-emerald-700 ring-1 ring-emerald-200">
              <PartyPopper className="size-4" /> You&apos;ll save {inr(quote.savingsTotal)} on this order!
            </div>
          )}
          <div className="card overflow-hidden">
            <header className="border-b border-hairline px-4 py-3.5">
              <h2 className="font-display text-[14px] font-bold uppercase tracking-wider text-ink-400">Order summary</h2>
            </header>
            <div className="space-y-3 p-4">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-bold text-ink-700">
                  <Tag className="size-3.5 text-electric-600" /> Have a coupon?
                </label>
                {couponCode ? (
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-mint-500/10 px-3 py-2.5">
                    <span className="text-[13px] font-bold tracking-wider text-emerald-700">{couponCode}</span>
                    <button onClick={() => void removeCoupon()} className="text-[12px] font-bold text-flame-600 hover:underline">Remove</button>
                  </div>
                ) : (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setCouponBusy(true);
                      const res = await applyCoupon(code.toUpperCase());
                      setCouponMsg({ tone: res.ok ? "ok" : "err", text: res.message });
                      setCouponBusy(false);
                    }}
                    className="flex gap-2"
                  >
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 24))}
                      placeholder="DIWALI20"
                      aria-label="Coupon code"
                      className="h-10 min-w-0 flex-1 rounded-xl border border-hairline px-3 text-[13.5px] font-semibold tracking-wider outline-none focus:border-electric-400"
                    />
                    <Button type="submit" size="sm" loading={couponBusy} className="h-10 shrink-0">Apply</Button>
                  </form>
                )}
                {couponMsg && (
                  <p role="status" className={`mt-1.5 text-[11.5px] font-semibold ${couponMsg.tone === "ok" ? "text-emerald-600" : "text-flame-600"}`}>{couponMsg.text}</p>
                )}
                {quote?.couponError && !couponCode && (
                  <p className="mt-1.5 text-[11.5px] font-semibold text-flame-600">{quote.couponError}</p>
                )}
              </div>

              {/* ADD: collapsible wrapper (video affordance); every existing row preserved */}
              {quoting && !quote ? (
                <Skeleton className="h-40 w-full" />
              ) : quote ? (
                <details open className="group border-t border-hairline pt-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] font-bold text-ink-900">
                    Price details
                    <ChevronDown className="size-4 text-ink-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <dl className="mt-2 space-y-2 text-[13px]">
                    <Row label={`Price (${quote.itemCount} item${quote.itemCount > 1 ? "s" : ""})`} value={inr(quote.subtotalMrp)} />
                    <Row label="Discount on items" value={`− ${inr(quote.itemDiscount)}`} tone="good" />
                    {quote.coupon && <Row label={`Coupon (${quote.coupon.code})`} value={`− ${inr(quote.coupon.discount)}`} tone="good" />}
                    <Row label="Delivery" value={quote.deliveryFee === 0 ? "FREE" : inr(quote.deliveryFee)} tone={quote.deliveryFee === 0 ? "good" : undefined} />
                    {quote.codFee > 0 && <Row label="COD handling" value={inr(quote.codFee)} />}
                    <div className="my-1 border-t border-dashed border-hairline" />
                    <div className="flex items-baseline justify-between">
                      <dt className="font-display text-[15px] font-bold text-ink-900">Total payable</dt>
                      <dd className="font-display text-xl font-bold tabular-nums text-ink-900">{inr(quote.total)}</dd>
                    </div>
                    <p className="text-[11px] text-ink-400">
                      Includes {inr(quote.gstComponent)} GST. {quote.savingsTotal > 0 && `You save ${inr(quote.savingsTotal)} on this order.`}
                    </p>
                  </dl>
                </details>
              ) : null}

              {quote && (() => {
                const plan = emiPlans(quote.total)[0];
                return plan ? (
                  <p className="rounded-xl bg-canvas px-3 py-2.5 text-[12px] font-semibold text-ink-700">
                    or {inr(plan.perMonth)}/month × {plan.months} no-cost EMI
                  </p>
                ) : null;
              })()}

              <Button href="/checkout" block size="lg" disabled={!active.length} className="mt-1">Proceed to Checkout</Button>
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-ink-400">
                <ShieldCheck className="size-3.5 text-mint-500" /> 256-bit secured · PCI-DSS via Razorpay
              </p>
            </div>

            {quote && quote.stockIssues.length > 0 && (
              <div className="border-t border-hairline bg-amber-50 px-4 py-3">
                <p className="text-[12px] font-bold text-amber-700">Stock adjusted</p>
                <ul className="mt-1 space-y-0.5 text-[11.5px] text-ink-700">
                  {quote.stockIssues.map((s) => (
                    <li key={s.productId}>{s.name}: {s.available} available (you wanted {s.requested})</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <Link href="/offers" className="mt-3 block rounded-2xl border border-dashed border-electric-400 bg-electric-50 p-3.5 text-center text-[12.5px] font-bold text-electric-700 hover:bg-electric-100">
            Stack a bank offer on top →
          </Link>
        </aside>
      </div>

      {quote && active.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-white/95 px-4 py-2.5 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="min-w-0">
              {quote.subtotalMrp > quote.total && (
                <p className="text-[11px] text-ink-300 line-through tabular-nums">{inr(quote.subtotalMrp)}</p>
              )}
              <p className="flex items-center gap-1 font-display text-[17px] font-bold tabular-nums text-ink-900">
                {inr(quote.total)} <Info className="size-3.5 text-ink-300" aria-hidden />
              </p>
            </div>
            <Button href="/checkout" size="lg" className="shrink-0 bg-yellow-400 text-ink-900 hover:bg-yellow-300">Place Order</Button>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "good" }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-400">{label}</dt>
      <dd className={`font-semibold tabular-nums ${tone === "good" ? "text-emerald-600" : "text-ink-900"}`}>{value}</dd>
    </div>
  );
}