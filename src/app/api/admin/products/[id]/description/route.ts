import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { can, requireStaff } from "@/lib/auth/guards";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { ok, validationError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Dedicated, minimal schema for the long-form description column. Kept OUT of
// productInputSchema on purpose: the main [id] PATCH rebuilds specifications on
// every save, so routing description through it would risk clobbering specs. A
// bounded string here is the safe, isolated write path (empty -> null).
const payload = z.object({
  description: z.string().trim().max(20000).optional().or(z.literal("")),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const rl = await rateLimit("adminMutation", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const actor = await requireStaff();
    if (!can.manageCatalog(actor.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const parsed = payload.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);

    const exists = await prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });

    const description = (parsed.data.description ?? "").trim() || null;
    const updated = await prisma.product.update({
      where: { id },
      data: { description },
      select: { id: true, description: true },
    });

    return ok({ product: updated });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Description update failed" },
      { status: 500 },
    );
  }
}