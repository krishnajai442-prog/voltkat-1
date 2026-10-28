import Link from "next/link";
import { ArrowRight } from "lucide-react";
import prisma from "@/lib/prisma";
import { getActor } from "@/lib/auth/guards";
import { OrdersClient, type OrderVM } from "./OrdersClient";

export default async function MyOrdersPage() {
  const me = await getActor();
  if (!me?.email) {
    return (
      <div className="container-x py-8 text-center">
        <p>Please log in to view your orders.</p>
        <Link href="/auth/login" className="mt-4 inline-block font-bold text-[#2874f0] hover:underline">Sign In →</Link>
      </div>
    );
  }
  
  const orders = await prisma.order.findMany({
    where: { OR: [{ userId: me.id }, { guestEmail: me.email }] },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      items: { select: { name: true, quantity: true, image: true, brand: true } },
    },
  });
  
  if (orders.length === 0) {
    return (
      <div className="container-x py-8 text-center">
        <h2 className="mb-2 text-lg font-bold">No orders yet</h2>
        <p className="text-sm text-gray-600">Start shopping to track deliveries!</p>
        <Link href="/" className="mt-4 inline-flex items-center gap-1 rounded bg-[#2874f0] px-4 py-2 text-white hover:bg-blue-700">Browse Products <ArrowRight className="size-4"/></Link>
      </div>
    );
  }
  
  // Serialize dates (Date objects don't round-trip through RSC props cleanly).
  const serialized: OrderVM[] = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    confirmedAt: o.confirmedAt?.toISOString() ?? null,
    shippedAt: o.shippedAt?.toISOString() ?? null,
    deliveredAt: o.deliveredAt?.toISOString() ?? null,
    cancelledAt: o.cancelledAt?.toISOString() ?? null,
    items: o.items,
  }));
  
  return <OrdersClient orders={serialized} />;
}