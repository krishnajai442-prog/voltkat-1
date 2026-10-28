import Link from "next/link";
import prisma from "@/lib/prisma";
import { adminPage } from "@/lib/admin-page";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Tabs } from "@/components/ui/Tabs";
import { Input } from "@/components/ui/Input";
import { formatDateTime, inr } from "@/lib/utils";
import { OrderActions } from "./components/OrderActions";
import { maskOtp } from "@/lib/delivery-otp";

export const dynamic = "force-dynamic";

const STATUSES = ["ALL", "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"] as const;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await adminPage();
  const sp = await searchParams;
  const status = typeof sp.status === "string" && STATUSES.includes(sp.status as any) ? sp.status : "ALL";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const where: any = {};
  if (status !== "ALL") where.status = status;
  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { guestEmail: { contains: q, mode: "insensitive" } },
      { guestPhone: { contains: q } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { user: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [orders, counts] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { name: true, email: true } },
        items: { select: { name: true }, take: 1 },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
  const total = counts.reduce((s, c) => s + c._count._all, 0);

  return (
    <div>
      <AdminPageHeader title="Orders" subtitle="Fulfillment queue, status progression and customer context." />

      <form className="card mb-4 flex flex-wrap gap-3 p-4">
        <Input containerClassName="min-w-64 flex-1" name="q" defaultValue={q} placeholder="Search order, customer, email…" />
        <input type="hidden" name="status" value={status} />
        <button type="submit" className="h-12 rounded-xl bg-ink-900 px-5 text-[13.5px] font-bold text-white hover:bg-electric-600">
          Search
        </button>
      </form>

      <Tabs
        className="mb-4"
        value={status}
        onChange={() => {}}
        items={STATUSES.map((s) => ({
          value: s,
          label: s === "ALL" ? "All" : s.replace(/_/g, " "),
          count: s === "ALL" ? total : countMap[s] ?? 0,
          href: `/admin/orders?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
        }))}
      />

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[62rem] text-[13px]">
            <thead className="bg-canvas text-left text-[11px] font-bold uppercase tracking-wider text-ink-300">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-canvas/50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.orderNumber}`} className="font-bold text-ink-900 hover:text-electric-600">
                      {o.orderNumber}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-ink-300">{formatDateTime(o.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900">{o.user?.name ?? "Guest"}</p>
                    <p className="text-[11.5px] text-ink-400">{o.user?.email ?? o.guestEmail ?? o.guestPhone ?? "—"}</p>
                  </td>
                  <td className="max-w-64 truncate px-4 py-3 text-ink-700">
                    {o.items[0]?.name ?? "—"} {o._count.items > 1 ? `+${o._count.items - 1}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900">{o.paymentMethod}</p>
                    <StatusBadge status={o.paymentStatus} />
                  </td>
                  <td className="px-4 py-3">
  <OrderActions currentStatus={o.status} orderNumber={o.orderNumber} />
  {o.deliveryOtp && o.status !== "DELIVERED" && o.status !== "CANCELLED" && (
  <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-600">
    OTP {maskOtp(o.deliveryOtp)}
  </span>
)}
</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-ink-900">{inr(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}