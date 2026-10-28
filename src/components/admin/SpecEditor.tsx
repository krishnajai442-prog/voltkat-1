"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

type Row = { group: string; label: string; value: string };
type Kind = "SPEC" | "WARRANTY" | "MFG";

export function SpecEditor({ productId, kind, initial }: { productId: string; kind: Kind; initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const rowsRef = useRef(rows); rowsRef.current = rows;
  const dirty = useRef(false);
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chain = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => () => { mounted.current = false; }, []);

  async function doSave() {
    const snap = JSON.stringify(rowsRef.current);
    const clean = rowsRef.current
      .filter((r) => r.label.trim() && r.value.trim())
      .map((r) => ({ group: r.group.trim() || "General", label: r.label.trim(), value: r.value.trim() }));
    setStatus("saving");
    try {
      const res = await fetch(`/api/admin/products/${productId}/specs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, specs: clean }),
      });
      if (!res.ok) throw new Error();
    } catch { if (mounted.current) setStatus("error"); return; }
    if (!mounted.current) return;
    if (JSON.stringify(rowsRef.current) === snap) { dirty.current = false; setStatus("saved"); }
    else setStatus("saving"); // a fresher save is already queued behind us
  }

  function queueSave() { chain.current = chain.current.then(doSave).catch(() => {}); }

  useEffect(() => {
    if (!dirty.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(queueSave, 700);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [rows]);

  // flush a pending edit if the admin navigates/commits before the debounce fires
  useEffect(() => () => { if (dirty.current) { if (timer.current) clearTimeout(timer.current); void queueSave(); } }, []);

  const update = (i: number, patch: Partial<Row>) => { dirty.current = true; setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r))); };
  const remove = (i: number) => { dirty.current = true; setRows((rs) => rs.filter((_, j) => j !== i)); };
  const add = () => { dirty.current = true; setRows((rs) => [...rs, { group: "General", label: "", value: "" }]); };

  const statusText = status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Save failed — retries on next edit" : "";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button type="button" onClick={add} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#2874f0] hover:underline">
          <Plus className="size-3.5" /> Add row
        </button>
        {statusText ? <span className={`text-[11px] font-medium ${status === "error" ? "text-flame-600" : "text-gray-400"}`}>{statusText}</span> : null}
      </div>
      {rows.length === 0 ? (
        <p className="py-2 text-[12.5px] text-gray-400">No rows yet — add one above.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_1.2fr_1.2fr_auto] items-center gap-2">
              <input value={r.group} placeholder="Group" onChange={(e) => update(i, { group: e.target.value })} className="h-9 rounded-lg border border-gray-200 px-2 text-[13px] outline-none focus:border-gray-400" />
              <input value={r.label} placeholder="Label" onChange={(e) => update(i, { label: e.target.value })} className="h-9 rounded-lg border border-gray-200 px-2 text-[13px] outline-none focus:border-gray-400" />
              <input value={r.value} placeholder="Value" onChange={(e) => update(i, { value: e.target.value })} className="h-9 rounded-lg border border-gray-200 px-2 text-[13px] outline-none focus:border-gray-400" />
              <button type="button" onClick={() => remove(i)} aria-label="Remove row" className="grid size-9 place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}