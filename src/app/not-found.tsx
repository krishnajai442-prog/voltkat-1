import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="container-x py-16">
      <div className="mx-auto max-w-lg text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-electric-50 text-electric-600">
          <SearchX className="size-7" />
        </span>
        <h1 className="mt-5 font-display text-3xl font-bold text-ink-900">Page not found</h1>
        <p className="mt-2 text-[14px] text-ink-400">
          The page you’re looking for may have moved, been discontinued, or never existed.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button href="/">Back home</Button>
          <Button href="/products/all" variant="outline">
            Browse products
          </Button>
        </div>
      </div>
    </div>
  );
}