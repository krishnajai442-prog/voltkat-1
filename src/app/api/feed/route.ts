import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { productSelect, toCards } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "12"), 24); // Cap at 24

    const skip = (page - 1) * limit;

    const products = await prisma.product.findMany({
      where: { active: true, stock: { gt: 0 } },
      select: productSelect,
      orderBy: [{ ratingAvg: "desc" }, { sold: "desc" }],
      skip,
      take: limit,
    });

    return NextResponse.json({
      ok: true,
      items: toCards(products),
      page,
      hasMore: products.length === limit,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Feed failed" }, { status: 500 });
  }
}