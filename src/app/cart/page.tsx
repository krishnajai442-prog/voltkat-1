"use client";

import {
  ArrowLeft, ArrowRight, Building2, ChevronDown, Heart, Home as HomeIcon, Info,
  Loader2, MoreHorizontal, PartyPopper, Plus, ShieldCheck, ShoppingCart, Trash2, Truck, Undo2, X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { QuantityStepper } from "@/components/ui/Stepper";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toaster";
import { useCart } from "@/context/CartContext";
import { inr } from "@/lib/utils";
import type { CardVM } from "@/lib/catalog";

const RECENT_KEY = "vk:recent:v1";   // same history the PDP / account rail write
const LS_ADDR = "vk_addr_sel_v1";    // selected delivery address id (local, reload-stable)

// Real Address columns (schema-confirmed): fullName / label / isDefault / pincode /
// line1 / line2(nullable) / city / state / phone / altPhone(nullable).
type Addr = {
  id: string;
  fullName: string;
  label: string;
  pincode: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  phone: string;
  altPhone?: string | null;
  isDefault: boolean;
};

const addrStreet = (a: Addr) => [a.line1, a.line2, a.city, a.state].filter(Boolean).join(", ");

function useAddresses() {
  const [list, setList] = useState<Addr[] | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    let alive = true;
    fetch("/api/account/addresses", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!alive) return;
        const arr = (j?.addresses ?? []) as Addr[];
        setList(Array.isArray(arr) ? arr : []);
      })
      .catch(() => alive && setList([])); // guest / 401 -> empty list, never a crash
    return () => { alive = false; };
  }, [tick]);
  return { list, refresh };
}

