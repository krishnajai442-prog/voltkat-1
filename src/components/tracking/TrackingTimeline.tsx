import { Check, CircleDot, PackageCheck, Truck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn, formatDateTime, relativeTime } from "@/lib/utils";

type TrackingEvent = {
  id: string;
  status: string;
  title: string;
  description?: string | null;
  location?: string | null;
  createdAt: string;
};

export type EventVM = TrackingEvent;

const STATUS_TONE: Record<
  string,
  "info" | "save" | "warn" | "deal" | "neutral" | "violet"
> = {
  PENDING: "warn",
  CONFIRMED: "info",
  PROCESSING: "info",
  SHIPPED: "violet",
  OUT_FOR_DELIVERY: "warn",
  DELIVERED: "save",
  CANCELLED: "deal",
};

export function TrackingTimeline({
  status,
  events,
  eta,
  carrier,
  trackingNumber,
}: {
  status: string;
  events: TrackingEvent[];
  eta?: { from: string; to: string } | null;
  carrier?: string | null;
  trackingNumber?: string | null;
}) {
  const ordered = [...events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const current = ordered[ordered.length - 1];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={STATUS_TONE[status] ?? "neutral"}>
          {status.replace(/_/g, " ")}
        </Badge>

        {carrier && <Badge tone="neutral">{carrier}</Badge>}

        {trackingNumber && (
          <span className="font-mono text-[11.5px] text-ink-400">
            AWB/Tracking: {trackingNumber}
          </span>
        )}
      </div>

      {eta && (
        <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-700">
          <Truck className="size-4 text-electric-600" />
          Expected delivery:
          <span className="tabular-nums">
            {formatDateTime(eta.from)} – {formatDateTime(eta.to)}
          </span>
        </p>
      )}

      {ordered.length === 0 ? (
        <div className="rounded-xl border border-hairline bg-canvas p-4 text-[13px] text-ink-400">
          No tracking events yet. Current status:{" "}
          <span className="font-bold text-ink-900">
            {status.replace(/_/g, " ")}
          </span>
          {current ? ` · ${formatDateTime(current.createdAt)}` : ""}
        </div>
      ) : (
        <ol className="relative space-y-4 border-l border-hairline pl-6">
          {ordered.map((event, idx) => {
            const isLast = idx === ordered.length - 1;

            return (
              <li key={event.id} className="relative">
                <span
                  className={cn(
                    "absolute -left-[1.65rem] top-0.5 grid size-5 place-items-center rounded-full ring-4 ring-white",
                    isLast
                      ? event.status === "DELIVERED"
                        ? "bg-mint-500 text-white"
                        : event.status === "CANCELLED"
                          ? "bg-flame-500 text-white"
                          : "bg-electric-500 text-white"
                      : "bg-ink-300/30 text-ink-400",
                  )}
                >
                  {event.status === "DELIVERED" ? (
                    <PackageCheck className="size-3" />
                  ) : event.status === "CANCELLED" ? (
                    <Check className="size-3" />
                  ) : (
                    <CircleDot className="size-3" />
                  )}
                </span>

                <div
                  className={cn(
                    "rounded-xl border p-3.5 transition-colors",
                    isLast
                      ? "border-electric-200 bg-electric-50/50"
                      : "border-hairline bg-white",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[13.5px] font-bold text-ink-900">
                      {event.title}
                    </p>
                    <span className="text-[11.5px] text-ink-400">
                      {relativeTime(event.createdAt)}
                    </span>
                  </div>

                  {event.description && (
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-400">
                      {event.description}
                    </p>
                  )}

                  {event.location && (
                    <p className="mt-1.5 text-[11.5px] font-semibold text-ink-300">
                      {event.location}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}