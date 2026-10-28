import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("card flex flex-col items-center justify-center p-10 text-center", className)}>
      {icon && (
        <span className="grid size-14 place-items-center rounded-2xl bg-electric-50 text-electric-600">
          {icon}
        </span>
      )}
      <h2 className="mt-4 font-display text-lg font-bold text-ink-900">{title}</h2>
      {body && <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-ink-400">{body}</p>}
      {action}
    </div>
  );
}