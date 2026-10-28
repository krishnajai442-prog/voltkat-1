"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";

export function ConfirmButton({
  url,
  method = "DELETE",
  body,
  confirmText,
  successText,
  children,
  ...rest
}: ButtonProps & {
  url: string;
  method?: string;
  body?: unknown;
  confirmText: string;
  successText?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Action failed");
      if (successText) toast.push({ title: successText });
      router.refresh();
    } catch (e) {
      toast.push({
        tone: "error",
        title: "Action failed",
        body: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button {...rest} loading={busy} onClick={run} type="button">
      {children}
    </Button>
  );
}