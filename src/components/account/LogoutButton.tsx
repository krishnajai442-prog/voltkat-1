"use client";

import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } finally {
          window.location.assign("/");
        }
      }}
      className="flex w-full items-center justify-center gap-2 rounded-xl border bg-white py-3.5 text-sm font-bold text-[#2874f0] shadow-sm transition-colors hover:bg-red-50 hover:text-red-600"
    >
      <LogOut className="size-4" /> Log Out
    </button>
  );
}