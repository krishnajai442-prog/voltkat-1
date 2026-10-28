import { readFileSync } from "node:fs";
import prisma from "../src/lib/prisma";

// tsx (unlike the Prisma CLI / Bun) does NOT auto-load .env, and this project is CJS
// (no "type": "module"), so: manual .env load + everything inside async main()
// (top-level await is unsupported in the cjs output format).
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

const slug = process.argv[2];

async function main() {
  if (!slug) {
    console.error("usage: npx tsx prisma/check-copy.ts <slug>");
    return;
  }
    if (slug.startsWith("like:")) {
    const rows = await prisma.product.findMany({
      where: { slug: { contains: slug.slice(5), mode: "insensitive" } },
      select: {
        slug: true, name: true, active: true, ratingAvg: true, ratingCount: true,
        reviews: { select: { id: true } },
        images: { select: { kind: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    if (!rows.length) console.log("no matches");
    for (const r of rows) {
      const showcase = r.images.filter((i) => i.kind === "SHOWCASE").length;
      console.log(
        `${r.slug}\n    reviews=${r.reviews.length} rating=${r.ratingAvg}/${r.ratingCount} showcase=${showcase} active=${r.active}\n    ${r.name}`,
      );
    }
    return;
  }

  const p = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: true,
      specifications: true,
      reviews: true,
      questions: { include: { answers: true } },
    },
  });
  if (!p) {
    console.log(`NO PRODUCT for slug: ${slug}`);
    return;
  }
  const img = (k: string) => p.images.filter((i) => (i.kind ?? "GALLERY") === k).length;
  const spec = (k: string) => p.specifications.filter((s) => (s.kind ?? "SPEC") === k).length;
  console.log(`\n${p.slug}`);
  console.log(`  name       : ${p.name}`);
  console.log(`  active     : ${p.active}  featured: ${p.featured}`);
  console.log(`  rating     : ${p.ratingAvg}  count: ${p.ratingCount}`);
  console.log(`  sold/views : ${p.sold} / ${p.views}`);
  console.log(`  images     : GALLERY=${img("GALLERY")} SHOWCASE=${img("SHOWCASE")}`);
  console.log(`  specs      : SPEC=${spec("SPEC")} WARRANTY=${spec("WARRANTY")} MFG=${spec("MFG")}`);
  console.log(`  reviews    : ${p.reviews.length} (published ${p.reviews.filter((r) => r.published).length})`);
  console.log(`  questions  : ${p.questions.length} (answers ${p.questions.reduce((s, q) => s + q.answers.length, 0)})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());