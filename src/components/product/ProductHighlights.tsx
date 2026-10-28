"use client";
import { useState } from "react";
import { ChevronDown, Cpu, HardDrive, Smartphone, Palette, ShieldCheck, RefreshCcw } from "lucide-react";

type Props = {
  ram?: string | null; storage?: string | null; processor?: string | null;
  screenSize?: string | null; color?: string | null;
  warrantyMonths?: number | null; returnableDays?: number | null;
};

export function ProductHighlights(p: Props) {
  const [open, setOpen] = useState(true);
  const rows = [
    p.ram && { icon: <Cpu className="size-4" />, text: p.ram + " RAM" },
    p.storage && { icon: <HardDrive className="size-4" />, text: p.storage + " Storage" },
    p.processor && { icon: <Cpu className="size-4" />, text: p.processor },
    p.screenSize && { icon: <Smartphone className="size-4" />, text: p.screenSize },
    p.color && { icon: <Palette className="size-4" />, text: "Colour: " + p.color },
    { icon: <ShieldCheck className="size-4" />, text: `${p.warrantyMonths ?? "—"} month(s) warranty` },
    { icon: <RefreshCcw className="size-4" />, text: `${p.returnableDays ?? 7}-day replacement` },
  ].filter(Boolean) as { icon: React.ReactNode; text: string }[];

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left">
        <span>
          <span className="font-display text-[15px] font-bold text-gray-900">Product highlights</span>
          <span className="mt-0.5 block text-[12px] text-gray-500">Key product attributes and feature details</span>
        </span>
        <ChevronDown className={`size-5 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="space-y-2.5 border-t border-gray-100 px-4 py-3.5">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center gap-3 text-[13.5px] text-gray-800">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#2874f0]/10 text-[#2874f0]">{r.icon}</span>
              <span className="font-medium">{r.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export default ProductHighlights;