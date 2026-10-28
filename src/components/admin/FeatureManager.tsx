"use client";

import { Settings2, Search as SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { HOME_FEATURES } from "@/lib/home-features";

type Product = { id: string; name: string };
type Sections = Record<string, Product[]>;

// Any-word substring match: split query on whitespace, succeed if SOME token is
// contained in the lowercased product name. "rog" finds ASUS ROG, "bespoke" finds
// Samsung Bespoke AC — no need to type the full 120-character name.
function matchesAnyWord(haystack: string, query: string): boolean {
  const h = haystack.toLowerCase();
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  return tokens.some((t) => h.includes(t));
}

export function FeatureManager({ products, initial }: { products: Product[]; initial: Sections }) {
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState<Sections>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  // LIVE search: the checkbox list filters on every keystroke from this state.
  // The Search button / Enter only normalize (trim) the query — matching never
  // waits for a click. (The old `applied` state that gated filtering is gone.)
  const [queries, setQueries] = useState<Record<string, string>>({});

  async function save(section: string) {
    setBusy(section);
    try {
      const res = await fetch("/api/admin/features", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, productIds: state[section]?.map((p) => p.id) ?? [] }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Save failed");
      const title = HOME_FEATURES.find((f) => f.key === section)?.title ?? section;
      toast.push({ title: `${title} updated` });
      router.refresh();
    } catch (e) {
      toast.push({ tone: "error", title: "Save failed", body: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(null);
    }
  }

  function toggle(section: string, product: Product) {
    setState((prev) => {
      const list = prev[section] ?? [];
      const exists = list.some((p) => p.id === product.id);
      const next = exists
        ? list.filter((p) => p.id !== product.id)
        : [...list, product].slice(0, 24);
      return { ...prev, [section]: next };
    });
  }

  function normalize(section: string) {
    setQueries((prev) => ({ ...prev, [section]: (prev[section] ?? "").trim() }));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {HOME_FEATURES.map((def) => {
        const list = state[def.key] ?? [];
        const q = (queries[def.key] ?? "").trim();
        const visibleProducts = q
          ? products.filter((p) => matchesAnyWord(p.name, q))
          : products;

        return (
          <section key={def.key} className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
                <Settings2 className="size-4 text-electric-600" /> {def.title}
              </h2>
              <Button size="sm" loading={busy === def.key} onClick={() => void save(def.key)}>
                Save
              </Button>
            </div>

            <p className="mb-3 text-[11.5px] text-ink-400">{def.help}</p>

            <div className="mb-3 flex flex-wrap gap-1.5">
              {list.length === 0 && <p className="text-[12.5px] text-ink-400">No curated products yet.</p>}
              {list.map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full bg-electric-50 px-2.5 py-1 text-[11.5px] font-bold text-electric-700">
                  {p.name}
                  <button onClick={() => toggle(def.key, p)} aria-label="Remove" className="text-electric-500 hover:text-flame-600">×</button>
                </span>
              ))}
            </div>

            <div className="mb-2 flex gap-2">
              <input
                value={queries[def.key] ?? ""}
                onChange={(e) => setQueries((prev) => ({ ...prev, [def.key]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); normalize(def.key); }
                }}
                placeholder="Search products (any word matches, e.g. rog, bespoke)"
                className="h-9 flex-1 rounded-lg border border-hairline px-2.5 text-[12.5px] outline-none focus:border-electric-400"
              />
              <button
                type="button"
                onClick={() => normalize(def.key)}
                className="inline-flex items-center gap-1 rounded-lg bg-electric-600 px-3 text-[12px] font-bold text-white hover:bg-electric-700"
              >
                <SearchIcon className="size-3.5" /> Search
              </button>
              {q && (
                <button
                  type="button"
                  onClick={() => setQueries((prev) => ({ ...prev, [def.key]: "" }))}
                  className="rounded-lg border border-hairline px-3 text-[12px] font-semibold text-ink-600 hover:bg-ink-50"
                >
                  Clear
                </button>
              )}
            </div>
            {q && (
              <p className="mb-1 text-[11px] text-ink-400">
                Showing {visibleProducts.length} of {products.length} matching “{q}”
              </p>
            )}

            <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-hairline p-2">
              {visibleProducts.length === 0 && (
                <p className="p-2 text-[12.5px] text-ink-400">No products match your search.</p>
              )}
              {visibleProducts.map((p) => {
                const checked = list.some((x) => x.id === p.id);
                return (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2 text-[12.5px]">
                    <input type="checkbox" checked={checked} onChange={() => toggle(def.key, p)} className="size-3.5 accent-electric-500" />
                    <span className="truncate">{p.name}</span>
                  </label>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}