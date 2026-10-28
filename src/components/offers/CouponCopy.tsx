"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { copyText } from "@/lib/clipboard";

export function CouponCopy({ code, className }: { code: string; className?: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await copyText(code);
        setState(ok ? "done" : "failed");
        window.setTimeout(() => setState("idle"), 2000);
      }}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-electric-400 bg-electric-50 px-3 text-[12.5px] font-bold text-electric-700 transition-colors hover:bg-electric-500 hover:text-white",
        state === "failed" && "border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white",
        className,
      )}
    >
      {state === "done" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {state === "done" ? "Copied" : state === "failed" ? "Copy failed" : "Copy code"}
    </button>
  );
}