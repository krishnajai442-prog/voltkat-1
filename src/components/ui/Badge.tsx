import { cn } from "@/lib/utils";

type Tone = "neutral" | "info" | "save" | "warn" | "deal" | "violet";

const tones: Record<Tone, string> = {
  neutral: "bg-canvas text-ink-400 ring-hairline",
  info: "bg-electric-50 text-electric-700 ring-electric-200",
  save: "bg-mint-500/10 text-emerald-700 ring-emerald-200",
  warn: "bg-amber-offer/10 text-amber-700 ring-amber-200",
  deal: "bg-flame-500/10 text-flame-600 ring-flame-200",
  violet: "bg-violet-accent/10 text-violet-700 ring-violet-200",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}