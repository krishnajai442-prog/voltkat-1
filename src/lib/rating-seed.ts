// One source of truth for the demo rating scheme. Used by the admin create route
// (future products) AND the backfill seed (today's products) so both agree exactly.

export const SAMPLE_REVIEWS = [
  { rating: 5, title: "Excellent build", body: "Arrived in two days, packaging was solid. The aluminium body feels premium and the screen is genuinely bright. No complaints so far." },
  { rating: 5, title: "Worth the price", body: "Upgraded from a 3-year-old machine and the difference is night and day. Boots fast, runs my dev stack without the fan screaming." },
  { rating: 4, title: "Very good, minor nit", body: "Performance and display are great. Only gripe is the charger brick is bulky — would have liked a smaller adapter. Otherwise happy." },
  { rating: 5, title: "Smooth and quiet", body: "Keyboard travel is comfortable, trackpad is accurate, and it stays cool during long sessions. Delivery was on time too." },
  { rating: 4, title: "Solid laptop", body: "Does everything I need for work and light editing. Speakers are average but the panel and battery life make up for it." },
  { rating: 5, title: "Highly recommend", body: "GST invoice came through cleanly and warranty registration was easy. Build quality matches what VoltKart listed. Happy buyer." },
];

export const REVIEW_TARGET = 6; // max sample cards per product (capped by your user pool)

/** Deterministic, varied, ALWAYS >= 1200. Spread straight into a Prisma create/update `data`. */
export function seedRating(name: string): { ratingCount: number; ratingAvg: number } {
  const h = hash(name) >>> 0;
  return {
    ratingCount: 1200 + (h % 301),          // 1200..1500
    ratingAvg: +(((41 + ((h >>> 3) % 7))) / 10).toFixed(1), // 4.1..4.7
  };
}

/** Build review rows from a DISTINCT userId list (caller guarantees freshness -> @@unique safe). */
export function buildReviewPicks(productId: string, userIds: string[], count = userIds.length) {
  const n = Math.min(count, userIds.length, SAMPLE_REVIEWS.length);
  const off = hash(productId) >>> 0;
  return Array.from({ length: n }, (_, i) => {
    const r = SAMPLE_REVIEWS[(off + i) % SAMPLE_REVIEWS.length]!;
    const u = userIds[i]!;
    return { productId, userId: u, rating: r.rating, title: r.title, body: r.body };
  });
}

function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }