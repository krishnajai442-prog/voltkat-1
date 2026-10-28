import Link from "next/link";

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  href,
  hrefLabel = "View all",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-electric-600">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-1 font-display text-xl font-bold text-ink-900 sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-[13.5px] text-ink-400">{subtitle}</p>}
      </div>

      {href && (
        <Link href={href} className="text-[12.5px] font-bold text-electric-600 hover:underline">
          {hrefLabel} →
        </Link>
      )}
    </div>
  );
}