"use client";

import { Ban } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";

export function CancelOrderButton({
  orderNumber,
  status,
}: {
  orderNumber: string;
  status: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (!["PENDING", "CONFIRMED"].includes(status)) return null;

  async function cancel() {
    const reason = window.prompt(
      "Reason for cancellation (optional)",
      "Customer requested cancellation",
    );

    if (reason === null) return;

    setBusy(true);

    try {
      const res = await fetch(`/api/orders/${orderNumber}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      const json = (await res.json()) as { ok: boolean; error?: string };

      if (!json.ok) throw new Error(json.error ?? "Could not cancel order.");

      toast.push({ title: "Order cancelled", body: orderNumber });
      router.refresh();
    } catch (e) {
      toast.push({
        tone: "error",
        title: "Cancellation failed",
        body: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="danger"
      size="sm"
      loading={busy}
      onClick={cancel}
      className="inline-flex print:hidden"
    >
      {!busy && <Ban className="size-3.5" />}
      Cancel order
    </Button>
  );
}