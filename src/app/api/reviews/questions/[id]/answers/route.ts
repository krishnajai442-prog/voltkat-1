import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireActor, isStaffRole } from "@/lib/auth/guards";
import { jsonError, sanitizeText } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  body: z.string().trim().min(4).max(1500),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor();
    const { id } = await ctx.params;

    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid answer" },
        { status: 422 },
      );
    }

    const question = await prisma.question.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!question) {
      return NextResponse.json({ ok: false, error: "Question not found." }, { status: 404 });
    }

    const answer = await prisma.answer.create({
      data: {
        questionId: question.id,
        userId: actor.id,
        body: sanitizeText(parsed.data.body, 1500),
        isOfficial: isStaffRole(actor.role),
      },
      include: {
        user: { select: { name: true, role: true } },
      },
    });

    await prisma.question.update({
      where: { id: question.id },
      data: { answered: true },
    });

    return NextResponse.json({
      ok: true,
      answer: {
        id: answer.id,
        body: answer.body,
        author: isStaffRole(answer.user.role) ? "VoltKart" : answer.user.name,
        official: answer.isOfficial || isStaffRole(answer.user.role),
        at: answer.createdAt.toISOString(),
      },
    });
  } catch (e) {
    return jsonError(e, "Could post answer.");
  }
}