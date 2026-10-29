import prisma from "@/lib/prisma";
import { productSelect, toCards } from "@/lib/catalog";
import { inr } from "@/lib/utils";
import { Star } from "lucide-react";

export async function SponsoredStrip() {
  // Fetch 10 active products, then randomly pick 1
  const pool = await prisma.product.findMany({
    where: { active: true, stock: { gt: 0 } },
    select: productSelect,
    take: 10,
    orderBy: { ratingAvg: "desc" },
  });

  if (pool.length === 0) return null;

  // Shuffle and pick one
  const shuffled = pool.sort(() => Math.random() - 0.5);
  const product = shuffled[0];

  if (!product) return null;

  const card = toCards([product])[0];
  if (!card) return null;

  const discount = card.mrp > card.salePrice
    ? Math.round(((card.mrp - card.salePrice) / card.mrp) * 100)
    : 0;

  return (
    <section className="container-x mt-4" aria-label="Featured product">
      <a
        href={`/product/${card.slug}`}
        className="relative block overflow-hidden rounded-2xl border border-hairline bg-gradient-to-r from-[#e8f1ff] via-[#f4f9ff] to-[#e8f1ff] no-underline transition-shadow hover:shadow-lift"
      >
        <span className="absolute right-2 top-2 rounded bg-[#2874f0] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          Featured
        </span>
        <span className="flex items-center gap-4 p-4 sm:p-5">
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[16px] font-extrabold leading-tight text-ink-900 sm:text-[20px]">
              {card.name}
            </span>
            <span className="mt-1 flex items-baseline gap-2">
              <span className="text-[18px] font-bold tabular-nums text-ink-900 sm:text-[22px]">
                {inr(card.salePrice)}
              </span>
              {discount > 0 && (
                <>
                  <span className="text-[13px] text-ink-400 line-through tabular-nums">
                    {inr(card.mrp)}
                  </span>
                  <span className="text-[12px] font-bold text-emerald-600">
                    {discount}% off
                  </span>
                </>
              )}
            </span>
            {card.ratingAvg != null && (
              <span className="mt-1 inline-flex items-center gap-1 text-[12px] text-ink-600">
                <span className="rounded bg-emerald-600 px-1.5 py-0.5 font-bold text-white">
                  {Number(card.ratingAvg).toFixed(1)} <Star className="inline size-2.5 fill-white" />
                </span>
              </span>
            )}
            <span className="mt-2 inline-block text-[11px] font-bold uppercase tracking-wider text-[#2874f0]">
              View product →
            </span>
          </span>
          {card.image && (
            <span className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-white sm:h-28 sm:w-44">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.image}
                alt={card.name}
                className="size-full object-contain p-2"
                loading="lazy"
              />
            </span>
          )}
        </span>
      </a>
    </section>
  );
}
