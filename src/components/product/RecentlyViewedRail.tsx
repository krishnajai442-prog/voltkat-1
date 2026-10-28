"use client";

import { useEffect, useState } from "react";
import { ProductCarousel, type CarouselItem } from "@/components/product/ProductCarousel";

const KEY = "vk:recent:v1";

/**
 * Recently Viewed rail, placed after "You might be interested in".
 * - Account history (serverItems) wins when present.
 * - Otherwise renders the device-local history maintained on every PDP view,
 *   starting with the product being viewed — so logged-out mobile shows it too.
 * - Tolerates a missing/undefined `current` instead of silently rendering nothing.
 */
export function RecentlyViewedRail({ current, serverItems, eta }: {
  current?: CarouselItem | null;
  serverItems: CarouselItem[];
  eta?: string;
}) {
  const [items, setItems] = useState<CarouselItem[]>(serverItems ?? []);

  useEffect(() => {
    if (serverItems && serverItems.length > 0) return; // account history is the truth
    try {
      const raw = window.localStorage.getItem(KEY);
      const stored: CarouselItem[] = raw ? JSON.parse(raw) : [];
      const history = current
        ? [current, ...stored.filter((s) => s.id !== current.id)]
        : stored;
      const capped = history.slice(0, 10);
      if (current) window.localStorage.setItem(KEY, JSON.stringify(capped));
      if (capped.length > 0) setItems(capped);
    } catch {
      /* private mode / corrupt storage: leave whatever we had */
    }
  }, [current, serverItems]);

  if (items.length === 0) return null;
  return <ProductCarousel title="Recently Viewed" items={items} eta={eta} />;
}

export default RecentlyViewedRail;