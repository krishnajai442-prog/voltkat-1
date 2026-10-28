"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Package, Search, SlidersHorizontal } from "lucide-react";

export type OrderVM = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  items: { name: string; quantity: number; image: string | null; brand: string }[];
};

type Filter = "ALL" | "DELIVERED" | "IN_TRANSIT" | "CANCELLED";

const milestone = (o: OrderVM): { label: string; date: string | null } => {
  if (o.status === "DELIVERED") return { label: "Delivered on", date: o.deliveredAt };
  if (o.status === "CANCELLED") return { label: "Cancelled on", date: o.cancelledAt };
  if (["SHIPPED", "OUT_FOR_DELIVERY", "PROCESSING", "CONFIRMED"].includes(o.status)) {
    return { label: "Arriving by", date: o.shippedAt ?? o.confirmedAt };
  }
  return { label: "Placed on", date: o.createdAt };
};

const filterMatches = (o: OrderVM, f: Filter) => {
  if (f === "ALL") return true;
  if (f === "DELIVERED") return o.status === "DELIVERED";
  if (f === "CANCELLED") return o.status === "CANCELLED";
  return ["CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY"].includes(o.status);
};

const fmtDate = (iso: string | null): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export function OrdersClient({ orders }: { orders: OrderVM[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [showFilters, setShowFilters] = useState(true);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (!filterMatches(o, filter)) return false;
      if (!needle) return true;
      if (o.orderNumber.toLowerCase().includes(needle)) return true;
      return o.items.some(
        (i) => i.name.toLowerCase().includes(needle) || (i.brand?.toLowerCase() ?? "").includes(needle),
      );
    });
  }, [orders, q, filter]);

  const grouped = useMemo(() => {
    const m = new Map<string, OrderVM[]>();
    for (const o of filtered) {
      const key = new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      const arr = m.get(key) ?? [];
      arr.push(o);
      m.set(key, arr);
    }
    return [...m.entries()];
  }, [filtered]);

  const chips: { id: Filter; label: string }[] = [
    { id: "ALL", label: "All" },
    { id: "DELIVERED", label: "Delivered" },
    { id: "IN_TRANSIT", label: "In Transit" },
    { id: "CANCELLED", label: "Cancelled" },
  ];

  return (
    <div className="container-x py-6">
      <h1 className="mb-4 font-display text-xl font-bold">My Orders</h1>

      <div className="mb-3 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search your order here"
            className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-[13px] outline-none focus:border-[#2874f0]"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-bold text-gray-800"
          aria-expanded={showFilters}
        >
          <SlidersHorizontal className="size-4" /> Filters
        </button>
      </div>

      {showFilters && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chips.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-[12.5px] font-bold transition-colors ${
                filter === c.id ? "bg-gray-900 text-white" : "border border-gray-200 bg-white text-gray-700 hover:border-gray-400"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {grouped.length === 0 && (
        <p className="rounded-xl bg-gray-50 p-6 text-center text-[13px] text-gray-500">
          No orders match {q ? `"${q}"` : "this filter"}.
        </p>
      )}

      <div className="space-y-6">
        {grouped.map(([day, dayOrders]) => (
          <section key={day}>
            <h2 className="mb-2 text-[12.5px] font-bold uppercase tracking-wider text-gray-500">{day}</h2>
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100 bg-white">
              {dayOrders.map((o) => {
                const ms = milestone(o);
                return (
                  <li key={o.id}>
                    {/* One card per order; item rows stack with no internal dividers, like the reference */}
                    <ul>
                      {o.items.map((item, iIdx) => (
                        <li key={iIdx}>
                          <Link
                            href={`/account/orders/${encodeURIComponent(o.orderNumber)}`}
                            className="flex items-center gap-3 p-3 transition-colors hover:bg-gray-50"
                          >
                            <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                              {item.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.image} alt={item.name} className="size-full object-contain p-1" />
                              ) : (
                                <span className="grid size-full place-items-center bg-gray-100 text-gray-400">
                                  <Package className="size-5" />
                                </span>
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[14px] font-bold text-gray-900">
                                {ms.label} {fmtDate(ms.date)}
                              </span>
                              <span className="mt-0.5 block truncate text-[12.5px] text-gray-600">
                                {item.name}
                                {item.brand ? ` · ${item.brand}` : ""}
                              </span>
                            </span>
                            <ChevronRight className="size-4 shrink-0 text-gray-400" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

export default OrdersClient;