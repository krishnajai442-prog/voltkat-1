import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { productSelect, toCards } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Hydrates the cart's bottom rails + the saved-for-later list. Two modes, both over
 * the REAL catalog: ?n&exclude -> random draw over EVERY active+in-stock product minus
 * excluded ids (whole-catalog dynamic, no gate/window, so a product you add later is
 * eligible next load); ?ids=a,b -> the CardVM for those ids (saved-for-later + the
 * view-history rails), dropping inactive ones. Returns CardVM[]; failures return [] so
 * a rail/list simply hides instead of crashing the cart.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get("ids");

    if (idsParam) {
      const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 24);
      if (!ids.length) return NextResponse.json({ ok: true, products: [] });
      const rows = await prisma.product.findMany({ where: { id: { in: ids }, active: true }, select: productSelect });
      const byId = new Map(rows.map((r) => [r.id, r] as const));
      const ordered = ids.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => Boolean(r));
      return NextResponse.json({ ok: true, products: toCards(ordered) });
    }

    const n = Math.min(24, Math.max(1, Number(searchParams.get("n") ?? 12) || 12));
    const exclude = new Set((searchParams.get("exclude") ?? "").split(",").map((s) => s.trim()).filter(Boolean));
    const cand = await prisma.product.findMany({ where: { active: true, stock: { gt: 0 } }, select: { id: true } });
    const pool = cand.filter((c) => !exclude.has(c.id));
    if (!pool.length) return NextResponse.json({ ok: true, products: [] });
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const a = shuffled[i]!; shuffled[i] = shuffled[j]!; shuffled[j] = a;
    }
    const picked = shuffled.slice(0, n).map((r) => r.id);
    const rows = await prisma.product.findMany({ where: { id: { in: picked } }, select: productSelect });
    const byId = new Map(rows.map((r) => [r.id, r] as const));
    const ordered = picked.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => Boolean(r));
    return NextResponse.json({ ok: true, products: toCards(ordered) });
  } catch {
    return NextResponse.json({ ok: true, products: [] });
  }
}