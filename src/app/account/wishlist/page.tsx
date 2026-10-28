import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import prisma from "@/lib/prisma";
import { getActor } from "@/lib/auth/guards";
import { productSelect, toCards, type ProductRow } from "@/lib/catalog";
import { ProductCard } from "@/components/product/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function AccountWishlistPage() {
  const actor = await getActor();
  if (!actor) redirect("/auth/login?next=/account/wishlist");

  const wishlist = await prisma.wishlist.findUnique({
    where: { userId: actor.id },
    include: {
      items: {
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: productSelect },
        },
      },
    },
  });

  const rows =
    wishlist?.items
      .map((i) => i.product)
      .filter((p): p is ProductRow => Boolean(p && p.active)) ?? [];

  const cards = toCards(rows);

  if (!cards.length) {
    return (
      <EmptyState
        icon={<Heart className="size-6" />}
        title="Your wishlist is empty"
        body="Save products here to compare later, track price drops and share with family."
        action={
          <div className="mt-1 flex gap-2">
            <Button href="/products/all">Browse products</Button>
            <Button href="/offers" variant="outline">View offers</Button>
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-ink-900">Wishlist</h1>
        <p className="text-[13px] text-ink-400">{cards.length} saved item(s)</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}