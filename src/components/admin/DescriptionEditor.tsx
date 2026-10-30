"use client";

import { useState } from "react";

// Standalone editor for the Product.description long-form column. Mirrors the
// per-editor convention of SpecEditor/ImageListEditor (each owns its own save
// route) so it never threads through productInputSchema or the wholesale [id]
// PATCH (which rebuilds specifications on every save). Pure ASCII source.
export function DescriptionEditor({
  productId,
  initial = "",
}: {
  productId: string;
  initial?: string;
}) {
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function save() {
    setState("saving");
    setMsg("");
    try {
      const res = await fetch(`/api/admin/products/${productId}/description`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: value }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok === false) {
        setState("error");
        setMsg(json?.error ?? `Save failed (${res.status})`);
        return;
      }
      setState("saved");
      setMsg("Saved.");
    } catch {
      setState("error");
      setMsg("Network error - not saved.");
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={10}
        placeholder="Long-form product description shown on the product page's Description tab. Markdown/plain text; line breaks preserved."
        className="w-full resize-y rounded-lg border border-gray-200 bg-white p-3 text-[13px] leading-relaxed text-gray-900 outline-none focus:border-[#2874f0] focus:ring-2 focus:ring-[#2874f0]/20"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={state === "saving"}
          className="rounded-lg bg-[#2874f0] px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {state === "saving" ? "Saving..." : "Save description"}
        </button>
        {msg && (
          <span
            className={
              state === "error"
                ? "text-[12.5px] font-semibold text-rose-600"
                : "text-[12.5px] font-semibold text-emerald-600"
            }
          >
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}