export default function CartPage() {
  const router = useRouter();
  const toast = useToast();
  const {
    ready, items, quote, quoting, couponCode, wishlist,
    setQty, remove, saveForLater, toggleWishlist, applyCoupon, removeCoupon,
  } = useCart();

  const { list: addresses, refresh: refreshAddresses } = useAddresses();
  const [code, setCode] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [tab, setTab] = useState<"cart" | "wishlist">("cart");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);

  // Address selection lives HERE (local), not in context, so this single file works
  // against the UNMODIFIED CartContext. Hydrate in an effect (not a useState init) so
  // the server render never touches localStorage.
  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  useEffect(() => {
    try { const raw = window.localStorage.getItem(LS_ADDR); if (raw) setSelectedIdState(JSON.parse(raw) as string); } catch { /* ignore */ }
  }, []);
  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIdState(id);
    try { if (id) window.localStorage.setItem(LS_ADDR, id); else window.localStorage.removeItem(LS_ADDR); } catch { /* ignore */ }
  }, []);

  const activeLines = items.filter((i) => !i.savedForLater);
  const activeCount = activeLines.length;
  const cartQty = activeLines.reduce((n, i) => n + i.quantity, 0); // true item count, no quote needed
  const savedIds = items.filter((i) => i.savedForLater).map((i) => i.productId);
  const cartIds = items.map((i) => i.productId);

  const selected = addresses?.find((a) => a.id === selectedId) ?? null;

  // Default selection, like the video's pre-"Selected" row: once the list arrives and
  // nothing is chosen, pick the isDefault address (else the first). Terminates because
  // the next run sees selectedId set and returns.
  useEffect(() => {
    if (!addresses || selectedId) return;
    const def = addresses.find((a) => a.isDefault) ?? addresses[0];
    if (def) setSelectedId(def.id);
  }, [addresses, selectedId, setSelectedId]);

  async function submitCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setCouponBusy(true);
    const result = await applyCoupon(code.trim());
    setCouponBusy(false);
    toast.push({ tone: result.ok ? "success" : "error", title: result.ok ? "Coupon applied" : "Coupon not applied", body: result.message });
    if (result.ok) setCode("");
  }

  function pickAddress(a: Addr) {
    setSelectedId(a.id);     // local + localStorage; header swaps instantly
    setSheetOpen(false);
    setSelecting(true);      // mirror the video's centered spinner
    window.setTimeout(() => setSelecting(false), 700);
  }

  if (!ready) {
    return (
      <div className="container-x py-8">
        <Skeleton className="h-10 w-40" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Wishlist tab is quote-independent, so it renders even with an empty cart.
  if (tab === "wishlist") {
    return (
      <div className="container-x pb-8 pt-3 lg:pt-5">
        <HeaderTabs tab="wishlist" setTab={setTab} cartQty={cartQty} wlCount={wishlist.length} onCheckout={() => router.push("/checkout")} />
        <WishlistPanel />
        <div className="mt-6 space-y-4">
          <Rail title="Suggested for You" subtitle="Based on your activity" source="random" exclude={cartIds} />
          <Rail title="Items you may have missed" source="recent" exclude={cartIds} />
          <Rail title="Recently Viewed" source="recent" />
        </div>
      </div>
    );
  }

  if (quoting && !quote) {
    return (
      <div className="container-x py-8">
        <Skeleton className="h-10 w-40" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!activeCount || !quote) {
    return (
      <div className="container-x py-10">
        <EmptyState
          icon={<ShoppingCart className="size-6" />}
          title="Your cart is empty"
          body="Add products to see pricing, delivery estimates and coupon savings here."
          action={
            <div className="mt-1 flex gap-2">
              <Button href="/products/all">Browse products</Button>
              <Button href="/offers" variant="outline">View offers</Button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-x pb-8 pt-3 lg:pt-5">
      <HeaderTabs tab="cart" setTab={setTab} cartQty={cartQty} wlCount={wishlist.length} onCheckout={() => router.push("/checkout")} />

      <DeliverToBar selected={selected} onChange={() => setSheetOpen(true)} />

      {quote.stockIssues.length > 0 && (
        <div role="alert" className="mb-5 rounded-2xl bg-flame-500/10 p-4 text-[13px] font-semibold text-flame-600">
          Some items have stock issues. Adjust quantities or remove them before checkout.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="card overflow-hidden">
          <ul className="divide-y divide-hairline">
            {quote.lines.map((line) => {
              const ribbon =
                line.discountPercent >= 50 ? { text: "Top Discount of the Sale", cls: "bg-emerald-600 text-white" }
                : line.discountPercent >= 20 ? { text: "Saver Deal", cls: "bg-emerald-100 text-emerald-800" }
                : null;
              return (
                <li key={line.productId} className="relative flex flex-col gap-4 p-4">
                  {ribbon && (
                    <span className={`pointer-events-none absolute left-0 top-0 z-10 rounded-br-xl rounded-tl-2xl px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${ribbon.cls}`}>
                      {ribbon.text}
                    </span>
                  )}
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="flex shrink-0 flex-col items-start gap-3 sm:w-28">
                      <Link href={`/product/${line.slug}`} className="relative block size-28 overflow-hidden rounded-xl bg-canvas">
                        <Thumb src={line.image} name={line.name} pad="p-2" />
                      </Link>
                      <QuantityStepper value={line.quantity} min={1} max={Math.min(10, Math.max(1, line.stock))} onChange={(qty) => void setQty(line.productId, qty)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-300">{line.brand}</p>
                      <Link href={`/product/${line.slug}`} className="mt-0.5 block text-[14.5px] font-bold text-ink-900 hover:text-electric-600">{line.name}</Link>
                      {line.exchangeEligible && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-bold text-emerald-700">
                          <ShieldCheck className="size-3" /> Exchange
                        </span>
                      )}
                      <div className="mt-2 flex flex-wrap items-baseline gap-2">
                        {line.discountPercent > 0 && <span className="text-[13px] font-bold text-emerald-600">↓{line.discountPercent}%</span>}
                        {line.lineMrp > line.lineTotal && <span className="text-[12.5px] text-ink-300 line-through tabular-nums">{inr(line.lineMrp)}</span>}
                        <span className="font-display text-[16px] font-bold tabular-nums text-ink-900">{inr(line.lineTotal)}</span>
                      </div>
                      <p className="mt-0.5 text-[11.5px] text-ink-400">{inr(line.salePrice)} each</p>
                      {quote.etaTo && (
                        <p className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-ink-700">
                          <Truck className="size-3.5 text-electric-600" />
                          Delivery by {new Date(quote.etaTo).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {line.stock <= 0 ? <Badge tone="deal">Out of stock</Badge>
                          : line.stock <= 5 ? <Badge tone="warn">Only {line.stock} left</Badge>
                          : <Badge tone="save">In stock</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-hairline border-t border-hairline">
                    <button type="button" onClick={() => void saveForLater(line.productId, true)} className="inline-flex items-center justify-center gap-1 py-2.5 text-[12px] font-semibold text-ink-500 hover:text-ink-900"><Undo2 className="size-3.5" /> Save for later</button>
                    <button type="button" onClick={() => void remove(line.productId)} className="inline-flex items-center justify-center gap-1 py-2.5 text-[12px] font-semibold text-ink-500 hover:text-flame-600"><Trash2 className="size-3.5" /> Remove</button>
                    <button type="button" onClick={() => void toggleWishlist(line.productId)} className="inline-flex items-center justify-center gap-1 py-2.5 text-[12px] font-semibold text-ink-500 hover:text-flame-500"><Heart className="size-3.5" /> Wishlist</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <SavedList ids={savedIds} onMove={(id) => void saveForLater(id, false)} onRemove={(id) => void remove(id)} />

        <aside className="space-y-4 lg:sticky lg:top-[92px] lg:h-fit">
          {quote.savingsTotal > 0 && (
            <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-center text-[13px] font-bold text-emerald-700 ring-1 ring-emerald-200">
              <PartyPopper className="size-4" /> You&apos;ll save {inr(quote.savingsTotal)} on this order!
            </div>
          )}
          <div className="card p-4">
            <h2 className="font-display text-[13px] font-bold uppercase tracking-wider text-ink-400">Coupon</h2>
            {couponCode ? (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-mint-500/10 px-3.5 py-2.5">
                <div>
                  <p className="text-[13px] font-bold text-emerald-700">{couponCode}</p>
                  <p className="text-[11.5px] text-ink-400">Saved {inr(quote.coupon?.discount ?? 0)}</p>
                </div>
                <button type="button" onClick={removeCoupon} className="text-[12px] font-bold text-ink-400 hover:text-flame-600">Remove</button>
              </div>
            ) : (
              <form onSubmit={submitCoupon} className="mt-3 flex gap-2">
                <Input containerClassName="flex-1" placeholder="Enter coupon code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
                <Button type="submit" loading={couponBusy} size="md">Apply</Button>
              </form>
            )}
            {quote.couponError && <p className="mt-2 text-[12px] font-semibold text-flame-600">{quote.couponError}</p>}
          </div>

          <div className="card p-4">
            <details open className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between">
                <h2 className="font-display text-[13px] font-bold uppercase tracking-wider text-ink-400">Price details</h2>
                <ChevronDown className="size-4 text-ink-400 transition-transform group-open:rotate-180" />
              </summary>
              <dl className="mt-3 space-y-2 text-[13px]">
                <Row k={`Price (${quote.itemCount})`} v={inr(quote.subtotalMrp)} />
                <Row k="Item discount" v={`− ${inr(quote.itemDiscount)}`} good />
                {quote.coupon && <Row k={`Coupon ${quote.coupon.code}`} v={`− ${inr(quote.coupon.discount)}`} good />}
                <Row k="Delivery" v={quote.deliveryFee === 0 ? "FREE" : inr(quote.deliveryFee)} good={quote.deliveryFee === 0} />
                {quote.codFee > 0 && <Row k="COD charge" v={inr(quote.codFee)} />}
                <div className="my-1 border-t border-dashed border-hairline" />
                <div className="flex items-baseline justify-between">
                  <dt className="font-display text-[15px] font-bold text-ink-900">Total</dt>
                  <dd className="font-display text-xl font-bold tabular-nums text-ink-900">{inr(quote.total)}</dd>
                </div>
                <p className="text-[11px] text-ink-400">Incl. {inr(quote.gstComponent)} GST · You save {inr(quote.savingsTotal)}</p>
              </dl>
            </details>
            <Button href="/checkout" block size="lg" className="mt-4">Proceed to checkout</Button>
            <ul className="mt-4 space-y-2 border-t border-hairline pt-3 text-[12px] text-ink-400">
              <li className="flex items-center gap-2">
                <Truck className="size-3.5 text-mint-500" />
                Estimated delivery {new Date(quote.etaFrom).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                {" – "}{new Date(quote.etaTo).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </li>
              <li className="flex items-center gap-2"><ShieldCheck className="size-3.5 text-mint-500" /> Secure Razorpay / COD checkout</li>
            </ul>
          </div>
        </aside>
      </div>

      <div className="mt-6 space-y-4">
        <Rail title="Suggested for You" subtitle="Based on your activity" source="random" exclude={cartIds} />
        <Rail title="Items you may have missed" source="recent" exclude={cartIds} />
        <Rail title="Recently Viewed" source="recent" />
      </div>

      <div className="fixed inset-x-0 z-30 border-t border-hairline bg-white/95 px-4 py-2.5 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden" style={{ bottom: "var(--vk-tabbar-h, 64px)" }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="min-w-0">
            {quote.subtotalMrp > quote.total && <p className="text-[11px] text-ink-300 line-through tabular-nums">{inr(quote.subtotalMrp)}</p>}
            <p className="flex items-center gap-1 font-display text-[17px] font-bold tabular-nums text-ink-900">{inr(quote.total)} <Info className="size-3.5 text-ink-300" aria-hidden /></p>
          </div>
          <Button href="/checkout" size="lg" className="shrink-0 bg-yellow-400 text-ink-900 hover:bg-yellow-300">Place Order</Button>
        </div>
      </div>

      {sheetOpen && (
        <AddressSheet
          addresses={addresses ?? []}
          loading={addresses === null}
          selectedId={selectedId}
          onSelect={pickAddress}
          onClose={() => setSheetOpen(false)}
          onAddNew={() => { setSheetOpen(false); router.push("/account/addresses?new=1"); }}
          onEdit={(id) => { setSheetOpen(false); router.push(`/account/addresses?edit=${id}`); }}
          onDelete={async (id) => {
            if (!window.confirm("Delete this address?")) return;
            try {
              const res = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
              if (res.ok) { if (selectedId === id) setSelectedId(null); refreshAddresses(); toast.push({ title: "Address deleted" }); }
              else { toast.push({ tone: "error", title: "Couldn't delete here", body: "Manage it on the addresses page." }); setSheetOpen(false); router.push("/account/addresses"); }
            } catch { toast.push({ tone: "error", title: "Couldn't delete here", body: "Manage it on the addresses page." }); setSheetOpen(false); router.push("/account/addresses"); }
          }}
        />
      )}

      {selecting && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-white/40 backdrop-blur-[1px]">
          <Loader2 className="size-8 animate-spin text-electric-600" />
        </div>
      )}
    </div>
  );
}

/* ---------------- local, self-contained pieces ---------------- */

function HeaderTabs({ tab, setTab, cartQty, wlCount, onCheckout }: { tab: "cart" | "wishlist"; setTab: (t: "cart" | "wishlist") => void; cartQty: number; wlCount: number; onCheckout: () => void }) {
  const router = useRouter();
  const active = "-mb-px inline-flex items-center gap-1.5 border-b-2 border-electric-600 pb-2.5 text-[14px] font-bold text-electric-700";
  const idle = "-mb-px inline-flex items-center gap-1.5 pb-2.5 text-[14px] font-semibold text-ink-400 hover:text-ink-900";
  return (
    <>
      {/* "My Cart" nudged up (page pt-3); Checkout kept top-right so no existing control is lost */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <button type="button" onClick={() => router.back()} aria-label="Back" className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-700 hover:bg-canvas">
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="font-display text-2xl font-bold text-ink-900">My Cart</h1>
        </div>
        {/* <Button size="sm" onClick={onCheckout} className="shrink-0">Checkout <ArrowRight className="size-4" /></Button> */}
      </div>
      {/* tabs spread opposite each other: VoltKart left, Wishlist right */}
      <div className="mb-4 flex items-center justify-between gap-4 border-b border-hairline">
        <button type="button" onClick={() => setTab("cart")} className={tab === "cart" ? active : idle}>VoltKart ({cartQty})</button>
        <button type="button" onClick={() => setTab("wishlist")} className={tab === "wishlist" ? active : idle}>Wishlist ({wlCount})</button>
      </div>
    </>
  );
}

function DeliverToBar({ selected, onChange }: { selected: Addr | null; onChange: () => void }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-hairline bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] text-ink-700">
          Deliver to:
          <span className="font-bold text-ink-900">{selected ? `${selected.fullName}, ${selected.pincode}` : "Add your address"}</span>
          {selected && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9.5px] font-black uppercase tracking-wide text-gray-500">{selected.label}</span>}
        </p>
        {selected && <p className="mt-0.5 truncate text-[12px] text-ink-400">{addrStreet(selected)}</p>}
      </div>
      <button type="button" onClick={onChange} className="shrink-0 rounded-lg border border-electric-300 px-3 py-1.5 text-[12.5px] font-bold text-electric-700 hover:bg-electric-50">Change</button>
    </div>
  );
}

function AddressSheet({ addresses, loading, selectedId, onSelect, onClose, onAddNew, onEdit, onDelete }: {
  addresses: Addr[]; loading: boolean; selectedId: string | null;
  onSelect: (a: Addr) => void; onClose: () => void; onAddNew: () => void;
  onEdit: (id: string) => void; onDelete: (id: string) => void;
}) {
  const [menuId, setMenuId] = useState<string | null>(null);
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div className="relative max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-dashed border-hairline bg-white px-4 py-3.5">
          <h2 className="font-display text-[16px] font-bold text-ink-900">Select delivery address</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-lg text-ink-500 hover:bg-canvas"><X className="size-5" /></button>
        </div>

        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-[13px] font-bold text-ink-900">Saved addresses</p>
          <button type="button" onClick={onAddNew} className="inline-flex items-center gap-1 text-[13px] font-bold text-electric-600 hover:underline"><Plus className="size-4" /> Add New</button>
        </div>

        {loading ? (
          <div className="space-y-2 px-4 pb-4">{[0, 1].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : addresses.length === 0 ? (
          <p className="px-4 pb-6 text-[13px] text-ink-400">No saved addresses yet. Tap “Add New” to create one.</p>
        ) : (
          <ul className="divide-y divide-hairline pb-6">
            {addresses.map((a) => {
              const isSel = a.id === selectedId;
              const Icon = /work|office/i.test(a.label) ? Building2 : HomeIcon;
              return (
                <li key={a.id} className="relative">
                  <button type="button" onClick={() => onSelect(a)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-canvas/60">
                    <Icon className="mt-0.5 size-5 shrink-0 text-ink-500" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-bold text-ink-900">{a.fullName}</span>
                        {isSel && <span className="rounded bg-electric-50 px-1.5 py-0.5 text-[10.5px] font-bold text-electric-700">Selected</span>}
                      </span>
                      <span className="mt-0.5 block truncate text-[12.5px] text-ink-400">{[addrStreet(a), a.pincode].filter(Boolean).join(", ")}</span>
                    </span>
                  </button>
                  <button type="button" onClick={() => setMenuId(menuId === a.id ? null : a.id)} aria-label="Address options" className="absolute right-2 top-3 grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-canvas">
                    <MoreHorizontal className="size-5" />
                  </button>
                  {menuId === a.id && (
                    <>
                      <button type="button" aria-label="Close menu" onClick={() => setMenuId(null)} className="fixed inset-0 z-10 cursor-default" />
                      <div className="absolute right-3 top-11 z-20 w-32 overflow-hidden rounded-xl border border-hairline bg-white py-1 shadow-lg">
                        <button type="button" onClick={() => { setMenuId(null); onEdit(a.id); }} className="flex w-full items-center gap-2 px-3 py-2 text-[13px] font-semibold text-ink-700 hover:bg-canvas"><PenIcon /> Edit</button>
                        <button type="button" onClick={() => { setMenuId(null); void onDelete(a.id); }} className="flex w-full items-center gap-2 px-3 py-2 text-[13px] font-semibold text-flame-600 hover:bg-canvas"><Trash2 className="size-4" /> Delete</button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// inline pencil so we don't churn the lucide import list
function PenIcon() { return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>; }

function Thumb({ src, name, pad = "p-1.5" }: { src: string; name: string; pad?: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) return <span aria-hidden className="absolute inset-0 grid place-items-center bg-canvas text-[11px] font-bold text-ink-300">{(name || "V").slice(0, 2).toUpperCase()}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} loading="lazy" onError={() => setErr(true)} className={`absolute inset-0 size-full object-contain ${pad}`} />
  );
}

function Rail({ title, subtitle, source, exclude = [], count = 12 }: { title: string; subtitle?: string; source: "random" | "recent"; exclude?: string[]; count?: number }) {
  const { add } = useCart();
  const [items, setItems] = useState<CardVM[] | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      let url = "";
      if (source === "random") {
        const qs = new URLSearchParams({ n: String(count) });
        if (exclude.length) qs.set("exclude", exclude.join(","));
        url = `/api/feed/cart-recommendations?${qs}`;
      } else {
        let ids: string[] = [];
        try { const raw = window.localStorage.getItem(RECENT_KEY); const list = raw ? (JSON.parse(raw) as Array<{ id?: string }>) : []; ids = (Array.isArray(list) ? list : []).map((r) => r.id ?? "").filter(Boolean); } catch { ids = []; }
        const ex = new Set(exclude);
        const final = (exclude.length ? ids.filter((id) => !ex.has(id)) : ids).slice(0, count);
        if (!final.length) { if (alive) setItems([]); return; }
        url = `/api/feed/cart-recommendations?ids=${final.join(",")}`;
      }
      try { const res = await fetch(url, { cache: "no-store" }); const json = (await res.json()) as { ok: boolean; products?: CardVM[] }; if (alive) setItems(json.ok && Array.isArray(json.products) ? json.products : []); } catch { if (alive) setItems([]); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, exclude.join(","), count]);
  if (!items || items.length === 0) return null;
  return (
    <section className="card p-4">
      <div className="mb-3"><h2 className="font-display text-[14px] font-bold text-ink-900">{title}</h2>{subtitle && <p className="mt-0.5 text-[12px] text-ink-400">{subtitle}</p>}</div>
      <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {items.map((p) => (
          <div key={p.id} className="flex w-36 shrink-0 flex-col">
            <Link href={`/product/${p.slug}`} className="relative block aspect-square overflow-hidden rounded-xl bg-canvas"><Thumb src={p.image} name={p.name} /></Link>
            <Link href={`/product/${p.slug}`} className="mt-2 line-clamp-2 min-h-[2.1rem] text-[12px] font-semibold leading-snug text-ink-900 hover:text-electric-600">{p.name}</Link>
            <p className="mt-1 flex flex-wrap items-baseline gap-1"><span className="text-[12.5px] font-bold tabular-nums text-ink-900">{inr(p.salePrice)}</span>{p.mrp > p.salePrice && <span className="text-[11px] text-ink-300 line-through tabular-nums">{inr(p.mrp)}</span>}</p>
            {p.discountPercent > 0 && <span className="mt-0.5 text-[11px] font-bold text-emerald-600">{p.discountPercent}% off</span>}
            <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => void add(p.id)}>Add to cart</Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function useHydrate(ids: string[]): CardVM[] | null {
  const [rows, setRows] = useState<CardVM[] | null>(null);
  const key = ids.join(",");
  useEffect(() => {
    if (!key) { setRows([]); return; }
    let alive = true;
    fetch(`/api/feed/cart-recommendations?ids=${key}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive) setRows((j?.products as CardVM[] | undefined) ?? []); })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, [key]);
  return rows;
}

function SavedList({ ids, onMove, onRemove }: { ids: string[]; onMove: (id: string) => void; onRemove: (id: string) => void }) {
  const rows = useHydrate(ids);
  if (!ids.length || !rows || rows.length === 0) return null;
  return (
    <section className="card p-4">
      <h2 className="mb-3 font-display text-[14px] font-bold text-ink-900">Saved for later ({ids.length})</h2>
      <ul className="space-y-3">
        {rows.map((p) => (
          <li key={p.id} className="flex items-center gap-3">
            <Link href={`/product/${p.slug}`} className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-canvas"><Thumb src={p.image} name={p.name} pad="p-1" /></Link>
            <div className="min-w-0 flex-1"><Link href={`/product/${p.slug}`} className="block truncate text-[13px] font-semibold text-ink-900 hover:text-electric-600">{p.name}</Link><p className="text-[12.5px] font-bold tabular-nums text-ink-400">{inr(p.salePrice)}</p></div>
            <Button size="sm" variant="outline" onClick={() => onMove(p.id)}>Move to cart</Button>
            <button type="button" onClick={() => onRemove(p.id)} aria-label="Remove" className="p-1.5 text-ink-300 hover:text-flame-600"><Trash2 className="size-4" /></button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function WishlistPanel() {
  const { wishlist, add, toggleWishlist } = useCart();
  const rows = useHydrate(wishlist);
  if (!wishlist.length) return (
    <div className="card p-8 text-center"><Heart className="mx-auto size-7 text-ink-300" /><p className="mt-2 text-[14px] font-bold text-ink-900">Your wishlist is empty</p><p className="mt-1 text-[12.5px] text-ink-400">Tap the heart on any product to save it here.</p><Button href="/products/all" className="mt-4">Browse products</Button></div>
  );
  if (!rows) return <div className="card space-y-3 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>;
  if (rows.length === 0) return <div className="card p-6 text-center text-[13px] text-ink-400">Your saved items are no longer available.</div>;
  return (
    <section className="card p-4">
      <h2 className="mb-3 font-display text-[14px] font-bold text-ink-900">Wishlist ({wishlist.length})</h2>
      <ul className="space-y-3">
        {rows.map((p) => (
          <li key={p.id} className="flex items-center gap-3">
            <Link href={`/product/${p.slug}`} className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-canvas"><Thumb src={p.image} name={p.name} pad="p-1" /></Link>
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-ink-300">{p.brand}</p>
              <Link href={`/product/${p.slug}`} className="block truncate text-[13px] font-semibold text-ink-900 hover:text-electric-600">{p.name}</Link>
              <p className="mt-0.5 flex flex-wrap items-baseline gap-1.5"><span className="text-[13px] font-bold tabular-nums text-ink-900">{inr(p.salePrice)}</span>{p.mrp > p.salePrice && <span className="text-[11px] text-ink-300 line-through tabular-nums">{inr(p.mrp)}</span>}{p.discountPercent > 0 && <span className="text-[11px] font-bold text-emerald-600">↓{p.discountPercent}%</span>}</p>
            </div>
            <Button size="sm" onClick={() => { void add(p.id); void toggleWishlist(p.id); }}>Move to cart</Button>
            <button type="button" onClick={() => void toggleWishlist(p.id)} aria-label="Remove from wishlist" className="p-1.5 text-ink-300 hover:text-flame-600"><Trash2 className="size-4" /></button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Row({ k, v, good }: { k: string; v: string; good?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-400">{k}</dt>
      <dd className={`font-semibold tabular-nums ${good ? "text-emerald-600" : "text-ink-900"}`}>{v}</dd>
    </div>
  );
}