import type { Prisma } from "@prisma/client";
import prisma from "./prisma";
import { discountPercent } from "./utils";
import { searchQuerySchema } from "./validators";

export type SearchInput = ReturnType<typeof searchQuerySchema.parse>;

export const productSelect = {
  id: true,
  slug: true,
  name: true,
  shortDescription: true,
  mrp: true,
  salePrice: true,
  discountPercent: true,
  stock: true,
  lowStockAt: true,
  ratingAvg: true,
  ratingCount: true,
  sold: true,
  views: true,
  featured: true,
  active: true,
  subtype: true,
  ram: true,
  storage: true,
  screenSize: true,
  processor: true,
  color: true,
  warrantyMonths: true,
  returnableDays: true,
  hsnCode: true,
  tags: true,
  createdAt: true,
  emiEligible: true,
  codEligible: true,
  exchangeEligible: true,
  category: { select: { slug: true, name: true } },
  brand: { select: { slug: true, name: true } },
  images: {
    select: { url: true, alt: true, isPrimary: true, position: true },
    orderBy: { position: "asc" as const },
  },
} satisfies Prisma.ProductSelect;

export type ProductRow = Prisma.ProductGetPayload<{
  select: typeof productSelect;
}>;

export type CardVM = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  brand: string;
  brandSlug: string;
  categoryName: string;
  categorySlug: string;
  image: string;
  mrp: number;
  salePrice: number;
  discountPercent: number;
  stock: number;
  lowStockAt: number;
  ratingAvg: number;
  ratingCount: number;
  sold: number;
  emiEligible: boolean;
  exchangeEligible: boolean;
  codEligible: boolean;
  subtype: string | null;
  ram: string | null;
  storage: string | null;
  screenSize: string | null;
  processor: string | null;
  color: string | null;
  warrantyMonths: number;
  returnableDays: number;
  tags: string[];
};

export const SORT_OPTIONS = [
  { value: "popular", label: "Popular" },
  { value: "newest", label: "Newest" },
  { value: "priceLow", label: "Price: Low to High" },
  { value: "priceHigh", label: "Price: High to Low" },
  { value: "discount", label: "Biggest Discount" },
  { value: "rating", label: "Top Rated" },
] as const;

export const PRICE_BUCKETS = [
  { label: "Under ₹5,000", min: 0, max: 5000 },
  { label: "₹5,000 – ₹15,000", min: 5000, max: 15000 },
  { label: "₹15,000 – ₹30,000", min: 15000, max: 30000 },
  { label: "₹30,000 – ₹60,000", min: 30000, max: 60000 },
  { label: "Above ₹60,000", min: 60000, max: undefined },
] as const;

function imageFromProduct(p: ProductRow): string {
  const primary = p.images.find((i) => i.isPrimary) ?? p.images[0];
  return (
    primary?.url ??
    `https://picsum.photos/seed/${encodeURIComponent(p.slug)}/900/900`
  );
}

export function toCards(products: ProductRow[]): CardVM[] {
  return products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortDescription: p.shortDescription,
    brand: p.brand.name,
    brandSlug: p.brand.slug,
    categoryName: p.category.name,
    categorySlug: p.category.slug,
    image: imageFromProduct(p),
    mrp: p.mrp,
    salePrice: p.salePrice,
    discountPercent: p.discountPercent || discountPercent(p.mrp, p.salePrice),
    stock: p.stock,
    lowStockAt: p.lowStockAt,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    sold: p.sold,
    emiEligible: p.emiEligible,
    exchangeEligible: p.exchangeEligible,
    codEligible: p.codEligible,
    subtype: p.subtype,
    ram: p.ram,
    storage: p.storage,
    screenSize: p.screenSize,
    processor: p.processor,
    color: p.color,
    warrantyMonths: p.warrantyMonths,
    returnableDays: p.returnableDays,
    tags: p.tags,
  }));
}

function csvToArray(value?: string | null): string[] {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  );
}

