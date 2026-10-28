"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = "bottom",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
   side?: "bottom" | "right" | "left";
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-ink-950/55 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.aside
                        initial={side === "bottom" ? { y: "100%" } : side === "left" ? { x: "-100%" } : { x: "100%" }}
            animate={side === "bottom" ? { y: 0 } : { x: 0 }}
             exit={side === "bottom" ? { y: "100%" } : side === "left" ? { x: "-100%" } : { x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className={cn(
              "absolute bg-white shadow-lift",
              side === "bottom"
                ? "inset-x-0 bottom-0 max-h-[88vh] rounded-t-3xl"
                : side === "left" ? "inset-y-0 left-0 w-full max-w-md" : "inset-y-0 right-0 w-full max-w-md",
            )}
          >
            <header className="flex items-center justify-between border-b border-hairline px-4 py-3.5">
              <h2 className="font-display text-[15px] font-bold text-ink-900">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="grid size-9 place-items-center rounded-xl text-ink-400 hover:bg-canvas hover:text-ink-900"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className={cn("overflow-y-auto p-4", side === "bottom" ? "max-h-[calc(88vh-56px)]" : "h-[calc(100vh-56px)]")}>
              {children}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}