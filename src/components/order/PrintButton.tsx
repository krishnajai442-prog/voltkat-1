"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function PrintButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="inline-flex print:hidden"
      onClick={() => window.print()}
    >
      <Printer className="size-3.5" />
      Print invoice
    </Button>
  );
}