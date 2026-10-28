"use client";

import { Check, Loader2, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/Toaster";
import { cn } from "@/lib/utils";

export function StockEditor({
  productId,
  stock,
  lowStockAt,
}: {
  productId: string;
  stock: number;
  lowStockAt: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState(stock);
  const [busy, setBusy] = useState(false);

  const dirty = value !== stock;
  const tone =
    value === 0 ? "text-flame-600" : value <= lowStockAt ? "text-amber-600" : "text-emerald-600";

  async function save() {
    const delta = value - stock;
    if (delta === 0) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta, reason: "Admin inline update" }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Stock update failed");
      toast.push({ title: "Stock updated" });
      router.refresh();
    } catch (e) {
      setValue(stock);
      toast.push({
        tone: "error",
        title: "Stock update failed",
        body: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => setValue((v) => Math.max(0, v - 1))}
        className="grid size-7 place-items-center rounded-lg border border-hairline text-ink-400 hover:border-electric-300"
        aria-label="Decrease stock"
      >
        <Minus className="size-3" />
      </button>
      <input
        value={value}
        onChange={(e) => setValue(Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0))}
        onBlur={save}
        className={cn(
          "h-8 w-16 rounded-lg border border-hairline bg-white text-center text-[13px] font-bold tabular-nums outline-none focus:border-electric-400",
          tone,
        )}
        inputMode="numeric"
        aria-label="Stock quantity"
      />
      <button
        type="button"
        onClick={() => setValue((v) => v + 1)}
        className="grid size-7 place-items-center rounded-lg border border-hairline text-ink-400 hover:border-electric-300"
        aria-label="Increase stock"
      >
        <Plus className="size-3" />
      </button>
      {dirty && (
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="grid size-7 place-items-center rounded-lg bg-electric-500 text-white disabled:opacity-60"
          aria-label="Save stock"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
        </button>
      )}
    </div>
  );
}