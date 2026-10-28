import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ForbiddenPage() {
  return (
    <div className="container-x py-16">
      <div className="mx-auto max-w-lg text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-flame-500/10 text-flame-600">
          <ShieldAlert className="size-7" />
        </span>

        <h1 className="mt-5 font-display text-3xl font-bold text-ink-900">Access denied</h1>

        <p className="mt-2 text-[14px] text-ink-400">
          You do not have permission to view this page. If you believe this is a mistake, contact support.
        </p>

        <div className="mt-6 flex justify-center gap-2">
          <Button href="/">Back home</Button>
          <Button href="/contact" variant="outline">
            Contact support
          </Button>
        </div>
      </div>
    </div>
  );
}