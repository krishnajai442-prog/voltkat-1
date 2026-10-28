import prisma from "@/lib/prisma";
import { adminPage } from "@/lib/admin-page";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CustomersTable } from "@/components/admin/CustomersTable";
import { Input } from "@/components/ui/Input";
import { formatDate, inr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await adminPage();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const where: any = { role: "CUSTOMER" };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ];
  }

  const [customers, spendRows, lastOrderRows] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        active: true,
        whatsappOptIn: true,
        _count: { select: { orders: true } },
      },
    }),
    prisma.order.groupBy({
      by: ["userId"],
      where: { userId: { not: null }, paymentStatus: "PAID" },
      _sum: { total: true },
    }),
    prisma.order.findMany({
      where: { userId: { not: null } },
      orderBy: { createdAt: "desc" },
      distinct: ["userId"],
      select: { userId: true, createdAt: true, orderNumber: true },
    }),
  ]);

  const spendMap = new Map(spendRows.map((r) => [r.userId, Number(r._sum.total ?? 0)]));
  const lastMap = new Map(lastOrderRows.map((r) => [r.userId, r]));

  const rows = customers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    createdAt: c.createdAt.toISOString(),
    active: c.active,
    whatsappOptIn: c.whatsappOptIn,
    orderCount: c._count.orders,
    totalSpent: spendMap.get(c.id) ?? 0,
    lastOrderAt: lastMap.get(c.id)?.createdAt.toISOString() ?? null,
    lastOrderNumber: lastMap.get(c.id)?.orderNumber ?? null,
  }));

  return (
    <div>
      <AdminPageHeader title="Customers" subtitle="Accounts, purchase value and support context." />

      <form className="card mb-4 flex gap-3 p-4">
        <Input containerClassName="flex-1" name="q" defaultValue={q} placeholder="Search name, email, phone…" />
        <button type="submit" className="h-12 rounded-xl bg-ink-900 px-5 text-[13.5px] font-bold text-white hover:bg-electric-600">
          Search
        </button>
      </form>

      <CustomersTable initial={rows} />
    </div>
  );
}