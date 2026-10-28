"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyText } from "@/lib/clipboard";

export function CopyButton({ value, label = "Copy order number" }: { value: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await copyText(value);
        setState(ok ? "copied" : "failed");
        window.setTimeout(() => setState("idle"), 1500);
        if (!ok) console.warn("[copy] clipboard unavailable for:", value);
      }}
      className="grid size-8 place-items-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
      aria-label={state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label}
      title={state === "copied" ? "Copied!" : state === "failed" ? "Copy failed — select & copy manually" : label}
    >
      {state === "copied" ? (
        <Check className="size-3.5 text-emerald-600" />
      ) : state === "failed" ? (
        <Copy className="size-3.5 text-rose-500" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  );
}