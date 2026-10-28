"use client";

import { Pencil, Phone, Plus } from "lucide-react";
import type { AddressVM } from "@/lib/address-types";

/**
 * Flipkart-style saved address: a read-only "Deliver to:" card by default,
 * with a Change button that swaps it for the picker list. Owns only its own
 * open/closed state — selection lives in the checkout wizard.
 */
export function SavedAddressCard({ addresses, selectedId, onSelect, onAddNew }: {
  addresses: AddressVM[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAddNew: () => void;
}) {
  const [changing, setChanging] = useState(false);
  const current = addresses.find((a) => a.id === selectedId) ?? addresses[0] ?? null;
  if (!current) return null;

  if (!changing) {
    return (
      <div className="rounded-xl border border-hairline bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Deliver to</p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-[14px] font-bold text-ink-900">
              {current.fullName}
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-600">
                {current.label}
              </span>
              {current.isDefault && (
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                  Default
                </span>
              )}
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-400">
              {current.line1}
              {current.line2 ? `, ${current.line2}` : ""}, {current.city}, {current.state} — {current.pincode}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-700">
              <Phone className="size-3" /> {current.phone}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setChanging(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[12.5px] font-bold text-[#2874f0] transition-colors hover:border-[#2874f0] hover:bg-blue-50"
          >
            <Pencil className="size-3.5" /> Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-hairline bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Choose delivery address</p>
      <ul className="space-y-2">
        {addresses.map((a) => (
          <li key={a.id}>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                selectedId === a.id ? "border-[#2874f0] bg-blue-50/50" : "border-gray-200 hover:border-[#93c5fd]"
              }`}
            >
              <input
                type="radio"
                name="address"
                checked={selectedId === a.id}
                onChange={() => onSelect(a.id)}
                className="mt-1 size-4 accent-[#2874f0]"
              />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-bold text-ink-900">{a.fullName}</span>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-600">
                    {a.label}
                  </span>
                  {a.isDefault && (
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                      Default
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-[12.5px] leading-relaxed text-ink-400">
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} — {a.pincode}
                </span>
                <span className="mt-1 block text-[12.5px] font-semibold text-ink-700">{a.phone}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={onAddNew}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#2874f0] hover:underline"
        >
          <Plus className="size-3.5" /> Add a new address
        </button>
        <button
          type="button"
          onClick={() => setChanging(false)}
          className="rounded-lg bg-[#2874f0] px-4 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-[#1f5fc9]"
        >
          Deliver here
        </button>
      </div>
    </div>
  );
}

import { useState } from "react";

export default SavedAddressCard;