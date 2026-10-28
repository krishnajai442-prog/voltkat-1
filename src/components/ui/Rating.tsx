import { cn } from "@/lib/utils";

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const rounded = Math.round(value);

  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          viewBox="0 0 24 24"
          style={{ width: size, height: size }}
          className={cn(n <= rounded ? "fill-amber-offer" : "fill-ink-300/40")}
          aria-hidden="true"
        >
          <path d="M12 2l3 6.5 7 .9-5 4.8 1.3 7L12 18l-6.3 3.2L7 14.2 2 9.4l7-.9z" />
        </svg>
      ))}
    </span>
  );
}

export function RatingPill({
  value,
  count,
  className,
}: {
  value: number;
  count: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-400", className)}>
      <Stars value={value} size={12} />
      <span className="tabular-nums">{value.toFixed(1)}</span>
      {count > 0 && <span className="text-ink-300">({count.toLocaleString("en-IN")})</span>}
    </span>
  );
}