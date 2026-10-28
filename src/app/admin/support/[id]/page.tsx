import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { adminPage } from "@/lib/admin-page";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTicketThread } from "@/components/admin/AdminTicketThread";

export const dynamic = "force-dynamic";

export default async function AdminSupportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await adminPage();
  const { id } = await params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!ticket) notFound();

  return (
    <div>
      <AdminPageHeader title={ticket.subject} subtitle={`${ticket.reference} · ${ticket.email}`} />
      <AdminTicketThread
        ticket={{
          id: ticket.id,
          reference: ticket.reference,
          status: ticket.status,
          customer: ticket.user ? { name: ticket.user.name, email: ticket.user.email, phone: ticket.user.phone } : { name: "Guest", email: ticket.email, phone: ticket.phone },
          messages: ticket.messages.map((m) => ({
            id: m.id,
            body: m.body,
            fromStaff: m.fromStaff,
            author: m.fromStaff ? "VoltKart support" : m.user?.name ?? "Customer",
            createdAt: m.createdAt.toISOString(),
          })),
        }}
      />
    </div>
  );
}