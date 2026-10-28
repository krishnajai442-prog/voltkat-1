import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, Gift, RefreshCcw, Tags, Zap } from "lucide-react";
import prisma from "@/lib/prisma";
import { Badge } from "@/components/ui/Badge";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CopyCode } from "@/components/offers/CopyCode";
import { formatDate, inr, siteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Offers & Coupons",
  description: "Live bank offers, no-cost EMI, exchange bonuses and VoltKart coupon codes.",
  alternates: { canonical: siteUrl("/offers") },
};

export const dynamic = "force-dynamic";

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; tone: "info" | "save" | "warn" | "violet" | "deal" }> = {
  BANK: { label: "Bank Offer", icon: <CreditCard className="size-4" />, tone: "info" },
  EMI: { label: "No-Cost EMI", icon: <Zap className="size-4" />, tone: "save" },
  EXCHANGE: { label: "Exchange Bonus", icon: <RefreshCcw className="size-4" />, tone: "violet" },
  COMBO: { label: "Combo Savings", icon: <Gift className="size-4" />, tone: "warn" },
  FESTIVAL: { label: "Festival Sale", icon: <Zap className="size-4" />, tone: "deal" },
  DEAL: { label: "Deal", icon: <Tags className="size-4" />, tone: "warn" },
};

type OfferMeta = (typeof TYPE_META)[string];

const FALLBACK_META: OfferMeta = {
  label: "Deal",
  icon: <Tags className="size-4" />,
  tone: "warn",
};

export default async function OffersPage() {
  const now = new Date();

  const [offers, coupons] = await Promise.all([
    prisma.offer.findMany({
      where: {
        active: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      orderBy: { priority: "desc" },
      include: {
        category: { select: { name: true, slug: true } },
        brand: { select: { name: true, slug: true } },
        product: { select: { name: true, slug: true } },
      },
    }),
    prisma.coupon.findMany({
      where: {
        active: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { name: true, slug: true } },
        brand: { select: { name: true, slug: true } },
      },
    }),
  ]);

  return (
    <div className="container-x py-8">
      <SectionHeading
        eyebrow="Save more"
        title="Live offers & coupons"
        subtitle="Bank discounts, exchange bonuses, no-cost EMI and coupon codes applicable at checkout."
      />

      <section className="mt-6">
        <h2 className="mb-3 font-display text-lg font-bold text-ink-900">Coupon codes</h2>
        {coupons.length === 0 ? (
          <p className="card p-5 text-[13.5px] text-ink-400">No active coupons right now. Check back during sale events.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {coupons.map((c) => (
              <article key={c.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-bold tracking-wider text-ink-900">{c.code}</p>
                    <p className="mt-1 text-[13px] text-ink-400">{c.description ?? "Storewide savings"}</p>
                  </div>
                  <Badge tone="save">
                    {c.type === "PERCENT" ? `${c.value}%` : inr(c.value)}
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 text-[11.5px] text-ink-400">
                  <Badge tone="neutral">
                    {c.scope === "ALL" ? "All products" : c.scope === "CATEGORY" ? c.category?.name ?? "Category" : c.brand?.name ?? "Brand"}
                  </Badge>
                  {c.minOrderValue > 0 && <Badge tone="info">Min {inr(c.minOrderValue)}</Badge>}
                  {c.maxDiscount ? <Badge tone="warn">Max {inr(c.maxDiscount)}</Badge> : null}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-hairline pt-3">
                  <p className="text-[11.5px] text-ink-400">
                    {c.endsAt ? `Valid till ${formatDate(c.endsAt)}` : "Open offer"}
                  </p>
                  <CopyCode code={c.code} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold text-ink-900">Bank, EMI & exchange offers</h2>
        {offers.length === 0 ? (
          <p className="card p-5 text-[13.5px] text-ink-400">No active offers right now.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((o) => {
          const meta = TYPE_META[o.type] ?? FALLBACK_META;
              return (
                <article key={o.id} className="card p-4">
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-xl bg-electric-50 text-electric-600">
                      {meta.icon}
                    </span>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>

                  <h3 className="mt-3 font-display text-[15px] font-bold text-ink-900">{o.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-400">{o.description}</p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {o.bankName && <Badge tone="info">{o.bankName}</Badge>}
                    {o.category && (
                      <Link href={`/products/${o.category.slug}`} className="text-[11.5px] font-bold text-electric-600 hover:underline">
                        {o.category.name}
                      </Link>
                    )}
                    {o.brand && (
                      <Link href={`/products/all?brands=${o.brand.slug}`} className="text-[11.5px] font-bold text-electric-600 hover:underline">
                        {o.brand.name}
                      </Link>
                    )}
                    {o.product && (
                      <Link href={`/product/${o.product.slug}`} className="text-[11.5px] font-bold text-electric-600 hover:underline">
                        {o.product.name}
                      </Link>
                    )}
                  </div>

                  {o.endsAt && (
                    <p className="mt-3 border-t border-hairline pt-2.5 text-[11.5px] text-ink-400">
                      Ends {formatDate(o.endsAt)}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="card mt-8 p-5">
        <h2 className="font-display text-lg font-bold text-ink-900">How to use coupons</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[13.5px] text-ink-700">
          <li>Add eligible products to your cart.</li>
          <li>Open cart and enter the coupon code in the coupon box.</li>
          <li>Discount is validated on the server and reflected in the final payable amount.</li>
          <li>Proceed to checkout. Coupon is re-validated before order creation.</li>
        </ol>
      </section>
    </div>
  );
}