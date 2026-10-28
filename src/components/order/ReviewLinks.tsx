import Link from "next/link";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ReviewLinks({
  items,
}: {
  items: { slug: string; name: string }[];
}) {
  if (!items.length) return null;

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      {items.map((item) => (
        <Button
          key={item.slug}
          href={`/product/${item.slug}#reviews`}
          variant="outline"
          size="sm"
          className="inline-flex"
        >
          <Star className="size-3.5" />
          Review {item.name.length > 22 ? `${item.name.slice(0, 22)}…` : item.name}
        </Button>
      ))}
    </div>
  );
}