import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";
import { siteUrl } from "@/lib/utils";

// Generate on demand, never at build time. This is the entire point: a DB-backed
// sitemap must not be prerendered during `next build`, because the build machine has
// no DATABASE_URL (and Neon may be asleep) — which is exactly what killed the last
// deploy ("Environment variable not found: DATABASE_URL" while generating static
// pages). force-dynamic excludes this route from static generation, so the build is
// immune; at runtime Vercel injects the env and the query runs against the live pooler.
// We DROP `revalidate = 3600` on purpose: ISR would still seed this route at build
// time — the very behavior being removed. A sitemap is crawled rarely, so per-request
// generation is cheap; if you later want caching, add a short-TTL Upstash read here,
// not ISR.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await prisma.product.findMany({
    where: { active: true },
    select: { slug: true, updatedAt: true },
    take: 5000,
  });

  const categories = await prisma.category.findMany({
    where: { active: true },
    select: { slug: true },
  });

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: siteUrl("/products/all"), changeFrequency: "daily", priority: 0.9 },
    { url: siteUrl("/offers"), changeFrequency: "daily", priority: 0.8 },
    { url: siteUrl("/track"), changeFrequency: "monthly", priority: 0.5 },
    { url: siteUrl("/contact"), changeFrequency: "monthly", priority: 0.5 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: siteUrl(`/products/${c.slug}`),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: siteUrl(`/product/${p.slug}`),
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}