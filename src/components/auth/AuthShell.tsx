import Link from "next/link";
import { Sparkles } from "lucide-react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="container-x py-10">
      <div className="mx-auto w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-electric-500 to-violet-accent text-white shadow-glow">
            <Sparkles className="size-5" />
          </span>
          <span className="font-display text-xl font-bold text-ink-900">
            Volt<span className="text-electric-600">Kart</span>
          </span>
        </Link>

        <div className="card p-6 sm:p-7">
          <h1 className="font-display text-2xl font-bold text-ink-900">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[13.5px] text-ink-400">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>

        {footer && <div className="mt-5 text-center text-[13px] text-ink-400">{footer}</div>}
      </div>
    </div>
  );
}