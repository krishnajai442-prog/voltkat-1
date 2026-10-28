"use client";

import { Check, Circle } from "lucide-react";
import { PASSWORD_RULES } from "@/lib/validators";
import { cn } from "@/lib/utils";

export function PasswordChecklist({ value }: { value: string }) {
  return (
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value);
        return (
          <li
            key={rule.id}
            className={cn(
              "flex items-center gap-1.5 text-[12px] font-semibold transition-colors",
              ok ? "text-emerald-600" : "text-ink-300",
            )}
          >
            {ok ? <Check className="size-3.5" /> : <Circle className="size-3.5" />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}