import Link from "next/link";
import type { Tile } from "@/lib/home-discovery";

export function BrandSpotlight({ title, items }: { title: string; items: Tile[] }) {
  if (!items.length) return null;
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 font-display text-[15px] font-bold text-gray-900">{title}</h2>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-4">
        {items.map((b, i) => (
          <Link key={i} href={b.href} className="relative flex h-28 items-end overflow-hidden rounded-xl border border-gray-100 bg-gray-900">
            {b.image
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={b.image} alt={b.label} loading="lazy" className="absolute inset-0 size-full object-cover opacity-90" />
              : null}
            <div className="relative z-10 w-full bg-gradient-to-t from-black/70 to-transparent p-3">
              <p className="text-[14px] font-extrabold uppercase tracking-wide text-white">{b.label}</p>
              <p className="text-[12px] font-semibold text-white/90">{b.pill}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
export default BrandSpotlight;