export async function searchProducts(
  input: SearchInput,
  categorySlug?: string | null,
) {
  const where: Prisma.ProductWhereInput = {
    active: true,
  };

  if (categorySlug && categorySlug !== "all") {
    where.category = { slug: categorySlug };
  }

  const q = input.q?.trim();
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { shortDescription: { contains: q, mode: "insensitive" } },
      { brand: { name: { contains: q, mode: "insensitive" } } },
      { category: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const brands = csvToArray(input.brands);
  if (brands.length) {
    where.brand = { slug: { in: brands } };
  }

  const subtypes = csvToArray(input.subtypes);
  if (subtypes.length) where.subtype = { in: subtypes };

  const ram = csvToArray(input.ram);
  if (ram.length) where.ram = { in: ram };

  const storage = csvToArray(input.storage);
  if (storage.length) where.storage = { in: storage };

  const screenSize = csvToArray(input.screenSize);
  if (screenSize.length) where.screenSize = { in: screenSize };

  const processor = csvToArray(input.processor);
  if (processor.length) where.processor = { in: processor };

  const color = csvToArray(input.color);
  if (color.length) where.color = { in: color };

  const price: Prisma.IntFilter = {};
  if (input.minPrice != null) price.gte = input.minPrice;
  if (input.maxPrice != null) price.lte = input.maxPrice;
  if (Object.keys(price).length) where.salePrice = price;

  if (input.minRating != null) {
    where.ratingAvg = { gte: input.minRating };
  }

  if (input.minDiscount != null) {
    where.discountPercent = { gte: input.minDiscount };
  }

  if (input.inStock) {
    where.stock = { gt: 0 };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput[] = (() => {
    switch (input.sort) {
      case "newest":
        return [{ createdAt: "desc" }];
      case "priceLow":
        return [{ salePrice: "asc" }];
      case "priceHigh":
        return [{ salePrice: "desc" }];
      case "discount":
        return [{ discountPercent: "desc" }, { sold: "desc" }];
      case "rating":
        return [{ ratingAvg: "desc" }, { ratingCount: "desc" }];
      case "popular":
      default:
        return [{ sold: "desc" }, { ratingAvg: "desc" }, { views: "desc" }];
    }
  })();

  const skip = (input.page - 1) * input.perPage;

  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: productSelect,
      orderBy,
      skip,
      take: input.perPage,
    }),
  ]);

  return {
    items: toCards(rows),
    total,
    page: input.page,
    perPage: input.perPage,
  };
}

export async function loadFacets(categorySlug?: string | null) {
  const where: Prisma.ProductWhereInput = {
    active: true,
  };

  if (categorySlug && categorySlug !== "all") {
    where.category = { slug: categorySlug };
  }

  const rows = await prisma.product.findMany({
    where,
    select: {
      brand: { select: { slug: true, name: true } },
      subtype: true,
      ram: true,
      storage: true,
      screenSize: true,
      processor: true,
      color: true,
    },
    take: 1000,
  });

  const brandMap = new Map<string, { slug: string; name: string }>();
  const subtypes = new Set<string>();
  const ram = new Set<string>();
  const storage = new Set<string>();
  const screenSize = new Set<string>();
  const processor = new Set<string>();
  const color = new Set<string>();

  for (const r of rows) {
    brandMap.set(r.brand.slug, r.brand);
    if (r.subtype) subtypes.add(r.subtype);
    if (r.ram) ram.add(r.ram);
    if (r.storage) storage.add(r.storage);
    if (r.screenSize) screenSize.add(r.screenSize);
    if (r.processor) processor.add(r.processor);
    if (r.color) color.add(r.color);
  }

  return {
    brands: Array.from(brandMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
    subtypes: Array.from(subtypes).sort(),
    ram: Array.from(ram).sort(),
    storage: Array.from(storage).sort(),
    screenSize: Array.from(screenSize).sort(),
    processor: Array.from(processor).sort(),
    color: Array.from(color).sort(),
  };
}

/* ---- exports consumed by FilterPanel.tsx (purely additive) ---- */

export type Facets = {
  brands: { slug: string; name: string }[];
  subtypes: string[];
  ram: string[];
  storage: string[];
  screenSize: string[];
  processor: string[];
  color: string[];
  priceRange: { min: number; max: number };
};

export const FACETS = {
  all: ["brand", "subtype", "ram", "storage", "screenSize", "processor", "color", "price", "rating", "discount", "availability", "warranty"],
  mobiles: ["brand", "subtype", "ram", "storage", "screenSize", "processor", "color", "price", "rating", "discount", "availability", "warranty"],
  laptops: ["brand", "subtype", "ram", "storage", "screenSize", "processor", "color", "price", "rating", "discount", "availability", "warranty"],
  "home-appliances": ["brand", "subtype", "color", "price", "rating", "discount", "availability", "warranty"],
  accessories: ["brand", "subtype", "color", "price", "rating", "discount", "availability", "warranty"],
};