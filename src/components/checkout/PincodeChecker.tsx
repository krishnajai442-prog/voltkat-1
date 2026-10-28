"use client";

import { CheckCircle, Loader2, MapPin, XCircle } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  status: "idle" | "loading" | "success" | "error";
  msg: string;
};

// Holds NO state and NO hooks. The PIN lives in the parent's addressForm, so a
// re-render or an accidental remount can never erase the digits you typed.
export function PincodeChecker({ value, onChange, status, msg }: Props) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-gray-500">
        <MapPin className="size-3" /> PIN Code
      </label>

      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          className={`w-full h-11 rounded-lg border px-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all ${
            status === "loading"
              ? "border-blue-400 bg-blue-50/50 ring-2 ring-blue-100"
              : status === "success"
                ? "border-green-500 bg-green-50/50 ring-2 ring-green-100"
                : status === "error"
                  ? "border-red-500 bg-red-50/50 ring-2 ring-red-100"
                  : "border-gray-300 focus:border-[#2874f0] focus:ring-2 focus:ring-blue-100"
          }`}
          placeholder="e.g. 560001"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {status === "loading" && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
          {status === "success" && <CheckCircle className="h-4 w-4 text-green-500" />}
          {status === "error" && <XCircle className="h-4 w-4 text-red-500" />}
        </div>
      </div>

      {msg && (
        <p
          className={`text-[11px] font-semibold ${
            status === "error" ? "text-red-500" : "text-green-600"
          }`}
        >
          {msg}
        </p>
      )}
    </div>
  );
}