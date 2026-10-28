// Example for [category]/page.tsx
import prisma from "@/lib/prisma";
import {Prisma} from "@prisma/client";
import { productSelect, toCards } from "@/lib/catalog";
import { ProductListClient } from "@/components/product/ProductListClient"; // Import the new client component

// export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
//   const { category } = await params;
  
//   // Fetch data ON SERVER SIDE (Safe)
//   const products = await prisma.product.findMany({
//     where: { active: true, category: { slug: category } },
//     select: productSelect,
//     take: 50,
//   });

//   // Pass DATA ONLY to Client Component (Functions stay inside Client Comp)
//   return (
//     <ProductListClient 
//       initialProducts={toCards(products)} 
//       total={products.length}
//       categorySlug={category}
//     />
//   );
// }

export default async function AllProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; brands?: string }> }) {
  const { q, brands } = await searchParams;
  
  const whereClause: Prisma.ProductWhereInput = q 
    ? { 
        active: true, 
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { brand: { name: { contains: q, mode: "insensitive" } } }
        ] 
      } 
    : { active: true };

  const products = await prisma.product.findMany({
    where: {
      AND: [
        whereClause,
        ...(brands
          ? [
              {
                brand: {
                  slug: {
                    in: brands.split(",").map((s) => s.trim()).filter(Boolean),
                  },
                },
              },
            ]
          : []),
      ],
    },
    select: productSelect,
    take: 50,
  });

  return (
    <ProductListClient 
      initialProducts={toCards(products)} 
      total={products.length}
      categorySlug="all"
    />
  );
}