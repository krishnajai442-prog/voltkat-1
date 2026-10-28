import { Badge } from "@/components/ui/Badge";

const toneMap: Record<string, "info" | "save" | "warn" | "deal" | "neutral" | "violet"> = {
  PENDING: "warn",
  CONFIRMED: "info",
  PROCESSING: "info",
  SHIPPED: "violet",
  OUT_FOR_DELIVERY: "warn",
  DELIVERED: "save",
  CANCELLED: "deal",

  PAID: "save",
  FAILED: "deal",
  REFUNDED: "neutral",
  PARTIALLY_REFUNDED: "warn",
  AUTHORIZED: "info",

  OPEN: "warn",
  UNDER_REVIEW: "info",
  RESOLVED: "save",
  CLOSED: "neutral",

  REQUESTED: "warn",
  APPROVED: "info",
  REJECTED: "deal",
  PICKED_UP: "violet",
  REPLACED: "save",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={toneMap[status] ?? "neutral"}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}