import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Tile } from "@/lib/home-discovery";

const TONE: Record<string, string> = {
  green: "bg-emerald-50/70 border-emerald-100",
  peach: "bg-orange-50/70 border-orange-100",
  plain: "bg-white border-gray-200",
};

export function CollectionGrid({ title, tiles, tone = "plain", columns = 2, arrow = true }: {
  title: string; tiles: Tile[]; tone?: keyof typeof TONE; columns?: 2 | 4; arrow?: boolean;
}) {
  if (!tiles.length) return null;
  return (
    <section className={`rounded-2xl border p-4 ${TONE[tone]}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-[15px] font-bold text-gray-900">{title}</h2>
        {arrow ? <Link href={tiles[0]!.href} className="grid size-7 place-items-center rounded-full bg-gray-900 text-white"><ArrowRight className="size-4" /></Link> : null}
      </div>
      <div className={`grid gap-3 ${columns === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
        {tiles.map((t, i) => (
          <Link key={i} href={t.href} className="flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white">
            <div className="aspect-square bg-gray-50">
              {t.image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={t.image} alt={t.label} loading="lazy" className="size-full object-contain" />
                : <div className="size-full" />}
            </div>
            <div className="px-2 py-2">
              <p className="truncate text-[11px] text-gray-500">{t.label}</p>
              <p className="text-[13px] font-bold text-gray-900">{t.pill}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
export default CollectionGrid;