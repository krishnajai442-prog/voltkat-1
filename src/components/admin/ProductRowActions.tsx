"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { useToast } from "@/components/ui/Toaster";

export function ProductRowActions({
  productId,
  active,
  canDelete,
}: {
  productId: string;
  active: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Update failed");
      toast.push({ title: active ? "Product deactivated" : "Product activated" });
      router.refresh();
    } catch (e) {
      toast.push({ tone: "error", title: "Update failed", body: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Link
        href={`/admin/products/${productId}/edit`}
        className="rounded-lg border border-hairline px-2.5 py-1.5 text-[12px] font-bold text-ink-700 hover:border-electric-300"
      >
        Edit
      </Link>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className="rounded-lg border border-hairline px-2.5 py-1.5 text-[12px] font-bold text-ink-700 hover:border-electric-300 disabled:opacity-50"
      >
        {busy ? "…" : active ? "Deactivate" : "Activate"}
      </button>
      {canDelete && (
        <ConfirmButton
          url={`/api/admin/products/${productId}`}
          confirmText="Delete this product? This is only possible if it has no order history."
          successText="Product deleted"
          variant="danger"
          size="sm"
        >
          Delete
        </ConfirmButton>
      )}
    </div>
  );
}