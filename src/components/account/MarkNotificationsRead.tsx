"use client";

import { CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";

export function MarkNotificationsRead({ count }: { count: number }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (count <= 0) return null;

  async function markRead() {
    setBusy(true);
    try {
      const res = await fetch("/api/account/notifications/read", { method: "POST" });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Could not mark read.");

      toast.push({ title: "Notifications marked read" });
      router.refresh();
    } catch (e) {
      toast.push({
        tone: "error",
        title: "Update failed",
        body: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="outline" loading={busy} onClick={markRead}>
      {!busy && <CheckCheck className="size-3.5" />}
      Mark all read
    </Button>
  );
}