import Link from "next/link";
import { cn } from "@/lib/utils";

type TabItem = {
  value: string;
  label: string;
  count?: number;
  href?: string;
};

export function Tabs({
  value,
  items,
  onChange,
  className,
}: {
  value: string;
  items: TabItem[];
  onChange?: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("no-scrollbar flex gap-1 overflow-x-auto rounded-2xl border border-hairline bg-white p-1", className)}>
      {items.map((item) => {
        const active = item.value === value;

        const cls = cn(
          "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[12.5px] font-bold transition-colors",
          active ? "bg-ink-900 text-white" : "text-ink-400 hover:bg-canvas hover:text-ink-900",
        );

        const content = (
          <>
            {item.label}
            {typeof item.count === "number" && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10.5px] tabular-nums",
                  active ? "bg-white/15 text-white" : "bg-canvas text-ink-400",
                )}
              >
                {item.count}
              </span>
            )}
          </>
        );

        if (item.href) {
          return (
            <Link key={item.value} href={item.href} className={cls} aria-current={active ? "page" : undefined}>
              {content}
            </Link>
          );
        }

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange?.(item.value)}
            className={cls}
            aria-pressed={active}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}