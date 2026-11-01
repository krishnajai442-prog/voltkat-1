"use client";

import { useState, useEffect, Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { CardVM } from "@/lib/catalog";
import { DynamicAdSlot } from "@/components/home/DynamicAdSlot";
import { HOME_FEATURES, type FeatureKey } from "@/lib/home-features";

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!] as [T, T];
  }
  return arr;
}

type Curated = Partial<Record<FeatureKey, CardVM[]>>;

export function DynamicRails({
  deals,
  newArrivals,
  bestSellers,
  allProducts,
  curated = {},
}: {
  deals: CardVM[];
  newArrivals: CardVM[];
  bestSellers: CardVM[];
  allProducts: CardVM[];
  curated?: Curated;
}) {
  const [sections, setSections] = useState<any[]>([]);

  useEffect(() => {
    // Curated lists win (order preserved from admin); shuffled pool is the
    // fallback so empty rails still render something rather than collapsing.
    const poolDeals = shuffle(deals).slice(0, 10);
    const poolNew = shuffle(newArrivals).slice(0, 10);
    const poolBest = shuffle(bestSellers).slice(0, 10);
    const poolMixed = shuffle(allProducts).slice(0, 20);

    const itemsFor = (key: FeatureKey, fallback: CardVM[]) => {
      const c = curated[key];
      return c && c.length ? c : fallback;
    };

    setSections([
      { def: HOME_FEATURES[0], items: itemsFor("HOT_DEALS", poolDeals) },
      { def: HOME_FEATURES[1], items: itemsFor("BEST_SELLERS", poolBest) },
      { def: HOME_FEATURES[2], items: itemsFor("WISHLIST", poolMixed.slice(0, 8)) },
      { def: HOME_FEATURES[3], items: itemsFor("NEW_ARRIVALS", poolNew) },
      { def: HOME_FEATURES[4], items: itemsFor("TRENDING", poolMixed.slice(8, 16)) },
    ]);
  }, [deals, newArrivals, bestSellers, allProducts, curated]);

  if (!sections.length) return null;

  return (
    <div className="space-y-4 pb-8">
      {sections.map((section, idx) => (
        <Fragment key={section.def.key}>
          <section className="card overflow-hidden shadow-sm">
            <div className={cn("flex items-center justify-between px-4 py-2.5", section.def.bg)}>
              <h2 className={cn("font-display text-[15px] font-bold", section.def.text)}>
                {section.def.title}
              </h2>
              <Link
                href="/products/all"
                className={cn("text-xs font-semibold opacity-90 hover:opacity-100", section.def.text)}
              >
                VIEW ALL →
              </Link>
            </div>

            <div className="no-scrollbar grid grid-cols-2 gap-3 p-3 bg-white sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {section.items.map((p: CardVM) => (
                <Link
                  key={p.id}
                  href={`/product/${p.slug}`}
                  className="group relative"
                >
                  <div className="relative mb-2 aspect-square overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      sizes="160px"
                      className="object-contain p-2 transition-transform group-hover:scale-105"
                    />
                    {p.discountPercent > 0 && (
                      <span className="absolute bottom-1 left-1 rounded bg-green-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                        {p.discountPercent}% OFF
                      </span>
                    )}
                  </div>
                  <div className="px-1">
                    <p className="line-clamp-2 h-8 text-[12px] font-medium leading-tight text-gray-800">
                      {p.name}
                    </p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-[14px] font-bold text-gray-900">₹{p.salePrice}</span>
                      {p.mrp > p.salePrice && (
                        <span className="text-[10px] text-gray-400 line-through">₹{p.mrp}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
          {idx === 0 && <DynamicAdSlot />}
        </Fragment>
      ))}
    </div>
  );
}