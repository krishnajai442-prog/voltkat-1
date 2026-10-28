"use client";

import { Plus, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { useCart } from "@/context/CartContext";
import { inr } from "@/lib/utils";

type Primary = {
  id: string;
  slug: string;
  name: string;
  image: string;
  salePrice: number;
};

type AddOn = {
  id: string;
  slug: string;
  name: string;
  image: string;
  salePrice: number;
};

export function FrequentlyBought({
  primary,
  addOns,
}: {
  primary: Primary;
  addOns: AddOn[];
}) {
  const toast = useToast();
  const { add } = useCart();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(addOns[0] ? [addOns[0].id] : []),
  );
  const [busy, setBusy] = useState(false);

  const selectedAddOns = addOns.filter((a) => selected.has(a.id));
  const total = primary.salePrice + selectedAddOns.reduce((s, a) => s + a.salePrice, 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function addBundle() {
    setBusy(true);

    try {
      await add(primary.id, 1);
      for (const a of selectedAddOns) {
        await add(a.id, 1);
      }

      toast.push({
        title: "Bundle added to cart",
        body: `${1 + selectedAddOns.length} item(s)`,
      });
    } finally {
      setBusy(false);
    }
  }

  if (!addOns.length) return null;

  return (
    <section className="card overflow-hidden">
      <header className="border-b border-hairline px-4 py-3">
        <h2 className="font-display text-[15px] font-bold text-ink-900">
          Frequently bought together
        </h2>
      </header>

      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/product/${primary.slug}`}
            className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-canvas"
          >
            <Image src={primary.image} alt={primary.name} fill sizes="80px" className="object-contain p-1" />
          </Link>

          <div className="min-w-0 flex-1">
            <Link href={`/product/${primary.slug}`} className="block truncate text-[13.5px] font-bold text-ink-900 hover:text-electric-600">
              {primary.name}
            </Link>
            <p className="mt-1 text-[13px] font-bold tabular-nums text-ink-900">
              {inr(primary.salePrice)}
            </p>
          </div>
        </div>

        {addOns.map((a) => (
          <div key={a.id} className="flex items-center gap-3 rounded-xl border border-hairline p-3">
            <label className="flex size-5 shrink-0 cursor-pointer items-center justify-center">
              <input
                type="checkbox"
                checked={selected.has(a.id)}
                onChange={() => toggle(a.id)}
                className="size-4 accent-electric-500"
              />
            </label>

            <Link
              href={`/product/${a.slug}`}
              className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-canvas"
            >
              <Image src={a.image} alt={a.name} fill sizes="64px" className="object-contain p-1" />
            </Link>

            <div className="min-w-0 flex-1">
              <Link href={`/product/${a.slug}`} className="block truncate text-[13px] font-semibold text-ink-900 hover:text-electric-600">
                {a.name}
              </Link>
              <p className="mt-0.5 text-[12.5px] font-bold tabular-nums text-ink-900">
                {inr(a.salePrice)}
              </p>
            </div>

            <Plus className="size-4 text-ink-300" />
          </div>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-wider text-ink-300">
              Bundle price
            </p>
            <p className="font-display text-xl font-bold tabular-nums text-ink-900">
              {inr(total)}
            </p>
          </div>

          <Button loading={busy} onClick={addBundle}>
            {!busy && <ShoppingCart className="size-4" />}
            Add bundle to cart
          </Button>
        </div>
      </div>
    </section>
  );
}