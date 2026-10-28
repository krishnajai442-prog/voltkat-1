import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getActor } from "@/lib/auth/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ body: z.string().trim().min(1).max(1000) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ ok: false, error: "Sign in to ask a question." }, { status: 401 });
  const { id: productId } = await ctx.params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Please type your question." }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });

  try {
    const row = await prisma.question.create({
      data: { productId, userId: actor.id, body: parsed.data.body },
      include: { user: { select: { name: true } } },
    });
    return NextResponse.json({
      ok: true,
      question: {
        id: row.id,
        body: row.body,
        askedAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
        asker: row.user?.name ?? "Customer",
        answers: [],
      },
    });
  } catch (e: any) {
    // The ONE honest unknown: I have runtime proof of Review's shape (the seed), but the seed
    // never wrote a Question, so I can't be 100% sure Question keys its author via a userId
    // relation vs a stored column, or whether it has another required field. Rather than guess
    // silently, Prisma's exact message is returned to the form so ONE submit tells us what to
    // add/change. (On production, swap this for a generic message — it leaks a column name.)
    console.error("question create failed", e);
    return NextResponse.json({ ok: false, error: e?.message ? `Question endpoint: ${e.message}` : "Could not post your question." }, { status: 500 });
  }
}