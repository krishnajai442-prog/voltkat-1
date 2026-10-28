import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

(async () => {
  const rows = await p.order.findMany({ take: 20 });
  if (rows.length === 0) {
    console.log("No orders in the table at all.");
    await p.$disconnect();
    return;
  }

  console.log("columns:", Object.keys(rows[0]!).join(", "));
  console.log("");

  for (const o of rows) {
    const rec = o as Record<string, unknown>;
    const numEntry = Object.entries(rec).find(
      ([k, v]) => typeof v === "string" && /orderno|order_no|number|code/i.test(k),
    );
    console.log(
      "---- id:", rec.id,
      "|", numEntry ? `${numEntry[0]}: ${numEntry[1]}` : "(no order-number column)",
      "| status:", rec.status,
    );
    for (const [k, v] of Object.entries(rec)) {
      if (/otp/i.test(k)) console.log("     ", k, "=", JSON.stringify(v));
    }
  }

  await p.$disconnect();
})();