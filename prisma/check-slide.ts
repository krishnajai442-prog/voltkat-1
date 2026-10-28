import { readFileSync } from "node:fs";
import prisma from "../src/lib/prisma";

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
  /* rely on already-exported env */
}

async function main() {
  const rows = await prisma.heroSlideProduct.findMany({
    include: {
      slide: { select: { headline: true } },
      product: { select: { name: true } },
    },
    orderBy: [{ slideId: "asc" }, { position: "asc" }],
  });
  if (!rows.length) console.log("no attached products on any slide");
  for (const r of rows) {
    console.log(`${r.slide.headline} | ${r.product.name}\n    image=${JSON.stringify(r.image ?? null)}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());