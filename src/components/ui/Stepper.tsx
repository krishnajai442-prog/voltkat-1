"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 10,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex h-9 items-center overflow-hidden rounded-lg border border-hairline bg-white",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="grid size-9 place-items-center text-ink-400 transition-colors hover:bg-canvas disabled:opacity-40"
        aria-label="Decrease quantity"
      >
        <Minus className="size-3.5" />
      </button>

      <span className="min-w-10 text-center text-[13px] font-bold tabular-nums text-ink-900">
        {value}
      </span>

      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="grid size-9 place-items-center text-ink-400 transition-colors hover:bg-canvas disabled:opacity-40"
        aria-label="Increase quantity"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}