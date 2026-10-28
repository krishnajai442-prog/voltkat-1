import Link from "next/link";
import {
  AlertTriangle,
  MessageSquare,
  Package,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react";
import prisma from "@/lib/prisma";
import { adminPage } from "@/lib/admin-page";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { OrderStatusChart, RevenueChart } from "@/components/admin/AdminCharts";
import { formatDateTime, inr, relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

function dayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export default async function AdminDashboardPage() {
  await adminPage();
  const { start, end } = dayRange();
  const last14 = new Date(Date.now() - 14 * 86400000);

  const [
    paidToday,
    ordersToday,
    pending,
    // lowStock,
    outOfStock,
    newReviews,
    messages,
    recentOrders,
    notifications,
    dailyRows,
    statusRows,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { createdAt: { gte: start, lte: end }, paymentStatus: "PAID" },
      _sum: { total: true },
    }),
    prisma.order.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    // prisma.product.count({
    //   where: { active: true, stock: { gt: 0, lte: prisma.product.fields.lowStockAt.db ? undefined : undefined } },
    // }),
    prisma.product.count({ where: { active: true, stock: 0 } }),
    prisma.review.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.contactMessage.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        user: { select: { name: true, email: true } },
        items: { select: { name: true }, take: 1 },
      },
    }),
    prisma.notification.findMany({
      where: { audience: "STAFF" },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.$queryRaw<{ date: string; revenue: bigint; orders: bigint }[]>`
      SELECT
        to_char(date("createdAt"), 'YYYY-MM-DD') as date,
        COALESCE(SUM("total"), 0)::bigint as revenue,
        COUNT(*)::bigint as orders
      FROM "Order"
      WHERE "createdAt" >= ${last14}
        AND "paymentStatus" = 'PAID'
        AND "status" <> 'CANCELLED'
      GROUP BY 1
      ORDER BY 1 ASC
    `,
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  // accurate low stock count
  const lowStockProducts = await prisma.product.findMany({
    where: { active: true, stock: { gt: 0 } },
    select: { stock: true, lowStockAt: true },
  });
  const lowStockCount = lowStockProducts.filter((p) => p.stock <= p.lowStockAt).length;

  const revenueData = dailyRows.map((r) => ({
    date: r.date,
    revenue: Number(r.revenue),
    orders: Number(r.orders),
  }));

  const statusData = statusRows.map((s) => ({
    status: s.status.replace(/_/g, " "),
    count: s._count._all,
  }));

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        subtitle="Today’s pulse, pipeline health and operational alerts."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's sales"
          value={inr(Number(paidToday._sum.total ?? 0))}
          hint="Paid orders only"
          tone="good"
        />
        <StatCard label="Today's orders" value={ordersToday} href="/admin/orders" />
        <StatCard
          label="Pending orders"
          value={pending}
          href="/admin/orders?status=PENDING"
          tone={pending > 0 ? "warn" : "default"}
        />
        <StatCard
          label="Low stock"
          value={lowStockCount}
          href="/admin/products?stock=low"
          tone={lowStockCount > 0 ? "warn" : "default"}
        />
        <StatCard
          label="Out of stock"
          value={outOfStock}
          href="/admin/products?stock=out"
          tone={outOfStock > 0 ? "bad" : "default"}
        />
        <StatCard label="New reviews" value={newReviews} href="/admin/products" />
        <StatCard label="Messages today" value={messages} href="/admin/support" />
        <StatCard
          label="Revenue trend"
          value="14d"
          hint="See analytics for deeper cuts"
          href="/admin/analytics"
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <RevenueChart data={revenueData} />
        <OrderStatusChart data={statusData} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="card overflow-hidden">
          <header className="flex items-center justify-between border-b border-hairline px-4 py-3">
            <h2 className="font-display text-[15px] font-bold text-ink-900">
              Recent orders
            </h2>
            <Link href="/admin/orders" className="text-[12.5px] font-bold text-electric-600">
              View all
            </Link>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-[13px]">
              <thead className="bg-canvas text-left text-[11px] font-bold uppercase tracking-wider text-ink-300">
                <tr>
                  <th className="px-4 py-2.5">Order</th>
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-4 py-2.5">Item</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-canvas/60">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${o.orderNumber}`} className="font-bold text-ink-900 hover:text-electric-600">
                        {o.orderNumber}
                      </Link>
                      <p className="mt-0.5 text-[11px] text-ink-300">{relativeTime(o.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink-900">{o.user?.name ?? "Guest"}</p>
                      <p className="text-[11.5px] text-ink-400">{o.user?.email ?? "—"}</p>
                    </td>
                    <td className="max-w-52 truncate px-4 py-3 text-ink-700">
                      {o.items[0]?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-ink-900">
                      {inr(o.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 font-display text-[15px] font-bold text-ink-900">
            Operational feed
          </h2>
          {notifications.length === 0 ? (
            <p className="text-[13px] text-ink-400">No staff notifications yet.</p>
          ) : (
            <ul className="space-y-3">
              {notifications.map((n) => (
                <li key={n.id} className="border-b border-hairline pb-3 last:border-0 last:pb-0">
                  <p className="text-[13px] font-bold text-ink-900">{n.title}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-400">{n.body}</p>
                  <p className="mt-1 text-[11px] text-ink-300">{formatDateTime(n.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink href="/admin/products/new" icon={<Package className="size-4" />} label="Add product" />
        <QuickLink href="/admin/coupons" icon={<Wallet className="size-4" />} label="Create coupon" />
        <QuickLink href="/admin/slides" icon={<TrendingUp className="size-4" />} label="Manage hero slides" />
        <QuickLink href="/admin/returns" icon={<AlertTriangle className="size-4" />} label="Returns queue" />
      </div>
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="card flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift">
      <span className="grid size-9 place-items-center rounded-xl bg-electric-50 text-electric-600">{icon}</span>
      <span className="text-[13.5px] font-bold text-ink-900">{label}</span>
    </Link>
  );
}