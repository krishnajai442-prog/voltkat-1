"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, ZoomIn } from "lucide-react";
import { ImageUploadButton } from "@/components/admin/ImageUploadButton";
import { ImagePreviewModal } from "@/components/admin/ImagePreviewModal";

type Row = { url: string; alt: string | null };

export function ImageListEditor({ productId, initial }: { productId: string; initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [preview, setPreview] = useState<string | null>(null);

  const rowsRef = useRef(rows); rowsRef.current = rows;
  const dirty = useRef(false);
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chain = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => () => { mounted.current = false; }, []);

  async function doSave() {
    const snap = JSON.stringify(rowsRef.current);
    const clean = rowsRef.current
      .filter((r) => r.url.trim())
      .map((r, i) => ({ url: r.url.trim(), alt: (r.alt ?? "").trim(), position: i }));
    setStatus("saving");
    try {
      const res = await fetch(`/api/admin/products/${productId}/images`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "SHOWCASE", images: clean }),
      });
      if (!res.ok) throw new Error();
    } catch { if (mounted.current) setStatus("error"); return; }
    if (!mounted.current) return;
    if (JSON.stringify(rowsRef.current) === snap) { dirty.current = false; setStatus("saved"); }
    else setStatus("saving");
  }

  function queueSave() { chain.current = chain.current.then(doSave).catch(() => {}); }

  useEffect(() => {
    if (!dirty.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(queueSave, 700);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [rows]);

  useEffect(() => () => { if (dirty.current) { if (timer.current) clearTimeout(timer.current); void queueSave(); } }, []);

  const update = (i: number, patch: Partial<Row>) => { dirty.current = true; setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r))); };
  const remove = (i: number) => { dirty.current = true; setRows((rs) => rs.filter((_, j) => j !== i)); };
  const add = () => { dirty.current = true; setRows((rs) => [...rs, { url: "", alt: "" }]); };

  const statusText = status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Save failed — retries on next edit" : "";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button type="button" onClick={add} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#2874f0] hover:underline">
          <Plus className="size-3.5" /> Add banner
        </button>
        {statusText ? <span className={`text-[11px] font-medium ${status === "error" ? "text-flame-600" : "text-gray-400"}`}>{statusText}</span> : null}
      </div>
      <p className="text-[11.5px] text-gray-400">Tall full‑width images (e.g. 1080×1350). They stack vertically in the Showcase tab. Click a thumbnail to preview it full‑size.</p>
      {rows.length === 0 ? (
        <p className="py-2 text-[12.5px] text-gray-400">No banners yet — add one above.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[auto_auto_1fr_1fr_auto] items-center">
              {r.url ? (
                <button
                  type="button"
                  onClick={() => setPreview(r.url)}
                  title="Click to preview full image"
                  className="group/thumb relative block size-12 shrink-0 cursor-zoom-in overflow-hidden rounded border border-gray-200 bg-white"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.url} alt="" className="size-full object-cover" />
                  <span className="absolute inset-0 grid place-items-center text-white opacity-0 transition-opacity group-hover/thumb:bg-black/30 group-hover/thumb:opacity-100">
                    <ZoomIn className="size-4" />
                  </span>
                </button>
              ) : (
                <div className="size-12 shrink-0 rounded border border-dashed border-gray-300" />
              )}
              <ImageUploadButton onUploaded={(url) => update(i, { url })} />
              <input value={r.url} placeholder="…or paste a URL" onChange={(e) => update(i, { url: e.target.value })} className="h-9 rounded-lg border border-gray-200 px-2 text-[13px] outline-none focus:border-gray-400" />
              <input value={r.alt ?? ""} placeholder="alt text" onChange={(e) => update(i, { alt: e.target.value })} className="h-9 rounded-lg border border-gray-200 px-2 text-[13px] outline-none focus:border-gray-400" />
              <button type="button" onClick={() => remove(i)} aria-label="Remove banner" className="grid size-9 place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      )}

      {preview && <ImagePreviewModal url={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}