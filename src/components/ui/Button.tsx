import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export type ButtonProps = {
  href?: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
  className?: string;
  children?: React.ReactNode;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: React.MouseEventHandler;
  target?: string;
  rel?: string;
  prefetch?: boolean;
  scroll?: boolean;
  replace?: boolean;
  shallow?: boolean;
  locale?: string | false;
  ariaLabel?: string;
  [key: string]: any;
};

const variants: Record<Variant, string> = {
  primary: "bg-ink-900 text-white hover:bg-electric-600",
  secondary: "bg-electric-500 text-white hover:bg-electric-600",
  outline: "border border-hairline bg-white text-ink-700 hover:border-electric-300 hover:text-ink-900",
  ghost: "text-ink-700 hover:bg-canvas",
  danger: "bg-flame-500 text-white hover:bg-flame-600",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-[12.5px] rounded-lg gap-1.5",
  md: "h-11 px-4 text-[13.5px] rounded-xl gap-2",
  lg: "h-12 px-5 text-[14px] rounded-xl gap-2",
};

export function Button({
  href,
  variant = "primary",
  size = "md",
  loading = false,
  block = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const cls = cn(
    "inline-flex items-center justify-center font-bold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    block && "w-full",
    className,
  );

  const content = (
    <>
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cls} aria-disabled={disabled || loading} {...rest}>
        {content}
      </Link>
    );
  }

  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {content}
    </button>
  );
}