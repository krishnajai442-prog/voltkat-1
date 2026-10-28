import prisma from "@/lib/prisma";
import { seedRating, buildReviewPicks, REVIEW_TARGET } from "@/lib/rating-seed";

async function main() {
  let users = await prisma.user.findMany({ where: { role: { not: "ADMIN" } }, select: { id: true } });
  if (!users.length) users = await prisma.user.findMany({ select: { id: true } });
  if (!users.length) { console.log("No users in DB — cannot author reviews. Seed one user first."); return; }
  const userIds = users.map((u) => u.id);

  // Probe aggregate column names up front: throws "Unknown field" BEFORE any write if wrong.
  const products = await prisma.product.findMany({ select: { id: true, name: true, ratingAvg: true, ratingCount: true } });

  // existing reviewers per product (one round trip) -> pick only fresh authors, keep @@unique intact
  const taken = new Map<string, Set<string>>();
  const rowCount = new Map<string, number>();
  for (const r of await prisma.review.findMany({ select: { productId: true, userId: true } })) {
    if (!taken.has(r.productId)) taken.set(r.productId, new Set());
    taken.get(r.productId)!.add(r.userId);
    rowCount.set(r.productId, (rowCount.get(r.productId) ?? 0) + 1);
  }

  let counterSet = 0, rowsAdded = 0, productsTouched = 0;
  for (const p of products) {
    // 1) counter — unconditional & deterministic (same formula as the route) -> idempotent, >=1200
    const { ratingCount, ratingAvg } = seedRating(p.name);
    try {
      await prisma.product.update({ where: { id: p.id }, data: { ratingCount, ratingAvg } });
      counterSet++;
    } catch (e) { console.error(`✗ agg ${p.id}:`, e instanceof Error ? e.message : e); continue; }

    // 2) top up visible cards to target, from users who haven't reviewed THIS product
    const used = taken.get(p.id) ?? new Set<string>();
    const fresh = userIds.filter((id) => !used.has(id));
    const need = Math.max(0, REVIEW_TARGET - (rowCount.get(p.id) ?? 0));
    const picks = buildReviewPicks(p.id, fresh, Math.min(need, fresh.length));
    if (!picks.length) continue;
    try {
      await prisma.review.createMany({ data: picks });
      rowsAdded += picks.length; productsTouched++;
    } catch (e) { console.error(`✗ rows ${p.id}:`, e instanceof Error ? e.message : e); }
  }
  console.log(`Done. Counter set on ${counterSet}/${products.length}; added ${rowsAdded} review row(s) across ${productsTouched} product(s).`);
}

main().catch(console.error).finally(() => prisma.$disconnect());