import Link from "next/link";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  href,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const cls = cn(
    "card p-4",
    href && "transition-all hover:-translate-y-0.5 hover:shadow-lift",
  );

  const valueCls = cn(
    "mt-2 font-display text-2xl font-bold tabular-nums",
    tone === "good" && "text-emerald-600",
    tone === "warn" && "text-amber-600",
    tone === "bad" && "text-flame-600",
    tone === "default" && "text-ink-900",
  );

  const body = (
    <>
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-300">
        {label}
      </p>
      <p className={valueCls}>{value}</p>
      {hint && <p className="mt-1 text-[12px] text-ink-400">{hint}</p>}
    </>
  );

  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}