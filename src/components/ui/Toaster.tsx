"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Toast = {
  id: string;
  title: string;
  body?: string;
  tone?: "success" | "info" | "error" | "warn";
};

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
const listeners = new Set<Listener>();
let seq = 0;

function emit() {
  for (const l of listeners) l([...toasts]);
}

function pushToast(t: Omit<Toast, "id">) {
  const id = `t_${++seq}_${Date.now()}`;
  toasts = [...toasts.slice(-3), { ...t, id }];
  emit();

  window.setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== id);
    emit();
  }, 4200);
}

export function useToast() {
  const push = useCallback((t: Omit<Toast, "id">) => {
    pushToast(t);
  }, []);

  return { push };
}

const icons = {
  success: <CheckCircle2 className="size-4 text-mint-500" />,
  info: <Info className="size-4 text-electric-500" />,
  error: <TriangleAlert className="size-4 text-flame-500" />,
  warn: <TriangleAlert className="size-4 text-flame-500" />,
};

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    const listener: Listener = (next) => setItems(next);
    listeners.add(listener);
    listener(toasts);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex flex-col items-center gap-2 px-4 md:bottom-6 md:left-auto md:right-6 md:items-end"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="glass pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl p-3.5 shadow-lift"
          >
            <span className="mt-0.5">{icons[t.tone ?? "success"]}</span>

            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-bold text-ink-900">{t.title}</p>
              {t.body && <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-400">{t.body}</p>}
            </div>

            <button
              type="button"
              onClick={() => {
                toasts = toasts.filter((x) => x.id !== t.id);
                emit();
              }}
              className="grid size-7 shrink-0 place-items-center rounded-lg text-ink-300 hover:bg-ink-900/5 hover:text-ink-700"
              aria-label="Dismiss notification"
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}