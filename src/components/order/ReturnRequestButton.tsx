"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Modal";
import { Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";

type ReturnItem = {
  id: string;
  name: string;
  slug: string;
};

export function ReturnRequestButton({ items }: { items: ReturnItem[] }) {
  const router = useRouter();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [orderItemId, setOrderItemId] = useState(items[0]?.id ?? "");
  const [reason, setReason] = useState("DAMAGED");
  const [resolution, setResolution] = useState("REFUND");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  if (!items.length) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderItemId,
          reason,
          resolution,
          details,
        }),
      });

      const json = (await res.json()) as { ok: boolean; error?: string };

      if (!json.ok) throw new Error(json.error ?? "Could not create return.");

      toast.push({
        title: "Return requested",
        body: "Our team will review and contact you.",
      });

      setOpen(false);
      setDetails("");
      router.refresh();
    } catch (err) {
      toast.push({
        tone: "error",
        title: "Return failed",
        body: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="inline-flex print:hidden"
        onClick={() => setOpen(true)}
      >
        <RotateCcw className="size-3.5" />
        Request return
      </Button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Return request"
        side="bottom"
      >
        <form onSubmit={submit} className="space-y-4">
          <Select
            label="Item"
            value={orderItemId}
            onChange={(e) => setOrderItemId(e.target.value)}
            required
          >
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>

          <Select
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            <option value="DAMAGED">Damaged</option>
            <option value="WRONG_PRODUCT">Wrong product delivered</option>
            <option value="NOT_WORKING">Not working / dead on arrival</option>
            <option value="MISSING_ACCESSORY">Missing accessory</option>
            <option value="OTHER">Other</option>
          </Select>

          <Select
            label="Preferred resolution"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
          >
            <option value="REFUND">Refund</option>
            <option value="REPLACEMENT">Replacement</option>
          </Select>

          <Textarea
            label="Details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={4}
            placeholder="Describe the issue. Include photos in support ticket if needed."
            maxLength={1000}
          />

          <Button block type="submit" loading={busy}>
            Submit return request
          </Button>
        </form>
      </Drawer>
    </>
  );
}