import Link from "next/link";
import { Tag, Star, Cpu, HardDrive, Monitor, Server, ShieldCheck } from "lucide-react";

// Conforms to the page's house shape (base/peers with price/rating/screen/warranty/image).
// slug added so each column can link to /product/[slug]; optional so a missing slug degrades to plain text.
export type CompareItem = {
  id?: string;
  slug?: string;
  name?: string;
  price?: number | null;
  rating?: number | null;
  ram?: string | null;
  storage?: string | null;
  screen?: string | null;
  processor?: string | null;
  warranty?: number | null;
  image?: string | null;
};

const inr = (n?: number | null) =>
  typeof n === "number" && Number.isFinite(n) ? `₹${n.toLocaleString("en-IN")}` : "—";

const fmt = (v?: string | number | null) =>
  v == null || v === "" ? "—" : typeof v === "number" ? String(v) : v;

const band = (v?: number | null) =>
  v == null ? "" : v >= 4 ? "Very Good" : v >= 3 ? "Good" : v >= 2 ? "Average" : v > 0 ? "Poor" : "";

function MiniStars({ value }: { value?: number | null }) {
  const v = typeof value === "number" ? value : 0;
  return (
    <span className="inline-flex items-center gap-0.5 align-middle text-amber-400" aria-label={`${v} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`size-3 ${i <= Math.round(v) ? "fill-current" : "fill-none text-gray-300"}`} />
      ))}
    </span>
  );
}

// green when cheaper than the baseline column, muted red when pricier, none if equal/unknown
function PriceDelta({ base, other }: { base?: number | null; other?: number | null }) {
  if (typeof base !== "number" || typeof other !== "number" || !Number.isFinite(base) || !Number.isFinite(other) || base <= 0 || other === base) return null;
  const pct = Math.round((Math.abs(base - other) / base) * 100);
  const cheaper = other < base;
  return (
    <span className={`ml-1.5 inline-block rounded px-1.5 py-0.5 text-[10.5px] font-semibold ${cheaper ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
      {pct}% {cheaper ? "less" : "more"}
    </span>
  );
}

type RowDef = { key: string; label: string; Icon: typeof Tag; cell: (p: CompareItem) => React.ReactNode };

export function CompareBlock({ base, peers = [] }: { base?: CompareItem | null; peers?: (CompareItem | null | undefined)[] }) {
  // Defensive: drop falsy holes so an undefined entry can never reach the map and throw.
  const cols = ([base, ...(peers ?? [])].filter(Boolean) as CompareItem[]).slice(0, 3);
  if (!cols.length) return null;            // nothing to compare -> hide the block, never crash the page
  const baseline = cols[0]!;                // cols[0] exists (length>=1); ! silences noUncheckedIndexedAccess

  const rows: RowDef[] = [
    { key: "price", label: "Price", Icon: Tag, cell: (p) => (
        <span className="whitespace-nowrap font-bold text-gray-900">{inr(p.price)}<PriceDelta base={baseline.price} other={p.price} /></span>
      ) },
    { key: "rating", label: "Rating", Icon: Star, cell: (p) => (
        <span className="inline-flex flex-col items-center gap-0.5">
          <span className="inline-flex items-center gap-1"><span className="font-bold text-gray-900">{typeof p.rating === "number" ? p.rating.toFixed(1) : "—"}</span><MiniStars value={p.rating} /></span>
          {band(p.rating) ? <span className="text-[11px] font-semibold text-emerald-600">{band(p.rating)}</span> : null}
        </span>
      ) },
    { key: "ram", label: "RAM", Icon: Cpu, cell: (p) => <span className="font-semibold text-gray-900">{fmt(p.ram)}</span> },
    { key: "storage", label: "Storage", Icon: HardDrive, cell: (p) => <span className="font-semibold text-gray-900">{fmt(p.storage)}</span> },
    { key: "display", label: "Display / Capacity", Icon: Monitor, cell: (p) => <span className="font-semibold text-gray-900">{fmt(p.screen)}</span> },
    { key: "cpu", label: "Processor", Icon: Server, cell: (p) => <span className="font-semibold text-gray-900">{fmt(p.processor)}</span> },
    { key: "warranty", label: "Warranty", Icon: ShieldCheck, cell: (p) => <span className="font-semibold text-gray-900">{p.warranty != null ? `${p.warranty} months` : "—"}</span> },
  ];

  const colKey = (p: CompareItem, i: number) => p.id ?? p.slug ?? p.name ?? `c${i}`;

  const LabelCell = ({ children, tint }: { children: React.ReactNode; tint?: boolean }) => (
    <div className={`sticky left-0 z-10 flex w-[118px] shrink-0 items-center gap-2 px-3 py-3 text-[12.5px] font-medium text-gray-600 ${tint ? "bg-gray-50" : "bg-white"}`}>{children}</div>
  );
  const ValueCell = ({ children, tint }: { children: React.ReactNode; tint?: boolean }) => (
    <div className={`flex min-w-[140px] flex-1 items-center justify-center px-2 py-3 text-center text-[13px] ${tint ? "bg-gray-50" : ""}`}>{children}</div>
  );

  // the clickable column header (image + name + pills); plain block when no slug so it never 404s
  const ColHead = ({ p }: { p: CompareItem }) => {
    const inner = (
      <div className="flex w-full flex-col items-center gap-1.5 py-1">
        {p.image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={p.image} alt={p.name ?? ""} className="h-20 w-20 rounded-lg object-contain" />
          : <div className="grid h-20 w-20 place-items-center rounded-lg bg-gray-100 text-gray-300"><Monitor className="size-7" /></div>}
        <p className={`line-clamp-2 px-1 text-center text-[12px] font-semibold leading-tight text-gray-900 ${p.slug ? "group-hover/link:underline" : ""}`}>{p.name ?? "—"}</p>
      </div>
    );
    return p.slug
      ? <Link href={`/product/${p.slug}`} className="group/link block w-full">{inner}</Link>
      : inner;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* heading at the top of the card, matching the old "Compare with similar items" */}
      <h2 className="px-4 pb-1 pt-4 font-display text-[15px] font-bold text-gray-900">Compare with similar items</h2>

      <div className="overflow-x-auto">
        <div className="flex border-b border-gray-100">
          <LabelCell tint><span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Features</span></LabelCell>
          {cols.map((p, i) => {
            const isBase = i === 0;
            return (
              <ValueCell key={colKey(p, i)} tint>
                <div className="flex w-full flex-col items-center gap-1.5">
                  {isBase ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-2 py-0.5 text-[10.5px] font-bold text-white"><Star className="size-3 fill-current" /> BEST CHOICE</span>
                  ) : <span className="h-[22px]" />}
                  <ColHead p={p} />
                  {isBase ? <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10.5px] font-semibold text-violet-700 ring-1 ring-violet-100">Current</span> : <span className="h-[20px]" />}
                </div>
              </ValueCell>
            );
          })}
        </div>

        {rows.map((r, ri) => (
          <div key={r.key} className={`flex ${ri < rows.length - 1 ? "border-b border-gray-100" : ""}`}>
            <LabelCell><span className="grid size-6 shrink-0 place-items-center rounded-md bg-violet-50 text-violet-600"><r.Icon className="size-3.5" /></span><span className="leading-tight">{r.label}</span></LabelCell>
            {cols.map((p, i) => <ValueCell key={colKey(p, i)}>{r.cell(p)}</ValueCell>)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default CompareBlock;