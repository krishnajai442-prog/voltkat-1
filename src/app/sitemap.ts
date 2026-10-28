import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";
import { siteUrl } from "@/lib/utils";

export const revalidate = 3600;

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