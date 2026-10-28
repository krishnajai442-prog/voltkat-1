import Link from "next/link";
import prisma from "@/lib/prisma";
import { adminPage } from "@/lib/admin-page";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Tabs } from "@/components/ui/Tabs";
import { Input } from "@/components/ui/Input";
import { formatDateTime, relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUSES = ["ALL", "OPEN", "UNDER_REVIEW", "RESOLVED", "CLOSED"] as const;

export default async function AdminSupportPage({
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
      { reference: { contains: q, mode: "insensitive" } },
      { subject: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [tickets, counts] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { user: { select: { name: true, email: true } }, _count: { select: { messages: true } } },
    }),
    prisma.supportTicket.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
  const total = counts.reduce((s, c) => s + c._count._all, 0);

  return (
    <div>
      <AdminPageHeader title="Support" subtitle="Customer tickets, replies and resolution workflow." />

      <form className="card mb-4 flex gap-3 p-4">
        <Input containerClassName="flex-1" name="q" defaultValue={q} placeholder="Search reference, subject, customer…" />
        <input type="hidden" name="status" value={status} />
        <button type="submit" className="h-12 rounded-xl bg-ink-900 px-5 text-[13.5px] font-bold text-white hover:bg-electric-600">Search</button>
      </form>

      <Tabs
        className="mb-4"
        value={status}
        onChange={() => {}}
        items={STATUSES.map((s) => ({
          value: s,
          label: s === "ALL" ? "All" : s.replace(/_/g, " "),
          count: s === "ALL" ? total : countMap[s] ?? 0,
          href: `/admin/support?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
        }))}
      />

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-[13px]">
            <thead className="bg-canvas text-left text-[11px] font-bold uppercase tracking-wider text-ink-300">
              <tr>
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-canvas/50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/support/${t.id}`} className="font-bold text-ink-900 hover:text-electric-600">
                      {t.reference}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-ink-300">{formatDateTime(t.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900">{t.user?.name ?? "Guest"}</p>
                    <p className="text-[11.5px] text-ink-400">{t.user?.email ?? t.email}</p>
                  </td>
                  <td className="max-w-72 truncate px-4 py-3 text-ink-700">{t.subject}</td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3 text-ink-400">{relativeTime(t.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}