"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SpecsTable, type Spec } from "@/components/product/SpecsTable";
import { ShowCaseDrawer } from "@/components/product/ShowCaseDrawer";

type Img = { url: string; alt?: string | null; kind?: "GALLERY" | "SHOWCASE" };
type SpecRow = Spec & { kind?: "SPEC" | "WARRANTY" | "MFG" };

type Props = {
  name: string;
  brandName?: string | null;
  categoryName?: string | null;
  subtype?: string | null;
  color?: string | null;
  ram?: string | null;
  storage?: string | null;
  screenSize?: string | null;
  processor?: string | null;
  warrantyMonths?: number | null;
  returnableDays?: number | null;
  images: Img[];
  specifications?: SpecRow[] | null;
};

type TabKey = "showcase" | "specs" | "warranty" | "mfg";

const TABS: { key: TabKey; label: string }[] = [
  { key: "showcase", label: "Showcase" },
  { key: "specs", label: "Specifications" },
  { key: "warranty", label: "Warranty" },
  { key: "mfg", label: "Manufacturer Info" },
];

// Banners previewed on the PDP before "Show More" (the rest live in the immersive view).
const COLLAPSED = 1;
// How much of the first banner the collapsed teaser reveals. Tune to taste.
const TEASER_MAX_H = "max-h-[55vh]";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[42%_58%] gap-3 border-b border-gray-100 py-2.5 text-[13px] last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

export function ProductDetails(props: Props) {
  const [tab, setTab] = useState<TabKey>("showcase");
  const [open, setOpen] = useState(true);
  const [showcaseOpen, setShowcaseOpen] = useState(false);
  const {
    name, brandName, categoryName, subtype, color, ram, storage,
    screenSize, processor, warrantyMonths, returnableDays, images, specifications,
  } = props;

  const allSpecs = specifications ?? [];
  const specRows   = allSpecs.filter((s) => (s.kind ?? "SPEC") === "SPEC");
  const warrantyDb = allSpecs.filter((s) => s.kind === "WARRANTY");
  const mfgDb      = allSpecs.filter((s) => s.kind === "MFG");
  const banners    = (images ?? []).filter((im) => (im.kind ?? "GALLERY") === "SHOWCASE");
  const teaser     = banners.slice(0, COLLAPSED);

  // Fallbacks = the old hardcoded text, used only until admin adds rows.
  const warrantyRows: [string, string][] = warrantyDb.length
    ? warrantyDb.map((s) => [s.label, s.value])
    : [
        ["Warranty Summary", warrantyMonths ? `${warrantyMonths} month(s) manufacturer warranty` : "As per brand policy"],
        ["Return Policy", returnableDays ? `${returnableDays}-day replacement window` : "7-day replacement window"],
        ["Covered in Warranty", "Manufacturing defects only"],
        ["Not Covered in Warranty", "Physical / water damage, misuse, accessories"],
        ["Brand Support", brandName ?? "VoltKart"],
      ];

  const mfgRows: [string, string][] = mfgDb.length
    ? mfgDb.map((s) => [s.label, s.value])
    : [
        ["Manufacturer", brandName ?? name],
        ["Marketed & Sold by", "VoltKart"],
        ["Country of Origin", "India"],
        ["Packed Quantity", "1"],
        ["Category", categoryName ?? "—"],
        ["Model", subtype ?? name],
      ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left"
      >
        <span className="font-display text-[15px] font-bold text-gray-900">All details</span>
        <ChevronDown className={`size-5 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
          <div className="flex gap-2 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  tab === t.key
                    ? "bg-gray-900 text-white"
                    : "border border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Showcase = full-bleed clamped teaser + Show More -> immersive full-screen view */}
          {tab === "showcase" && (
            <div>
              {banners.length ? (
                <>
                  {/* -mx-4 bleeds edge-to-edge (matches the video width); the clamp crops the
                      first banner to a teaser. shrink-0 on the img stops the flex column from
                      squashing it — without it max-h would compress, not crop. */}
                  <div className={`-mx-4 flex flex-col overflow-hidden ${TEASER_MAX_H}`}>
                    {teaser.map((im, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={im.url + i}
                        src={im.url}
                        alt={im.alt ?? (i === 0 ? name : "")}
                        draggable={false}
                        loading="eager"
                        className="block h-auto w-full shrink-0 select-none"
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowcaseOpen(true)}
                    className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white py-3 text-[13.5px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Show More <ChevronRight className="size-4 text-gray-500" />
                  </button>
                </>
              ) : (
                <p className="py-2 text-[12.5px] text-gray-400">No showcase banners added yet.</p>
              )}
            </div>
          )}

          {tab === "specs" && (
            <div className="pt-1">
              {specRows.length ? (
                <SpecsTable specifications={specRows} />
              ) : (
                <p className="py-3 text-[13px] text-gray-500">No detailed specifications listed.</p>
              )}
            </div>
          )}

          {tab === "warranty" && <div>{warrantyRows.map(([k, v]) => <Row key={k} label={k} value={v} />)}</div>}
          {tab === "mfg" && <div>{mfgRows.map(([k, v]) => <Row key={k} label={k} value={v} />)}</div>}
        </div>
      )}

      <ShowCaseDrawer
        images={banners.map((b) => b.url)}
        open={showcaseOpen}
        onClose={() => setShowcaseOpen(false)}
      />
    </div>
  );
}

export default ProductDetails;