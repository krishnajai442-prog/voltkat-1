import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function AdminPageHeader({
  title,
  subtitle,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  actionHref?: string;
  actionLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-xl font-bold text-ink-900 sm:text-2xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-[13px] text-ink-400">{subtitle}</p>}
        {children}
      </div>
      {actionHref && actionLabel && (
        <Button href={actionHref} size="sm">
          {actionLabel}
        </Button>
      )}
    </header>
  );
}