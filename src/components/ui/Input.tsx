"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

type FieldProps = {
   label?: React.ReactNode;
  containerClassName?: string;
  error?: string;
  hint?: string;
};

const fieldClass =
  "h-12 w-full rounded-xl border border-hairline bg-white px-3.5 text-[14px] text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-electric-400 focus:ring-4 focus:ring-electric-500/10 disabled:bg-canvas disabled:text-ink-400";

export function Input({
  label,
  containerClassName,
  error,
  hint,
  className,
  id,
  ...props
}: FieldProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className={cn("space-y-1.5", containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="block text-[12.5px] font-bold text-ink-700">
          {label}
        </label>
      )}
      <input id={inputId} className={cn(fieldClass, error && "border-flame-500", className)} {...props} />
      {error ? (
        <p className="text-[11.5px] font-semibold text-flame-600">{error}</p>
      ) : hint ? (
        <p className="text-[11.5px] text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function PasswordInput({
  label,
  containerClassName,
  error,
  hint,
  className,
  id,
  ...props
}: FieldProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [show, setShow] = useState(false);

  return (
    <div className={cn("space-y-1.5", containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="block text-[12.5px] font-bold text-ink-700">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type={show ? "text" : "password"}
          className={cn(fieldClass, "pr-12", error && "border-flame-500", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-ink-400 hover:bg-canvas hover:text-ink-900"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error ? (
        <p className="text-[11.5px] font-semibold text-flame-600">{error}</p>
      ) : hint ? (
        <p className="text-[11.5px] text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function Textarea({
  label,
  containerClassName,
  error,
  hint,
  className,
  id,
  rows = 4,
  ...props
}: FieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className={cn("space-y-1.5", containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="block text-[12.5px] font-bold text-ink-700">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        rows={rows}
        className={cn(
          "w-full rounded-xl border border-hairline bg-white px-3.5 py-3 text-[14px] text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-electric-400 focus:ring-4 focus:ring-electric-500/10",
          error && "border-flame-500",
          className,
        )}
        {...props}
      />
      {error ? (
        <p className="text-[11.5px] font-semibold text-flame-600">{error}</p>
      ) : hint ? (
        <p className="text-[11.5px] text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function Select({
  label,
  containerClassName,
  error,
  hint,
  className,
  id,
  children,
  ...props
}: FieldProps & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className={cn("space-y-1.5", containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="block text-[12.5px] font-bold text-ink-700">
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={cn(fieldClass, "appearance-none pr-10", error && "border-flame-500", className)}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p className="text-[11.5px] font-semibold text-flame-600">{error}</p>
      ) : hint ? (
        <p className="text-[11.5px] text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function Checkbox({
  label,
  className,
  containerClassName,
  ...props
}: FieldProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const autoId = useId();
  const inputId = props.id ?? autoId;

  return (
    <div className={cn("flex items-start gap-2.5", containerClassName)}>
      <input
        id={inputId}
        type="checkbox"
        className={cn("mt-0.5 size-4 accent-electric-500", className)}
        {...props}
      />
      {label && (
        <label htmlFor={inputId} className="text-[12.5px] font-semibold leading-relaxed text-ink-700">
          {label}
        </label>
      )}
    </div>
  );
}