import { readFileSync } from "node:fs";
import prisma from "../src/lib/prisma";

// Same constraints as check-copy.ts: CJS project (no top-level await) and tsx does
// NOT auto-load .env (only the Prisma CLI / Bun do), so load it manually.
try {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    const key = m?.[1];
    const val = m?.[2];
    if (key && val !== undefined && !(key in process.env)) {
      process.env[key] = val.replace(/^["']|["']$/g, "");
    }
  }
} catch {
  /* rely on already-exported env if .env is unreadable */
}

const srcSlug = process.argv[2];
const dstSlug = process.argv[3];

async function main() {
  if (!srcSlug || !dstSlug) {
    console.error("usage: npx tsx prisma/copy-reviews.ts <source-slug> <target-slug>");
    return;
  }
  const src = await prisma.product.findUnique({
    where: { slug: srcSlug },
    include: { reviews: true, questions: { include: { answers: true } } },
  });
  const dst = await prisma.product.findUnique({
    where: { slug: dstSlug },
    include: { reviews: { select: { id: true } }, questions: { select: { id: true } } },
  });
  if (!src || !dst) {
    console.log(`not found: src=${!!src} dst=${!!dst}`);
    return;
  }
  if (dst.reviews.length > 0 || dst.questions.length > 0) {
    console.log(`target already has ${dst.reviews.length} reviews / ${dst.questions.length} questions — refusing to double-copy.`);
    return;
  }
  if (src.reviews.length === 0 && src.questions.length === 0) {
    console.log("source has no reviews or questions to copy.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (src.reviews.length) {
      await tx.review.createMany({
        data: src.reviews.map((r) => ({
          productId: dst.id,
          userId: r.userId,
          orderId: r.orderId,
          rating: r.rating,
          title: r.title,
          body: r.body,
          images: [...(r.images ?? [])],
          verified: r.verified,
          helpfulCount: r.helpfulCount,
          published: r.published,
          createdAt: r.createdAt,
        })),
      });
    }
    for (const q of src.questions) {
      const nq = await tx.question.create({
        data: {
          productId: dst.id,
          userId: q.userId,
          body: q.body,
          answered: q.answered,
          createdAt: q.createdAt,
        },
      });
      if (q.answers.length) {
        await tx.answer.createMany({
          data: q.answers.map((a) => ({
            questionId: nq.id,
            userId: a.userId,
            body: a.body,
            isOfficial: a.isOfficial,
            createdAt: a.createdAt,
          })),
        });
      }
    }
    await tx.product.update({
      where: { id: dst.id },
      data: { ratingAvg: src.ratingAvg, ratingCount: src.ratingCount },
    });
  });

  console.log(
    `copied ${src.reviews.length} reviews + ${src.questions.length} questions onto ${dstSlug}; rating set to ${src.ratingAvg} / ${src.ratingCount}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());