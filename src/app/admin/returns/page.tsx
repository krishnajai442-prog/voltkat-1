import prisma from "@/lib/prisma";
import { adminPage } from "@/lib/admin-page";
import { can } from "@/lib/auth/guards";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ReturnsManager } from "@/components/admin/ReturnsManager";

export const dynamic = "force-dynamic";

export default async function AdminReturnsPage() {
  const actor = await adminPage();

  const returns = await prisma.returnRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      order: { select: { orderNumber: true, total: true, paymentStatus: true, user: { select: { name: true, email: true } } } },
      orderItem: { select: { name: true, lineTotal: true, product: { select: { id: true, name: true, stock: true } } } },
      user: { select: { name: true, email: true } },
    },
  });

  return (
    <div>
      <AdminPageHeader title="Returns" subtitle="Approve, reject, pick up, replace or refund return requests." />
      <ReturnsManager
        initial={returns.map((r) => ({
          id: r.id,
          status: r.status,
          reason: r.reason,
          details: r.details,
          resolution: r.resolution,
          adminNote: r.adminNote,
          createdAt: r.createdAt.toISOString(),
          orderNumber: r.order.orderNumber,
          orderTotal: r.order.total,
          paymentStatus: r.order.paymentStatus,
          customer: r.user?.name ?? r.order.user?.name ?? "Guest",
          email: r.user?.email ?? r.order.user?.email ?? "—",
          itemName: r.orderItem.name,
          itemTotal: r.orderItem.lineTotal,
          productId: r.orderItem.product?.id ?? null,
          stock: r.orderItem.product?.stock ?? null,
        }))}
        canRefund={can.refund(actor.role)}
      />
    </div>
  );
}