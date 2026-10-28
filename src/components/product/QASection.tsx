"use client";

import { useState } from "react";
import { ChevronDown, MessageCircleQuestion, Send } from "lucide-react";
import { useToast } from "@/components/ui/Toaster";

// Matches the VM page.tsx builds from the real rows (content column is `body`, not `text`;
// relations are flattened to asker/author/official so this file needs no `user` join).
type Answer = { id: string; body: string; author: string; official: boolean; at: string };
type Question = { id: string; body: string; askedAt: string; asker: string; answers: Answer[] };

export function QASection({ productId, questions: initial }: { productId: string; questions: Question[] }) {
  const [open, setOpen] = useState(true);
  const [askOpen, setAskOpen] = useState(false);
  const [list, setList] = useState<Question[]>(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const toast = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/products/${productId}/questions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        // content field is `body` to match the column / read VM.
        // If a posted question comes back blank, your endpoint maps the other way -> change this one key to `text`.
        body: JSON.stringify({ body: text.trim() }),
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) throw new Error(json?.error || "Could not post");
      const created = json.question ?? json.data?.question;
      if (created) setList((l) => [created, ...l]);
      setAskOpen(false); setText("");
      toast.push({ title: "Question posted", body: "We'll notify you when it's answered." });
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : "Save failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left">
        <span className="inline-flex items-center gap-2 font-display text-[15px] font-bold text-gray-900"><MessageCircleQuestion className="size-4 text-gray-400" /> Questions &amp; answers</span>
        <ChevronDown className={`size-5 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
          {list.length ? (
            <div className="space-y-3">
              {list.slice(0, 8).map((q) => (
                <div key={q.id} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                  <p className="text-[13px] font-semibold text-gray-900">Q: {q.body}</p>
                  <div className="mt-1 text-[11px] text-gray-400">{q.asker} · {new Date(q.askedAt).toLocaleDateString()}</div>

                  {q.answers.length ? (
                    <div className="mt-2 space-y-2 border-t border-gray-100 pt-2">
                      {q.answers.map((a) => (
                        <div key={a.id}>
                          <p className="text-[12.5px] leading-relaxed text-gray-700">A: {a.body}</p>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-400">
                            <span className="font-medium text-gray-600">{a.author}</span>
                            {a.official ? <span className="rounded bg-[#2874f0]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#2874f0]">Seller</span> : null}
                            <span>· {new Date(a.at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-[12px] text-gray-400">No answer yet.</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="py-1 text-[12.5px] text-gray-400">No questions yet.</p>
          )}

          {!askOpen ? (
            <button type="button" onClick={() => setAskOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-gray-700 hover:border-gray-400">
              Ask a question
            </button>
          ) : (
            <form onSubmit={submit} className="mt-3 space-y-2 rounded-xl border border-gray-200 bg-gray-50/60 p-3">
              <p className="text-[13px] font-semibold text-gray-700">Ask a question</p>
              <textarea value={text} onChange={(e) => setText(e.target.value)} required placeholder="Example: Does this support 5G in India? Is installation included?" className="min-h-[72px] w-full rounded-lg border border-gray-200 px-2 py-1.5 text-[13px] outline-none focus:border-gray-400" />
              {err ? <p role="alert" className="text-[12px] font-semibold text-flame-600">{err}</p> : null}
              <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-[13px] font-bold text-white hover:bg-gray-700 disabled:opacity-50">
                <Send className="size-4" /> {busy ? "Posting…" : "Post question"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default QASection;