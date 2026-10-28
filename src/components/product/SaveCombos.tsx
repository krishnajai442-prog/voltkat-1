import Link from "next/link";
import { Plus } from "lucide-react";

export type ComboItem = { name?: string | null; image?: string | null; price?: number | null; slug?: string | null };
export type ComboPair = { primary: ComboItem; addOn: ComboItem };

const inr = (n?: number | null) =>
  typeof n === "number" && Number.isFinite(n) ? `₹${n.toLocaleString("en-IN")}` : "—";

export function SaveCombos({ pairs }: { pairs: ComboPair[] }) {
  if (!pairs.length) return null;
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 font-display text-[15px] font-bold text-gray-900">Save more with combos</h2>
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {pairs.map((c, i) => {
          const sum = (typeof c.primary.price === "number" ? c.primary.price : 0)
                    + (typeof c.addOn.price === "number" ? c.addOn.price : 0);
          return (
            <div key={i} className="flex w-[230px] shrink-0 flex-col rounded-xl border border-gray-200 p-3">
              <div className="relative mb-2 flex items-center justify-center gap-2">
                {[c.primary, c.addOn].map((it, k) => (
                  it.image
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img key={k} src={it.image} alt={it.name ?? ""} className="h-16 w-16 rounded-lg border border-gray-100 object-contain" />
                    : <div key={k} className="grid h-16 w-16 place-items-center rounded-lg bg-gray-50 text-gray-300">·</div>
                ))}
                <span className="absolute left-1/2 top-1/2 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-gray-500 shadow"><Plus className="size-3.5" /></span>
              </div>
              <p className="line-clamp-1 text-[12px] text-gray-500">{c.primary.name ?? "This product"} + {c.addOn.name ?? "add‑on"}</p>
              <p className="mt-1 text-[15px] font-bold text-gray-900">{inr(sum)} <span className="text-[11px] font-medium text-gray-400">for 2 items</span></p>
              {/* "Extra ₹X Combo Savings" intentionally omitted: no stored per-pair discount (see notes) */}
              {c.addOn.slug
                ? <Link href={`/product/${c.addOn.slug}`} className="mt-2 rounded-lg bg-amber-400 py-2 text-center text-[12.5px] font-bold text-gray-900 hover:bg-amber-300">Buy combo now</Link>
                : <span className="mt-2 rounded-lg bg-gray-100 py-2 text-center text-[12.5px] font-bold text-gray-400">Buy combo now</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default SaveCombos;