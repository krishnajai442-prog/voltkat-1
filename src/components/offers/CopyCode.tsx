"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/Toaster";
import { copyText } from "@/lib/clipboard";

export function CopyCode({ code }: { code: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    const ok = await copyText(code);
    if (ok) {
      setCopied(true);
      toast.push({ title: "Coupon copied", body: code });
      window.setTimeout(() => setCopied(false), 1800);
    } else {
      toast.push({
        tone: "error",
        title: "Couldn't copy automatically",
        body: "Long-press the code text and choose Copy.",
      });
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-electric-400 bg-electric-50 px-2.5 py-1 text-[12px] font-bold tracking-wider text-electric-700 hover:bg-electric-100"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {code}
    </button>
  );
}