import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const now = new Date();
  const r1 = await p.order.updateMany({
    where: { processedAt: null, status: { in: ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"] } },
    data: { processedAt: now },
  });
  const r2 = await p.order.updateMany({
    where: { outForDeliveryAt: null, status: { in: ["OUT_FOR_DELIVERY", "DELIVERED"] } },
    data: { outForDeliveryAt: now },
  });
  console.log(`backfilled: processedAt=${r1.count}, outForDeliveryAt=${r2.count}`);
  await p.$disconnect();
})();