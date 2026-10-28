import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getActor } from "@/lib/auth/guards";
import { SupportCenter } from "@/components/account/SupportCenter";

export const dynamic = "force-dynamic";

export default async function AccountSupportPage() {
  const actor = await getActor();
  if (!actor) redirect("/auth/login?next=/account/support");

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: actor.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true } } },
      },
    },
  });

  return (
    <SupportCenter
      tickets={tickets.map((t) => ({
        id: t.id,
        reference: t.reference,
        subject: t.subject,
        category: t.category,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        messages: t.messages.map((m) => ({
          id: m.id,
          body: m.body,
          fromStaff: m.fromStaff,
          author: m.fromStaff ? "VoltKart support" : m.user?.name ?? "You",
          createdAt: m.createdAt.toISOString(),
        })),
      }))}
    />
  );
}