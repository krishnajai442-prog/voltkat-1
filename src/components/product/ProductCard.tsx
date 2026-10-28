"use client";

import { Heart, ShoppingCart, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RatingPill } from "@/components/ui/Rating";
import { useCart } from "@/context/CartContext";
import type { CardVM } from "@/lib/catalog";
import { cn, emiPlans, inr } from "@/lib/utils";

export function ProductCard({
  product,
  priority = false,
  compact = false,
  showBuyNow = true,
}: {
  product: CardVM;
  priority?: boolean;
  compact?: boolean;
  showBuyNow?: boolean;
}) {
  const router = useRouter();
  const { add, toggleWishlist, inWishlist } = useCart();
  const [busy, setBusy] = useState<null | "cart" | "buy" | "wish">(null);

  const out = product.stock <= 0;
  const wished = inWishlist(product.id);
  const plan = emiPlans(product.salePrice)[0];

  async function handleAdd() {
    setBusy("cart");
    await add(product.id, 1);
    setBusy(null);
  }

  async function handleBuy() {
    setBusy("buy");
    await add(product.id, 1);
    router.push("/checkout");
  }

  async function handleWish() {
    setBusy("wish");
    await toggleWishlist(product.id);
    setBusy(null);
  }

  return (
    <article
      className={cn(
        "group card relative flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lift",
        compact && "text-[13px]",
      )}
    >
      <button
        type="button"
        onClick={handleWish}
        disabled={busy !== null}
        aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={wished}
        className="absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-full bg-white/90 text-ink-400 shadow transition-colors hover:text-flame-500 disabled:opacity-50"
      >
        <Heart
          className={cn("size-4", wished && "fill-current text-flame-500")}
        />
      </button>

      {product.discountPercent > 0 && (
        <span className="absolute left-2 top-2 z-10 rounded-md bg-gradient-to-r from-flame-500 to-orange-deal px-1.5 py-0.5 text-[10.5px] font-bold text-white shadow">
          {product.discountPercent}% OFF
        </span>
      )}

      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-square bg-canvas"
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          priority={priority}
          sizes={
            compact
              ? "(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
              : "(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 260px"
          }
          className="object-contain p-3 transition-transform duration-500 group-hover:scale-105"
        />

        {out && (
          <span className="absolute inset-0 grid place-items-center bg-white/70 text-[12px] font-bold text-flame-600">
            Out of stock
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col p-3">
        <p className="truncate text-[10.5px] font-bold uppercase tracking-wider text-ink-300">
          {product.brand}
        </p>

        <Link
          href={`/product/${product.slug}`}
          className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug text-ink-900 hover:text-electric-600"
        >
          {product.name}
        </Link>

        <div className="mt-1.5">
          <RatingPill value={product.ratingAvg} count={product.ratingCount} />
        </div>

        <div className="mt-auto pt-2">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-[15px] font-bold tabular-nums text-ink-900">
              {inr(product.salePrice)}
            </span>

            {product.mrp > product.salePrice && (
              <span className="text-[11.5px] text-ink-300 line-through tabular-nums">
                {inr(product.mrp)}
              </span>
            )}
          </div>

          {!compact && plan && (
            <p className="mt-0.5 text-[10.5px] font-semibold text-ink-400">
              EMI {inr(plan.perMonth)}/mo
            </p>
          )}

          <div className="mt-2.5 flex gap-1.5">
            <button
              type="button"
              onClick={handleAdd}
              disabled={out || busy !== null}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-ink-900 text-[11.5px] font-bold text-white transition-colors hover:bg-electric-600 disabled:opacity-50"
            >
              <ShoppingCart className="size-3.5" />
              {busy === "cart" ? "Adding…" : "Add"}
            </button>

            {showBuyNow && !compact && (
              <button
                type="button"
                onClick={handleBuy}
                disabled={out || busy !== null}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-amber-offer px-2.5 text-[11.5px] font-bold text-white transition-all hover:brightness-105 disabled:opacity-50"
              >
                <Zap className="size-3.5" />
                {busy === "buy" ? "…" : "Buy"}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}