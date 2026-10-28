"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { RatingPill } from "@/components/ui/Rating";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/components/ui/Toaster";
import type { CardVM } from "@/lib/catalog";
import { inr, savings } from "@/lib/utils";

function msToMidnight(): number {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return Math.max(0, end.getTime() - now.getTime());
}

export function DealOfTheDay({
  deal,
  runners,
}: {
  deal: CardVM;
  runners: CardVM[];
}) {
  const router = useRouter();
  const { add } = useCart();
  const toast = useToast();
  const [remaining, setRemaining] = useState(msToMidnight());
  const [busy, setBusy] = useState<"cart" | "grab" | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(msToMidnight()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const totalSeconds = Math.floor(remaining / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const claimedBase = Math.max(1, deal.sold + deal.stock);
  const pct = Math.min(94, Math.round((deal.sold / claimedBase) * 100));

  async function addToCart() {
    setBusy("cart");
    await add(deal.id, 1);
    setBusy(null);
  }

  async function grabDeal() {
    setBusy("grab");
    await add(deal.id, 1);
    toast.push({ title: "Deal grabbed", body: "Taking you to checkout…" });
    router.push("/checkout");
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-hairline bg-gradient-to-r from-flame-500/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-flame-500 text-white">
            ⚡
          </span>
          <div>
            <h2 className="font-display text-base font-bold text-ink-900">
              Deal of the Day
            </h2>
            <p className="text-[11px] text-ink-400">
              One flagship price, until midnight
            </p>
          </div>
        </div>

        <div
          className="flex items-center gap-1.5"
          aria-label={`${h} hours ${m} minutes remaining`} suppressHydrationWarning
        >
          {[h, m, s].map((v, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span suppressHydrationWarning className="grid h-8 min-w-8 place-items-center rounded-lg bg-ink-900 text-[13px] font-bold tabular-nums text-white">
                {String(v).padStart(2, "0")}
              </span>
              {i < 2 && <span className="text-ink-300">:</span>}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-5 p-4 sm:grid-cols-[minmax(0,15rem)_1fr] sm:p-5">
        <Link
          href={`/product/${deal.slug}`}
          className="group relative block aspect-square overflow-hidden rounded-2xl bg-canvas"
        >
          <Image
            src={deal.image}
            alt={deal.name}
            fill
            sizes="240px"
            className="object-contain p-3 transition-transform duration-500 group-hover:scale-105"
          />
          <Badge
            tone="deal"
            className="absolute left-2 top-2 bg-flame-500 text-white ring-0"
          >
            {deal.discountPercent}% OFF
          </Badge>
        </Link>

        <div className="flex flex-col">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-300">
            {deal.brand}
          </p>

          <Link
            href={`/product/${deal.slug}`}
            className="mt-1 font-display text-lg font-bold leading-snug text-ink-900 hover:text-electric-600 sm:text-xl"
          >
            {deal.name}
          </Link>

          <div className="mt-2 flex items-center gap-3">
            <RatingPill value={deal.ratingAvg} count={deal.ratingCount} />
            <span className="text-[12px] text-ink-400">
              {deal.sold.toLocaleString("en-IN")} sold
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-baseline gap-2">
            <span className="font-display text-2xl font-bold tabular-nums text-ink-900">
              {inr(deal.salePrice)}
            </span>
            <span className="text-sm text-ink-300 line-through tabular-nums">
              {inr(deal.mrp)}
            </span>
            <Badge tone="save">
              You save {inr(savings(deal.mrp, deal.salePrice))}
            </Badge>
          </div>

          <div className="mt-4 max-w-sm">
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold">
              <span className="text-ink-400">Stock claimed</span>
              <span className="text-flame-600">{pct}%</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-ink-900/8">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-flame-500 to-orange-deal"
              />
            </div>

            <p className="mt-1.5 text-[11.5px] text-ink-400">
              {deal.stock <= deal.lowStockAt
                ? `Hurry — only ${deal.stock} left`
                : `${deal.stock} units available`}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={addToCart}
              disabled={busy !== null || deal.stock <= 0}
              className="h-11 rounded-xl bg-ink-900 px-6 text-[13.5px] font-bold text-white transition-colors hover:bg-electric-600 disabled:opacity-50"
            >
              {busy === "cart" ? "Adding…" : "Add to Cart"}
            </button>

            <button
              onClick={grabDeal}
              disabled={busy !== null || deal.stock <= 0}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-amber-offer px-6 text-[13.5px] font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              <Zap className="size-4" />
              {busy === "grab" ? "Working…" : "Grab Deal"}
            </button>

            <Link
              href={`/product/${deal.slug}`}
              className="inline-flex h-11 items-center rounded-xl border border-hairline px-5 text-[13.5px] font-semibold text-ink-700 hover:border-electric-300"
            >
              View details
            </Link>
          </div>
        </div>
      </div>

      {runners.length > 0 && (
        <div className="grid gap-3 border-t border-hairline p-4 sm:grid-cols-3 sm:p-5">
          {runners.slice(0, 3).map((p) => (
            <Link
              key={p.id}
              href={`/product/${p.slug}`}
              className="group flex items-center gap-3 rounded-xl border border-hairline p-2.5 transition-colors hover:border-electric-300"
            >
              <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-canvas">
                <Image
                  src={p.image}
                  alt={p.name}
                  fill
                  sizes="64px"
                  className="object-contain p-1"
                />
              </span>

              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-semibold text-ink-900">
                  {p.name}
                </span>
                <span className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-[13px] font-bold tabular-nums">
                    {inr(p.salePrice)}
                  </span>
                  <span className="text-[11px] font-bold text-mint-500">
                    {p.discountPercent}% off
                  </span>
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}