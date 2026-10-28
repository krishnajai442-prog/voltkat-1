import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/auth/guards";
import { jsonError } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await ctx.params;

    const [user, orders, reviews, tickets, feedback, spend, orderCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
          active: true,
          whatsappOptIn: true,
          role: true,
        },
      }),
      prisma.order.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          total: true,
          createdAt: true,
          _count: { select: { items: true } },
        },
      }),
      prisma.review.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          rating: true,
          body: true,
          createdAt: true,
        },
      }),
      prisma.supportTicket.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          reference: true,
          subject: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.feedback.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          overall: true,
          comment: true,
          createdAt: true,
        },
      }),
      prisma.order.aggregate({
        where: { userId: id, paymentStatus: "PAID" },
        _sum: { total: true },
      }),
      prisma.order.count({ where: { userId: id } }),
    ]);

    if (!user) {
      return NextResponse.json({ ok: false, error: "Customer not found." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      detail: {
        user: {
          ...user,
          createdAt: user.createdAt.toISOString(),
          totalSpent: Number(spend._sum.total ?? 0),
          orderCount,
          lastOrderAt: orders[0]?.createdAt.toISOString() ?? null,
          lastOrderNumber: orders[0]?.orderNumber ?? null,
        },
        orders: orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          paymentStatus: o.paymentStatus,
          total: o.total,
          itemCount: o._count.items,
          createdAt: o.createdAt.toISOString(),
        })),
        reviews: reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          body: r.body,
          createdAt: r.createdAt.toISOString(),
        })),
        tickets: tickets.map((t) => ({
          id: t.id,
          reference: t.reference,
          subject: t.subject,
          status: t.status,
          createdAt: t.createdAt.toISOString(),
        })),
        feedback: feedback.map((f) => ({
          id: f.id,
          overall: f.overall,
          comment: f.comment,
          createdAt: f.createdAt.toISOString(),
        })),
      },
    });
  } catch (e) {
    return jsonError(e, "Customer lookup failed.");
  }
}