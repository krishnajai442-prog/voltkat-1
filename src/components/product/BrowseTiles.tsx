import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Tile = { title: string; subtitle?: string; image?: string | null; href: string };

export function BrowseTiles({ title, tiles }: { title: string; tiles: Tile[] }) {
  if (!tiles.length) return null;
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 font-display text-[15px] font-bold text-gray-900">{title}</h2>
      {/* Horizontal pairing like the reference: two tiles per row on sm+ */}
      <div className="grid gap-2 sm:grid-cols-2">
        {tiles.map((t, i) => (
          <Link key={i} href={t.href} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-2.5 hover:border-gray-300">
            {t.image
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={t.image} alt="" className="size-12 shrink-0 rounded-lg border border-gray-200 bg-white object-contain" />
              : <div className="size-12 shrink-0 rounded-lg bg-gray-100" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-gray-900">{t.title}</p>
              {t.subtitle ? <p className="truncate text-[11.5px] text-gray-500">{t.subtitle}</p> : null}
            </div>
            <ChevronRight className="size-4 shrink-0 text-gray-400" />
          </Link>
        ))}
      </div>
    </section>
  );
}

export default BrowseTiles;