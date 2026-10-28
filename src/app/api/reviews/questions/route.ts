import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActor } from "@/lib/auth/guards";
import { questionSchema } from "@/lib/validators";
import { jsonError, sanitizeText } from "@/lib/utils";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rl = await rateLimit("form", clientIp(req));
  if (!rl.success) return tooMany(rl);

  try {
    const actor = await requireActor();

    const parsed = questionSchema.safeParse(await req.json().catch(() => ({})));

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid question",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const data = parsed.data;

    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      select: { id: true, active: true },
    });

    if (!product || !product.active) {
      return NextResponse.json({ ok: false, error: "Product not found." }, { status: 404 });
    }

    const question = await prisma.question.create({
      data: {
        productId: product.id,
        userId: actor.id,
        body: sanitizeText(data.body, 500),
      },
    });

    return NextResponse.json({
      ok: true,
      question: {
        id: question.id,
        body: question.body,
        askedAt: question.createdAt.toISOString(),
        asker: actor.name,
        answers: [],
      },
    });
  } catch (e) {
    return jsonError(e, "Could post question.");
  }
}