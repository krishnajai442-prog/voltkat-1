"use client";

import { useState } from "react";
import { ChevronDown, Star, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toaster";
import { inr } from "@/lib/utils";

// Subset of the wizard's CheckoutLine; extra props on a passed variable are allowed,
// so the wizard can hand it a full CheckoutLine unchanged.
type RowLine = {
  productId: string;
  name: string;
  image: string;
  mrp: number;
  salePrice: number;
  quantity: number;
  lineTotal: number;
  stock: number;
  color?: string | null;        // lights up once the Product column is confirmed (capture)
  ratingAvg?: number | null;    // now populated by the quote.ts thread (A)
  ratingCount?: number | null;  // ditto
  protectFee?: number | null;
};

const QTY_CAP = 10; // matches CartContext.setQty's cap; raise it there to allow more

function RowThumb({ src, name }: { src: string; name: string }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) {
    return (
      <span className="grid size-full place-items-center bg-gray-100 text-[11px] font-bold text-gray-400">
        {(name || "V").slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} className="size-full object-contain p-1" onError={() => setBad(true)} />
  );
}

function Stars({ avg }: { avg: number }) {
  const full = Math.round(avg);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Rated ${avg.toFixed(1)} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} className={`size-3.5 ${i < full ? "fill-emerald-600 text-emerald-600" : "fill-gray-200 text-gray-200"}`} />
      ))}
    </span>
  );
}

export function CheckoutLineRow({
  line,
  onQty,
  onRemove,
  deliveryLabel,
}: {
  line: RowLine;
  onQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  deliveryLabel: string;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [draft, setDraft] = useState(String(line.quantity));

  const d = line.mrp > line.salePrice ? Math.round(((line.mrp - line.salePrice) / line.mrp) * 100) : 0;
  const max = Math.max(1, Math.min(line.stock, QTY_CAP));

  function commit(n: number) {
    const v = Math.max(1, Math.min(max, Math.floor(n) || 1));
    onQty(line.productId, v); // -> context setQty -> re-quote -> totals/sticky/price-block update live
    setOpen(false);
    setModal(false);
    toast.push({ tone: "success", title: "Quantity updated", body: `${line.name} → ${v}` });
  }

  return (
    <div className="flex items-start gap-3 p-4">
      <span className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-canvas">
        <RowThumb src={line.image} name={line.name} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-bold leading-snug text-ink-900">{line.name}</p>
        {line.color && <p className="mt-0.5 text-[12px] text-gray-500">{line.color}</p>}
        {line.ratingAvg != null && (
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px]">
            <Stars avg={line.ratingAvg} />
            <span className="font-semibold text-ink-700">{line.ratingAvg.toFixed(1)}</span>
            <span className="text-gray-500">· ({(line.ratingCount ?? 0).toLocaleString("en-IN")})</span>
          </p>
        )}
        <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {d > 0 && <span className="text-[13px] font-bold text-emerald-600">↓{d}%</span>}
          {d > 0 && <span className="text-[12.5px] text-ink-300 line-through">{inr(line.mrp * line.quantity)}</span>}
          <span className="rounded bg-[#e0218a] px-1.5 py-0.5 text-[14px] font-bold text-white">{inr(line.lineTotal)}</span>
        </p>
        {line.protectFee ? (
          <p className="mt-1 text-[11.5px] text-gray-500">+ {inr(line.protectFee)} Protect Promise Fee</p>
        ) : null}

        {/* video-style Qty dropdown (1 / 2 / more…) — inc/dec, replaces the old read-only pill */}
        <div className="relative mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={open}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1 text-[12.5px] font-semibold text-ink-800 hover:bg-gray-50"
          >
            Qty: {line.quantity} <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => onRemove(line.productId)}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink-400 hover:text-flame-600"
          >
            <Trash2 className="size-3.5" /> Remove
          </button>

          {open && (
            <>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="fixed inset-0 z-10 cursor-default" />
              <ul role="listbox" className="absolute left-0 top-9 z-20 w-24 overflow-hidden rounded-lg border border-hairline bg-white py-1 shadow-lg">
                {[1, 2].filter((n) => n <= max).map((n) => (
                  <li key={n}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={line.quantity === n}
                      onClick={() => commit(n)}
                      className={`block w-full px-3 py-1.5 text-left text-[13px] hover:bg-canvas ${line.quantity === n ? "font-bold text-electric-700" : "text-ink-700"}`}
                    >
                      {n}
                    </button>
                  </li>
                ))}
                {max > 2 && (
                  <li>
                    <button
                      type="button"
                      onClick={() => { setDraft(String(line.quantity)); setModal(true); setOpen(false); }}
                      className="block w-full px-3 py-1.5 text-left text-[13px] text-ink-700 hover:bg-canvas"
                    >
                      more…
                    </button>
                  </li>
                )}
              </ul>
            </>
          )}
        </div>

        <p className="mt-2 text-[12.5px] font-semibold text-ink-700">Delivery by {deliveryLabel}</p>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="font-display text-[15px] font-bold text-ink-900">Enter Quantity</h3>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={max}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="mt-3 h-11 w-full rounded-xl border border-hairline px-3 text-[14px] font-semibold outline-none focus:border-electric-400"
            />
            <p className="mt-1 text-[11px] text-ink-400">
              Available: {line.stock}{line.stock > QTY_CAP ? ` (cart caps at ${QTY_CAP})` : ""}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setModal(false)} className="rounded-lg px-4 py-2 text-[13px] font-bold text-ink-500 hover:bg-canvas">CANCEL</button>
              <button type="button" onClick={() => commit(Number(draft))} className="rounded-lg px-4 py-2 text-[13px] font-bold text-electric-700 hover:bg-electric-50">APPLY</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}