"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";

type Props = {
  currentStatus: string;
  orderNumber: string;
};

export function OrderActions({ currentStatus, orderNumber }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function handleTransition(newStatus: string, note?: string, otp?: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderNumber}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          note || otp
            ? { status: newStatus, ...(note ? { note } : {}), ...(otp ? { otp } : {}) }
            : { status: newStatus },
        ),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to update order.");

      toast.push({
        tone: "success",
        title: "Order Updated",
        body: `${orderNumber} → ${newStatus.replace(/_/g, " ")}`,
      });
      router.refresh();
    } catch (err) {
      toast.push({
        tone: "error",
        title: "Update Failed",
        body: err instanceof Error ? err.message : "Unknown error.",
      });
    } finally {
      setLoading(false);
    }
  }

  /** Delivery handover: ask for the customer's 6-digit OTP before marking DELIVERED. */
  function confirmDelivered() {
    const otp = window.prompt("Enter the 6-digit delivery OTP the customer received:");
    if (!otp) return; // admin cancelled the prompt
    if (!/^\d{6}$/.test(otp.trim())) {
      toast.push({ tone: "error", title: "Invalid OTP", body: "Enter exactly 6 digits." });
      return;
    }
    handleTransition("DELIVERED", undefined, otp.trim());
  }

  switch (currentStatus) {
    case "PENDING":
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="primary" onClick={() => handleTransition("CONFIRMED")} disabled={loading}>
            <CheckCircle2 className="mr-1 h-3 w-3" /> Confirm
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleTransition("CANCELLED", "Manual cancellation by admin")} disabled={loading}>
            Cancel
          </Button>
        </div>
      );

    case "CONFIRMED":
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => handleTransition("PROCESSING")} disabled={loading}>
            Start Processing
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleTransition("SHIPPED")} disabled={loading}>
            Ship Directly
          </Button>
        </div>
      );

    case "PROCESSING":
      return (
        <Button size="sm" variant="primary" onClick={() => handleTransition("SHIPPED")} disabled={loading}>
          Mark Shipped
        </Button>
      );

    case "SHIPPED":
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => handleTransition("OUT_FOR_DELIVERY")} disabled={loading}>
            Out for Delivery
          </Button>
          <Button size="sm" variant="ghost" onClick={confirmDelivered} disabled={loading}>
            Deliver (OTP)
          </Button>
        </div>
      );

    case "OUT_FOR_DELIVERY":
      return (
        <Button size="sm" variant="primary" onClick={confirmDelivered} disabled={loading}>
          Confirm Delivery (OTP)
        </Button>
      );

    default:
      return <span className="text-xs italic text-gray-500">No further actions.</span>;
  }
} 