"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Loader2, ShoppingCart, Zap } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/components/ui/Toaster";

export type PurchaseProduct = {
  id: string; slug: string; name: string; brand: string; category: string;
  subtype: string | null; hidePrice?: boolean; mrp: number; salePrice: number;
  discountPercent: number; stock: number; lowStockAt: number; ratingAvg: number;
  ratingCount: number; warrantyMonths: number; returnableDays: number;
  emiEligible: boolean; codEligible: boolean; exchangeEligible: boolean;
  ram: string | null; storage: string | null; screenSize: string | null;
  processor: string | null; color: string | null; shortDescription: string | null;
};

function useBuyHandlers(id: string, name: string) {
  const router = useRouter();
  const toast = useToast();
  const { add } = useCart();
  const [busy, setBusy] = useState<null | "cart" | "buy">(null);
  async function addToCart() {
    setBusy("cart");
    await add(id, 1);
    setBusy(null);
    toast.push({ title: "Added to cart", body: name });
  }
  async function buyNow() {
    setBusy("buy");
    await add(id, 1);
    router.push(`/checkout?buy=${encodeURIComponent(id)}&upsell=1`);
  }
  return { busy, addToCart, buyNow };
}

/**
 * Purchase bar. Mobile: fixed to the *visible* bottom (a JS pin cancels the
 * Android URL-bar collapse so it can't bob) and promoted to its own GPU layer
 * (max-md:will-change-transform) so it can't tear mid-scroll.
 * Desktop (md+): sticky to the viewport bottom INSIDE the buy-box column, so its
 * width equals that column and it releases/scrolls away when the buybox ends.
 * Out of stock: the two CTAs collapse into a single Flipkart-blue Notify Me.
 */
export function ProductBuyBar({ id, name, salePrice, stock }: {
  id: string; name: string; salePrice: number; stock: number;
}) {
  const { busy, addToCart, buyNow } = useBuyHandlers(id, name);
  const toast = useToast();
  const out = stock <= 0;
  const barRef = useRef<HTMLDivElement>(null);

  // Pin to the visible bottom on mobile: recompute the bar's offset on every
  // visual-viewport change (toolbar show/hide, keyboard) via rAF, so the
  // layout-vs-visual desync that makes a fixed bottom-0 bar bob is cancelled
  // frame-for-frame. translate3d also forces the GPU layer (kills scroll-tear).
  useEffect(() => {
    const el = barRef.current;
    const vv = window.visualViewport;
    if (!el || !vv) return;
    const mq = window.matchMedia("(max-width: 767px)");
    let raf = 0;
    const apply = () => {
      raf = 0;
      if (!mq.matches) { el.style.transform = ""; return; } // desktop = sticky, leave alone
      const gap = window.innerHeight - (vv.height + vv.offsetTop); // chrome covering the bottom
      el.style.transform = `translate3d(0, ${-gap}px, 0)`;
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(apply); };
    apply();
    vv.addEventListener("resize", schedule);
    vv.addEventListener("scroll", schedule);
    mq.addEventListener("change", schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      vv.removeEventListener("resize", schedule);
      vv.removeEventListener("scroll", schedule);
      mq.removeEventListener("change", schedule);
      el.style.transform = "";
    };
  }, []);

  return (
    <div ref={barRef} className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-gray-200 bg-white px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[0_-2px_12px_rgba(0,0,0,0.08)] max-md:will-change-transform md:sticky md:inset-x-auto md:bottom-0 md:z-30 md:mt-6 md:rounded-t-xl md:border-x md:border-t md:px-3 md:pt-2.5 md:pb-2.5 md:shadow-[0_-4px_16px_rgba(0,0,0,0.10)]">
      {out ? (
        <button
          type="button"
          onClick={() =>
            toast.push({ title: "We'll notify you", body: "You'll be alerted the moment this is back in stock." })
          }
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#2874f0] text-[14px] font-bold text-white transition-colors hover:bg-[#1f5fc9]"
        >
          <Bell className="size-4" />
          Notify Me
        </button>
      ) : (
        <>
          <button type="button" onClick={addToCart} disabled={busy !== null}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-ink-900 text-[14px] font-bold text-white transition-colors hover:bg-electric-600 disabled:opacity-50">
            {busy === "cart" ? <Loader2 className="size-4 animate-spin" /> : <ShoppingCart className="size-4" />}
            Add to Cart
          </button>
          <button type="button" onClick={buyNow} disabled={busy !== null}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-offer text-[14px] font-bold text-white transition-all hover:brightness-105 disabled:opacity-50">
            {busy === "buy" ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
            Buy now at ₹{Number(salePrice).toLocaleString("en-IN")}
          </button>
        </>
      )}
    </div>
  );
}

/** Inline buy-box content: stock status only (the bar moved to ProductBuyBar). */
export function ProductPurchasePanel(product: PurchaseProduct) {
  const out = product.stock <= 0;
  return (
    <div className="space-y-4">
      {out ? (
        <p className="rounded-xl bg-flame-500/10 px-3.5 py-2.5 text-[12.5px] font-bold text-flame-600">
          Out of stock. Check back soon or browse similar products below.
        </p>
      ) : product.stock <= product.lowStockAt ? (
        <p className="rounded-xl bg-amber-offer/10 px-3.5 py-2.5 text-[12.5px] font-bold text-amber-700">
          Only {product.stock} left in stock.
        </p>
      ) : (
        <p className="rounded-xl bg-mint-500/10 px-3.5 py-2.5 text-[12.5px] font-bold text-emerald-700">
          In stock · {product.stock} available
        </p>
      )}
    </div>
  );
}

export default ProductPurchasePanel;