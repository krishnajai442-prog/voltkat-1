import { CalendarDays, Check, MapPin, Package, PackageCheck, ShoppingBag, Truck, XCircle } from "lucide-react";

export type DeliveryStageStamp = {
  status: string;
  createdAt: Date | string;
  confirmedAt: Date | string | null;
  processedAt?: Date | string | null;
  shippedAt: Date | string | null;
  outForDeliveryAt?: Date | string | null;
  deliveredAt: Date | string | null;
  cancelledAt?: Date | string | null;
};

const RANK: Record<string, number> = {
  PENDING: 0, CONFIRMED: 1, PROCESSING: 2, SHIPPED: 3, OUT_FOR_DELIVERY: 4, DELIVERED: 5, CANCELLED: 99,
};

const fmt = (d: Date | string | null | undefined) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
      })
    : null;

function Pill({ state }: { state: "done" | "current" | "future" | "cancelled" }) {
  if (state === "done")
    return <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-2.5 py-1 text-[12px] font-bold text-emerald-700"><span className="size-1.5 rounded-full bg-emerald-500" /> Completed</span>;
  if (state === "current")
    return <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100 px-2.5 py-1 text-[12px] font-bold text-blue-700"><span className="size-1.5 rounded-full bg-blue-500" /> In Transit</span>;
  if (state === "cancelled")
    return <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-100 px-2.5 py-1 text-[12px] font-bold text-rose-700"><span className="size-1.5 rounded-full bg-rose-500" /> Cancelled</span>;
  return <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-[12px] font-bold text-gray-500"><span className="size-1.5 rounded-full bg-gray-400" /> Pending</span>;
}

export function DeliveryTimeline({ order }: { order: DeliveryStageStamp }) {
  const rank = RANK[order.status] ?? 0;
  const cancelled = order.status === "CANCELLED";

  const stages = [
    { rank: 1, label: "Confirmed", icon: Check, at: order.confirmedAt },
    { rank: 2, label: "Packed & Processed", icon: Package, at: order.processedAt ?? null },
    { rank: 3, label: "Shipped", icon: Truck, at: order.shippedAt },
    { rank: 4, label: "Out for Delivery", icon: MapPin, at: order.outForDeliveryAt ?? null },
    { rank: 5, label: "Delivered", icon: PackageCheck, at: order.deliveredAt },
  ];

  const stateOf = (s: { rank: number; at: Date | string | null }): "done" | "current" | "future" => {
    if (cancelled) return s.at ? "done" : "future";
    if (rank > s.rank) return "done";
    if (rank === s.rank) return "current";
    return "future";
  };

  return (
    <div className="space-y-4">
      {/* Order placed header card */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-blue-100 text-[#2874f0]">
            <ShoppingBag className="size-5" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Order placed</p>
            <p className="font-display text-[17px] font-bold text-gray-900">Ordered on {fmt(order.createdAt)?.split(",")[0]}</p>
          </div>
        </div>
        <span className="grid size-9 place-items-center rounded-lg bg-blue-100 text-[#2874f0]">
          <CalendarDays className="size-4" />
        </span>
      </div>

      {/* Stage rail */}
      <div className="space-y-0">
        {stages.map((s, i) => {
          const st = stateOf(s);
          const reached = st !== "future";
          const Icon = s.icon;
          const isLast = i === stages.length - 1 && !cancelled;
          return (
            <div key={s.label}>
              <div className="flex items-center gap-4 rounded-2xl bg-gray-50/60 px-4 py-4">
                <span
                  className={`relative grid size-14 shrink-0 place-items-center rounded-full text-white ring-8 ${
                    reached ? "bg-gradient-to-br from-[#2874f0] to-violet-500 ring-[#2874f0]/10" : "bg-gray-200 text-gray-400 ring-gray-200/60"
                  }`}
                >
                  <Icon className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`font-display text-[17px] font-bold ${reached ? "text-gray-900" : "text-gray-400"}`}>{s.label}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-gray-500">
                    <CalendarDays className="size-3.5" />
                    {fmt(s.at) ?? (reached ? "—" : "Awaiting update")}
                  </p>
                </div>
                <Pill state={st} />
              </div>
              {!isLast && (
                <div className="ml-[2.15rem] h-8 w-1 rounded-full bg-gradient-to-b from-[#2874f0] to-violet-500 opacity-80"
                  style={!reached ? { background: "#e5e7eb" } : undefined} />
              )}
            </div>
          );
        })}

        {cancelled && (
          <div className="flex items-center gap-4 rounded-2xl bg-rose-50 px-4 py-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-rose-500 text-white ring-8 ring-rose-500/10">
              <XCircle className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[17px] font-bold text-rose-700">Cancelled</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-rose-500">
                <CalendarDays className="size-3.5" />
                {fmt(order.cancelledAt) ?? "—"}
              </p>
            </div>
            <Pill state="cancelled" />
          </div>
        )}
      </div>
    </div>
  );
}

export default DeliveryTimeline;