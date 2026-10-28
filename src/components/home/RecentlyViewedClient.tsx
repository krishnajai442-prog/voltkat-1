"use client";

import { useEffect, useState } from "react";
import { lsRead } from "@/context/CartContext";
import { ProductCard } from "@/components/product/ProductCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { CardVM } from "@/lib/catalog";

export function RecentlyViewedClient() {
  const [items, setItems] = useState<CardVM[]>([]);
  const [recs, setRecs] = useState<CardVM[]>([]);

  useEffect(() => {
    const viewed = lsRead<{ slug: string }[]>("vk_recently_viewed", []);
    if (!viewed.length) return;
    fetch(`/api/search?slugs=${encodeURIComponent(viewed.map((v) => v.slug).join(","))}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { items?: CardVM[] }) => setItems(d.items ?? []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!items.length) return;
    const brand = items[0]?.brand;
    if (!brand) return;
    fetch(`/api/search?brands=${encodeURIComponent(brand)}&limit=6`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { items?: CardVM[] }) =>
        setRecs((d.items ?? []).filter((p) => !items.some((i) => i.id === p.id))),
      )
      .catch(() => undefined);
  }, [items]);

  if (!items.length && !recs.length) return null;

  return (
    <>
      {items.length > 0 && (
        <section className="container-x mt-12">
          <SectionHeading eyebrow="Pick up where you left" title="Recently viewed" href="/account/wishlist" hrefLabel="Wishlist" />
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {items.map((p) => (
              <div key={p.id} className="w-[62%] shrink-0 sm:w-[38%] md:w-[30%] lg:w-[23.5%] xl:w-[19%]">
                <ProductCard product={p} compact />
              </div>
            ))}
          </div>
        </section>
      )}
      {recs.length > 0 && (
        <section className="container-x mt-12">
          <SectionHeading eyebrow="For you" title="Recommended based on your browsing" href="/products/all?sort=popular" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {recs.map((p) => (
              <ProductCard key={p.id} product={p} compact />
            ))}
          </div>
        </section>
      )}
    </>
  );
}