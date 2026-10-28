"use client";

import { motion } from "framer-motion";
import { Bell, Heart, ShoppingCart, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/components/ui/Toaster";
import { inr } from "@/lib/utils";
import type { CardVM } from "@/lib/catalog";
import type { Offer } from "@prisma/client";

export function BuyBox({
  product,
  card,
  discount,
  savingsAmount,
  plans,
  offers,
}: {
  product: { id: string; stock: number; lowStockAt: number; returnableDays: number };
  card: CardVM;
  discount: number;
  savingsAmount: number;
  plans: { months: number; perMonth: number }[];
  offers: Offer[];
}) {
  const { add, toggleWishlist, inWishlist } = useCart();
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState<"cart" | "buy" | "wish" | null>(null);
  const out = product.stock === 0;
  const low = !out && product.stock <= product.lowStockAt;
  const wished = inWishlist(card.id);

  async function addToCart() {
    setBusy("cart");
    await add(card.id, 1);
    setBusy(null);
  }
  async function buyNow() {
    setBusy("buy");
    await add(card.id, 1);
    router.push(`/checkout?buy=${encodeURIComponent(card.id)}&upsell=1`);
  }
  async function wish() {
    setBusy("wish");
    await toggleWishlist(card.id);
    setBusy(null);
  }

  return (
    <motion.div layout className="card overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
          <span className="font-display text-[28px] font-bold leading-none tabular-nums text-ink-900 sm:text-3xl">
            {inr(card.salePrice)}
          </span>
          {card.mrp > card.salePrice && (
            <>
              <span className="text-[15px] tabular-nums text-ink-300 line-through">{inr(card.mrp)}</span>
              <span className="rounded-md bg-gradient-to-r from-flame-500 to-orange-deal px-2 py-0.5 text-[12px] font-bold text-white">
                {discount}% OFF
              </span>
            </>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px]">
          {savingsAmount > 0 && <Badge tone="save">You save {inr(savingsAmount)}</Badge>}
          <Badge tone="neutral">Incl. GST · {inr(Math.round(card.salePrice - card.salePrice / 1.18))} tax</Badge>
          {plans[0] && card.emiEligible && <Badge tone="info">EMI {inr(plans[0].perMonth)}/mo</Badge>}
        </div>

        <p className="mt-3 text-[13px] font-semibold">
          {out ? (
            <span className="text-flame-600">Out of Stock</span>
          ) : low ? (
            <span className="text-orange-600">Only {product.stock} left — order soon</span>
          ) : (
            <span className="text-emerald-600">In Stock — {product.stock} available</span>
          )}
        </p>

        {offers.length > 0 && (
          <ul className="mt-3 space-y-1.5 border-t border-hairline pt-3">
            {offers.slice(0, 3).map((o) => (
              <li key={o.id} className="flex gap-2 text-[12.5px] leading-snug text-ink-700">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-electric-500" />
                <span>
                  <strong>{o.title}.</strong> <span className="text-ink-400">{o.description}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex gap-2.5">
          {out ? (
            <button
              type="button"
              onClick={() =>
                toast.push({ title: "We'll notify you", body: "You'll be alerted the moment this is back in stock." })
              }
              className={cnBtn("flex-1 bg-[#2874f0] text-white hover:bg-[#1f5fc9]", false)}
            >
              <Bell className="size-4" />
              Notify Me
            </button>
          ) : (
            <>
              <button
                onClick={addToCart}
                disabled={busy !== null}
                className={cnBtn("flex-1 bg-ink-900 text-white hover:bg-electric-600", false)}
              >
                <ShoppingCart className="size-4" />
                {busy === "cart" ? "Adding…" : "Add to Cart"}
              </button>
              <button
                onClick={buyNow}
                disabled={busy !== null}
                className={cnBtn("flex-1 bg-amber-offer text-white hover:brightness-105", false)}
              >
                <Zap className="size-4" />
                {busy === "buy" ? "Working…" : "Buy Now"}
              </button>
            </>
          )}
          <button
            onClick={wish}
            aria-pressed={wished}
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            className={cnBtn("size-12 border border-hairline bg-white text-ink-400 hover:text-flame-500", false)}
          >
            <Heart className={cnFilled(wished)} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-hairline pt-3.5 text-center">
          {[
            { t: `${product.returnableDays}-day`, d: "Replacement" },
            { t: card.codEligible ? "COD" : "Prepaid", d: card.codEligible ? "Available" : "Only" },
            { t: `${card.warrantyMonths} mo`, d: "Warranty" },
          ].map((x) => (
            <div key={x.t}>
              <p className="text-[12.5px] font-bold text-ink-900">{x.t}</p>
              <p className="text-[10.5px] text-ink-400">{x.d}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 bg-canvas px-4 py-2.5 text-[11.5px] text-ink-400">
        <span>Secure payments · Razorpay PCI-DSS</span>
        <button
          onClick={() => {
            void navigator.clipboard?.writeText(location.href);
            toast.push({ tone: "info", title: "Link copied", body: "Share this product with anyone." });
          }}
          className="font-bold text-electric-600 hover:underline"
        >
          Share
        </button>
      </div>
    </motion.div>
  );
}

function cnBtn(base: string, disabled: boolean) {
  return `inline-flex h-12 items-center justify-center gap-2 rounded-xl text-[13.5px] font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${base}`;
}
function cnFilled(wished: boolean) {
  return `size-4.5 ${wished ? "fill-current text-flame-500" : ""}`;
}