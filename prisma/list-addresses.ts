import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const rows = await p.address.findMany({
    orderBy: [{ userId: "asc" }, { isDefault: "desc" }, { createdAt: "desc" }],
    select: { id: true, userId: true, label: true, fullName: true, line1: true, city: true, pincode: true, isDefault: true },
  });
  console.log("TOTAL addresses in DB:", rows.length);
  const byUser = new Map<string, number>();
  for (const r of rows) byUser.set(r.userId, (byUser.get(r.userId) ?? 0) + 1);
  console.log("per user:", [...byUser.entries()].map(([u, n]) => `${u}=${n}`).join(", ") || "(none)");
  console.log("");
  for (const r of rows)
    console.log(`${r.isDefault ? "* " : "  "}[${r.label}] ${r.fullName} — ${r.line1}, ${r.city} ${r.pincode} (user ${r.userId})`);
  await p.$disconnect();
})();