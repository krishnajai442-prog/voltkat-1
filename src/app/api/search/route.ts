import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { productSelect, searchProducts, toCards } from "@/lib/catalog";
import { searchQuerySchema } from "@/lib/validators";
import { jsonError } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const rl = await rateLimit("search", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const url = new URL(req.url);
    const entries = Object.fromEntries(url.searchParams.entries());

    const parsed = searchQuerySchema.safeParse(entries);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid search" },
        { status: 422 },
      );
    }

    const input = parsed.data;
    const result = await searchProducts(input, input.category === "all" ? null : input.category);

    return NextResponse.json({
      ok: true,
      items: result.items,
      total: result.total,
      page: result.page,
      perPage: result.perPage,
    });
  } catch (e) {
    return jsonError(e, "Search failed.");
  }
}

export async function POST(req: Request) {
  return GET(req);
}