import Link from "next/link";
import type { DealTile } from "@/lib/home-discovery";

const inr = (n?: number | null) => (typeof n === "number" && Number.isFinite(n) ? `₹${n.toLocaleString("en-IN")}` : "");

export function CategoryDealRow({ title, items }: { title: string; items: DealTile[] }) {
  if (!items.length) return null;
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 font-display text-[15px] font-bold text-gray-900">{title}</h2>
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((t, i) => (
          <Link key={i} href={t.href} className="flex w-[110px] shrink-0 flex-col items-center gap-1">
            <div className="size-[88px] overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
              {t.image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={t.image} alt={t.label} loading="lazy" className="size-full object-contain" />
                : <div className="size-full" />}
            </div>
            <p className="line-clamp-1 text-[12px] font-semibold text-gray-900">{t.label}</p>
            {t.price != null ? <p className="text-[12px] font-bold text-gray-700">{inr(t.price)}</p> : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
export default CategoryDealRow;