import Link from "next/link";
import prisma from "@/lib/prisma";
import { adminPage } from "@/lib/admin-page";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { OrderStatusChart, RevenueChart } from "@/components/admin/AdminCharts";
import { Badge } from "@/components/ui/Badge";
import { inr } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PERIODS = [
  { key: "day", label: "Today", days: 1 },
  { key: "week", label: "7 days", days: 7 },
  { key: "month", label: "30 days", days: 30 },
  { key: "year", label: "365 days", days: 365 },
] as const;

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await adminPage({ admin: false });
  const sp = await searchParams;
  const periodKey = typeof sp.period === "string" ? sp.period : "month";
  const period = PERIODS.find((p) => p.key === periodKey) ?? PERIODS[2];

  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end.getTime() - (period.days - 1) * 86400000);
  start.setHours(0, 0, 0, 0);

  const [
    totals,
    daily,
    statusCounts,
    productPerf,
    bestSellers,
    lowStock,
    outOfStock,
    mostViewed,
    newCustomers,
    topCustomers,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { createdAt: { gte: start, lte: end }, paymentStatus: "PAID" },
      _sum: { total: true },
      _count: true,
    }),
    prisma.$queryRaw<{ date: string; revenue: bigint; orders: bigint }[]>`
      SELECT
        to_char(date("createdAt"), 'YYYY-MM-DD') as date,
        COALESCE(SUM("total"), 0)::bigint as revenue,
        COUNT(*)::bigint as orders
      FROM "Order"
      WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
        AND "paymentStatus" = 'PAID'
        AND "status" <> 'CANCELLED'
      GROUP BY 1 ORDER BY 1 ASC
    `,
    prisma.order.groupBy({
      by: ["status"],
      where: { createdAt: { gte: start, lte: end } },
      _count: { _all: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { createdAt: { gte: start, lte: end } } },
      _sum: { lineTotal: true, quantity: true },
      _count: true,
      orderBy: { _sum: { lineTotal: "desc" } },
      take: 20,
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { sold: "desc" },
      take: 10,
      select: { id: true, name: true, slug: true, sold: true, salePrice: true, stock: true },
    }),
    prisma.product.findMany({
      where: { active: true, stock: { gt: 0 } },
      orderBy: { stock: "asc" },
      take: 10,
      select: { id: true, name: true, slug: true, stock: true, lowStockAt: true },
    }),
    prisma.product.findMany({
      where: { active: true, stock: 0 },
      orderBy: { sold: "desc" },
      take: 10,
      select: { id: true, name: true, slug: true, sold: true },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { views: "desc" },
      take: 10,
      select: { id: true, name: true, slug: true, views: true, salePrice: true },
    }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: start, lte: end } } }),
    prisma.order.groupBy({
      by: ["userId"],
      where: { userId: { not: null }, createdAt: { gte: start, lte: end }, paymentStatus: "PAID" },
      _sum: { total: true },
      _count: true,
      orderBy: { _sum: { total: "desc" } },
      take: 10,
    }),
  ]);

  const productIds = productPerf.map((p) => p.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, slug: true, brand: { select: { name: true } } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const customerIds = topCustomers.map((c) => c.userId).filter(Boolean) as string[];
  const customers = await prisma.user.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, name: true, email: true },
  });
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  const revenueData = daily.map((d) => ({
    date: d.date,
    revenue: Number(d.revenue),
    orders: Number(d.orders),
  }));

  const statusData = statusCounts.map((s) => ({
    status: s.status.replace(/_/g, " "),
    count: s._count._all,
  }));

  return (
    <div>
      <AdminPageHeader title="Analytics" subtitle="Revenue, demand, inventory pressure and customer value." />

      <div className="mb-4 flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/admin/analytics?period=${p.key}`}
            className={cn(
              "rounded-xl border px-3.5 py-2 text-[12.5px] font-bold transition-colors",
              p.key === period.key
                ? "border-electric-500 bg-electric-50 text-electric-700"
                : "border-hairline bg-white text-ink-400 hover:border-electric-300",
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue" value={inr(Number(totals._sum.total ?? 0))} tone="good" />
        <StatCard label="Paid orders" value={totals._count} />
        <StatCard label="New customers" value={newCustomers} />
        <StatCard label="Avg order value" value={inr(totals._count ? Number(totals._sum.total ?? 0) / totals._count : 0)} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <RevenueChart data={revenueData} />
        <OrderStatusChart data={statusData} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <header className="border-b border-hairline px-4 py-3">
            <h2 className="font-display text-[15px] font-bold text-ink-900">Product performance</h2>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-[13px]">
              <thead className="bg-canvas text-left text-[11px] font-bold uppercase tracking-wider text-ink-300">
                <tr>
                  <th className="px-4 py-2.5">Product</th>
                  <th className="px-4 py-2.5">Units</th>
                  <th className="px-4 py-2.5 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {productPerf.map((row) => {
                  const p = productMap.get(row.productId);
                  return (
                    <tr key={row.productId}>
                      <td className="px-4 py-2.5">
                        <Link href={p ? `/product/${p.slug}` : "#"} className="font-semibold text-ink-900 hover:text-electric-600">
                          {p?.name ?? "Unknown"}
                        </Link>
                        <p className="text-[11px] text-ink-400">{p?.brand.name ?? ""}</p>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">{row._sum.quantity ?? 0}</td>
                      <td className="px-4 py-2.5 text-right font-bold tabular-nums">{inr(Number(row._sum.lineTotal ?? 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card overflow-hidden">
          <header className="border-b border-hairline px-4 py-3">
            <h2 className="font-display text-[15px] font-bold text-ink-900">Top customers</h2>
          </header>
          <ul className="divide-y divide-hairline">
            {topCustomers.map((c) => {
              const u = customerMap.get(c.userId ?? "");
              return (
                <li key={c.userId ?? Math.random()} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink-900">{u?.name ?? "Guest"}</p>
                    <p className="truncate text-[11.5px] text-ink-400">{u?.email ?? "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums text-ink-900">{inr(Number(c._sum.total ?? 0))}</p>
                    <p className="text-[11.5px] text-ink-400">{c._count} order(s)</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <InventoryList title="Best sellers" items={bestSellers.map((p) => ({ name: p.name, meta: `${p.sold} sold`, href: `/product/${p.slug}` }))} />
        <InventoryList title="Low stock" items={lowStock.map((p) => ({ name: p.name, meta: `${p.stock} left`, href: `/admin/products`, tone: "warn" }))} />
        <InventoryList title="Out of stock" items={outOfStock.map((p) => ({ name: p.name, meta: `${p.sold} sold`, href: `/admin/products`, tone: "bad" }))} />
      </div>

      <section className="card mt-5 overflow-hidden">
        <header className="border-b border-hairline px-4 py-3">
          <h2 className="font-display text-[15px] font-bold text-ink-900">Most viewed</h2>
        </header>
        <ul className="divide-y divide-hairline">
          {mostViewed.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <Link href={`/product/${p.slug}`} className="min-w-0 truncate font-semibold text-ink-900 hover:text-electric-600">
                {p.name}
              </Link>
              <span className="shrink-0 text-[12.5px] font-bold tabular-nums text-ink-400">{p.views.toLocaleString("en-IN")} views</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function InventoryList({
  title,
  items,
}: {
  title: string;
  items: { name: string; meta: string; href: string; tone?: "warn" | "bad" }[];
}) {
  return (
    <section className="card overflow-hidden">
      <header className="border-b border-hairline px-4 py-3">
        <h2 className="font-display text-[15px] font-bold text-ink-900">{title}</h2>
      </header>
      <ul className="divide-y divide-hairline">
        {items.length === 0 && <li className="px-4 py-3 text-[13px] text-ink-400">Nothing here.</li>}
        {items.map((i, idx) => (
          <li key={i.name + idx} className="flex items-center justify-between gap-3 px-4 py-3">
            <Link href={i.href} className="min-w-0 truncate font-semibold text-ink-900 hover:text-electric-600">
              {i.name}
            </Link>
            <Badge tone={i.tone === "bad" ? "deal" : i.tone === "warn" ? "warn" : "neutral"}>{i.meta}</Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}