import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("rzpOrderId");
  if (!id) {
    return NextResponse.json({ ok: false, status: "UNKNOWN" }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId: id },
    include: {
      order: {
        select: {
          orderNumber: true,
          status: true,
        },
      },
    },
  });

  if (!payment) {
    return NextResponse.json({ ok: false, status: "UNKNOWN" });
  }

  if (payment.status === "FAILED") {
    return NextResponse.json({
      ok: false,
      status: "FAILED",
      error: payment.failureReason ?? "Payment failed.",
    });
  }

  const isConverted =
    payment.order &&
    !payment.order.orderNumber.startsWith("VKINT") &&
    payment.order.status !== "PENDING";

  if (payment.status === "PAID" && isConverted) {
    return NextResponse.json({
      ok: true,
      status: "PAID",
      orderNumber: payment.order.orderNumber,
    });
  }

  return NextResponse.json({ ok: true, status: payment.status });
}