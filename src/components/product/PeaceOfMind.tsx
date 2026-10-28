"use client";
import { useState } from "react";
import { ChevronDown, RefreshCcw, Wallet, Lock, ShieldCheck } from "lucide-react";

export function PeaceOfMind({
  brandName, warrantyMonths, returnableDays, codEligible,
}: {
  brandName?: string | null; warrantyMonths?: number | null;
  returnableDays?: number | null; codEligible?: boolean | null;
}) {
  const [open, setOpen] = useState(true);
  const cols = [
    { icon: <RefreshCcw className="size-5" />, label: `${returnableDays ?? 7}-day brand support` },
    codEligible
      ? { icon: <Wallet className="size-5" />, label: "Cash on Delivery" }
      : { icon: <Lock className="size-5" />, label: "Secure payments" },
    { icon: <ShieldCheck className="size-5" />, label: "VoltKart Assured" },
  ];
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left">
        <span className="font-display text-[15px] font-bold text-gray-900">Shop with peace of mind</span>
        <ChevronDown className={`size-5 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2.5 text-[13px] text-gray-800">
            <span className="grid size-9 shrink-0 place-items-center rounded bg-white text-[11px] font-black text-gray-700 shadow-sm">
              {(brandName ?? "VK").slice(0, 3).toUpperCase()}
            </span>
            <span className="font-medium">
              {warrantyMonths ? `${warrantyMonths} month(s) manufacturer warranty` : "Warranty as per brand policy"}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {cols.map((c, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="grid size-11 place-items-center rounded-full bg-[#2874f0]/10 text-[#2874f0]">{c.icon}</span>
                <span className="text-[11.5px] font-semibold leading-tight text-gray-700">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
export default PeaceOfMind;