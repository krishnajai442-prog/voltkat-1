import { NextResponse } from "next/server";
import { getActor } from "@/lib/auth/guards";  
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  try {
    const me = await getActor(); // Adjust based on your auth provider
    
    if (!me?.email) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }
    
    const { orderNumber } = await params;
    
    const order = await prisma.order.findFirst({
      where: {
        orderNumber,
        OR: [
  { userId: me.id },
  { guestEmail: me.email },
],
      },
      include: {
        items: { select: { name: true, quantity: true, unitPrice: true } },
      },
    });
    
    if (!order) {
      return NextResponse.json({ ok: false, error: "Order not found or doesn't belong to you." }, { status: 404 });
    }
    
    return NextResponse.json({ ok: true, order });
    
  } catch (err) {
    console.error("My-order lookup failed:", err);
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}