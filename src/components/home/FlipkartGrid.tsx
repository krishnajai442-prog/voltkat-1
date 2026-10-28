import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import prisma from "@/lib/prisma"; // Import DB client

// Fetch real categories dynamically on server side if possible, 
// otherwise map known slugs safely.
const CATEGORIES = [
  { name: "Mobiles", slug: "mobiles", icon: "📱" },
  { name: "Laptops", slug: "laptops", icon: "💻" },
  { name: "Home Appliances", slug: "home-appliances", icon: "❄️" },
  { name: "Accessories", slug: "accessories", icon: "🎧" },
];

export async function FlipkartGrid() {
  // Optional: Fetch top brands for the banner section
  const topBrands = await prisma.brand.findMany({
    where: { active: true },
    take: 4,
    orderBy: { products: { _count: "desc" } },
  });

  return (
    <div className="container-x space-y-6 py-6">
      
      {/* SECTION 1: Category Grid (Functional Links) */}
      {/* <section>
        <h2 className="mb-3 font-display text-lg font-bold text-gray-800">Shop by Category</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/products/${cat.slug}`}
              className="group flex flex-col items-center justify-center rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <span className="mb-2 text-3xl">{cat.icon}</span>
              <p className="text-sm font-semibold text-gray-800 group-hover:text-[#2874f0]">{cat.name}</p>
            </Link>
          ))}
        </div>
      </section> */}

      {/* SECTION 2: Featured Brands (Dynamic Data) */}
      {topBrands.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-gray-800">Featured Brands</h2>
            <Link href="/products/all" className="text-xs font-bold text-[#2874f0] hover:underline">View All →</Link>
          </div>
          
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
            {topBrands.map((brand) => (
              <Link
                key={brand.id}
                href={`/products/all?brands=${brand.slug}`}
                className="relative min-w-[280px] shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 transition-shadow hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-black italic tracking-tighter text-gray-900 uppercase">{brand.name}</h3>
                    <p className="mt-1 text-sm font-medium text-gray-600">Best Sellers & New Arrivals</p>
                    <span className="mt-3 inline-block rounded bg-red-600 px-2 py-1 text-[10px] font-bold text-white">
                      Up to 70% Off
                    </span>
                  </div>
                  {/* Placeholder for Brand Logo - Replace with real image URL if stored in DB */}
                  <div className="grid size-16 place-items-center rounded-full bg-white shadow-inner text-2xl">
                    {brand.name.charAt(0)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
     </div>
  );
}