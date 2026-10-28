"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Plus, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { inr } from "@/lib/utils";
import type { CardVM } from "@/lib/catalog";

// Same picsum-403 guard as the cart/checkout rows: a truthy-but-dead URL degrades to a
// letter tile, never a broken icon.
function Thumb({ src, name }: { src: string; name: string }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) return <span aria-hidden className="grid size-full place-items-center bg-gray-100 text-[11px] font-bold text-gray-400">{(name || "V").slice(0, 2).toUpperCase()}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} loading="lazy" onError={() => setBad(true)} className="size-full object-contain p-1" />
  );
}

// Title is chosen by the tier that ACTUALLY returned data, so the literal
// "Frequently bought together" only appears when real orders back it.
const TITLE: Record<string, string> = {
  copurchase: "Frequently bought together",
  category: "Complete your order",
  brand: "Complete your order",
  global: "You may also like",
  none: "You may also like",
};

/**
 * Buy-now upsell interstitial. Rendered via a PORTAL to document.body at z-[100] so it
 * always paints above the app's fixed bottom tab bar (which previously covered the
 * Skip & Continue button when the sheet rendered deep inside the wizard's DOM).
 * Toggling + adds the accessory to cart AND scope; un-toggling removes it from the
 * scope and from the cart ONLY if this sheet added it. Zero candidates -> auto-continue.
 */
export function FrequentlyBoughtSheet({
  seedId,
  onContinue,
  onAbort,
}: {
  seedId: string;
  onContinue: (ids: string[]) => void;
  onAbort: () => void;
}) {
  const { add, remove, items, ready } = useCart();
  const [cands, setCands] = useState<CardVM[] | null>(null);
  const [scope, setScope] = useState<string>("none");
  const [groupName, setGroupName] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addedHere, setAddedHere] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);
  const settled = useRef(false);

  useEffect(() => { const t = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(t); }, []);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    fetch(`/api/feed/upsell?id=${encodeURIComponent(seedId)}&n=4`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!alive) return;
        const list = (j?.products ?? []) as CardVM[];
        setCands(list);
        setScope(typeof j?.scope === "string" ? j.scope : "none");
        setGroupName(typeof j?.groupName === "string" ? j.groupName : null);
        if (list.length === 0 && !settled.current) { settled.current = true; onContinue([seedId]); }
      })
      .catch(() => { if (alive) { setCands([]); if (!settled.current) { settled.current = true; onContinue([seedId]); } } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, seedId]);

  async function toggle(p: CardVM) {
    if (selected.has(p.id)) {
      setSelected((s) => { const n = new Set(s); n.delete(p.id); return n; });
      if (addedHere.has(p.id)) { setAddedHere((s) => { const n = new Set(s); n.delete(p.id); return n; }); await remove(p.id); }
      return;
    }
    const inCart = items.some((i) => i.productId === p.id && !i.savedForLater);
    if (!inCart) { await add(p.id, 1); setAddedHere((s) => new Set(s).add(p.id)); }
    setSelected((s) => new Set(s).add(p.id));
  }

  function skipAndContinue() {
    if (settled.current) return; settled.current = true;
    onContinue([seedId, ...Array.from(selected)]);
  }

  if (typeof document === "undefined") return null; // SSR safety; state-gated anyway

  const subtitle =
    scope === "copurchase" ? "From real VoltKart orders" :
    scope === "category" && groupName ? `More in ${groupName}` :
    scope === "brand" && groupName ? `More from ${groupName}` :
    "Add-ons for your order";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      <button type="button" aria-label="Close" onClick={onAbort} className="absolute inset-0 bg-black/40" />
      <div
        className={`relative flex max-h-[82vh] flex-col rounded-t-2xl bg-white shadow-2xl transition-transform duration-300 ${mounted ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="flex items-center gap-3 border-b border-hairline px-4 py-3.5">
          <button type="button" onClick={onAbort} aria-label="Close" className="grid size-8 place-items-center rounded-lg text-ink-500 hover:bg-canvas"><X className="size-5" /></button>
          <div className="min-w-0">
            <h2 className="font-display text-[16px] font-bold text-ink-900">{TITLE[scope] ?? TITLE.none}</h2>
            <p className="truncate text-[12px] text-ink-400">{subtitle}</p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {cands === null ? (
            <div className="space-y-3 p-4">{[0,1,2].map((i)=><div key={i} className="h-20 w-full animate-pulse rounded-xl bg-canvas" />)}</div>
          ) : cands.length === 0 ? (
            <p className="p-6 text-center text-[13px] text-ink-400">No add-ons to suggest right now.</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {cands.map((p) => {
                const on = selected.has(p.id);
                const d = p.mrp > p.salePrice ? Math.round(((p.mrp - p.salePrice) / p.mrp) * 100) : 0;
                return (
                  <li key={p.id} className="flex items-center gap-3 p-4">
                    <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-canvas"><Thumb src={p.image} name={p.name} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink-900">{p.name}</p>
                      <p className="mt-1 flex flex-wrap items-baseline gap-1.5">
                        <span className="text-[13px] font-bold tabular-nums text-ink-900">{inr(p.salePrice)}</span>
                        {d > 0 && <span className="text-[11px] text-ink-300 line-through tabular-nums">{inr(p.mrp)}</span>}
                        {d > 0 && <span className="text-[11px] font-bold text-emerald-600">↓{d}%</span>}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void toggle(p)}
                      aria-pressed={on}
                      className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-[12.5px] font-bold transition-colors ${on ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-[#2874f0] text-white hover:bg-[#1f5fc9]"}`}
                    >
                      {on ? <><Check className="size-4" /> Added</> : <><Plus className="size-4" /> Add</>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-hairline p-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]">
          <button
            type="button"
            onClick={skipAndContinue}
            className="w-full rounded-xl bg-amber-offer py-3.5 text-[14px] font-black uppercase tracking-wide text-white transition-all hover:brightness-105"
          >
            Skip &amp; Continue
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}