import Link from "next/link";
import { Star } from "lucide-react";
import type { GridItem } from "@/lib/home-discovery";

const inr = (n?: number | null) => (typeof n === "number" && Number.isFinite(n) ? `₹${n.toLocaleString("en-IN")}` : "—");
const offPct = (mrp?: number | null, price?: number | null) =>
  typeof mrp === "number" && typeof price === "number" && mrp > 0 && price < mrp ? Math.round(((mrp - price) / mrp) * 100) : 0;

function MiniStars({ value }: { value?: number | null }) {
  const v = typeof value === "number" ? value : 0;
  return <span className="inline-flex items-center gap-px text-amber-400">{[1,2,3,4,5].map((i) => <Star key={i} className={`size-3 ${i <= Math.round(v) ? "fill-current" : "fill-none text-gray-300"}`} />)}</span>;
}

export function ProductGrid({ title, items }: { title: string; items: GridItem[] }) {
  if (!items.length) return null;
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 font-display text-[15px] font-bold text-gray-900">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((p) => {
          const off = offPct(p.mrp, p.price);
          return (
            <Link key={p.id} href={`/product/${p.slug}`} className="flex flex-col">
              <div className="relative mb-2 aspect-square overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                {p.image
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={p.image} alt={p.name} loading="lazy" className="size-full object-contain" />
                  : null}
                {typeof p.rating === "number" ? (
                  <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-white/95 px-1.5 py-0.5 text-[11px] font-semibold text-gray-900 shadow-sm">{p.rating.toFixed(1)} <MiniStars value={p.rating} /></span>
                ) : null}
              </div>
              {p.brand ? <p className="mb-0.5 truncate text-[10.5px] font-semibold uppercase tracking-wide text-gray-400">{p.brand}</p> : null}
              <p className="line-clamp-2 min-h-[2.1rem] text-[12.5px] font-medium leading-snug text-gray-900">{p.name}</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
                {off > 0 ? <span className="text-[12px] font-bold text-emerald-600">{off}% OFF</span> : null}
                {p.mrp && off > 0 ? <span className="text-[11.5px] text-gray-400 line-through">{inr(p.mrp)}</span> : null}
                <span className="text-[13px] font-bold text-gray-900">{inr(p.price)}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
export default ProductGrid;