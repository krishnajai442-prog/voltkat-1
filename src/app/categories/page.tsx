import type { Metadata } from "next";
import { getCategoryExplorer } from "@/lib/category-explorer";
import { CategoryExplorer } from "@/components/category/CategoryExplorer";

export const metadata: Metadata = { title: "All Categories", description: "Browse every category, brand and deal at VoltKart." };
export const revalidate = 60;

export default async function CategoriesPage() {
  const data = await getCategoryExplorer();
  return (
    <div className="container-x py-4 pb-24 md:pb-8">
      <h1 className="mb-3 font-display text-[17px] font-bold text-gray-900">All Categories</h1>
      <CategoryExplorer data={data} />
    </div>
  );
}