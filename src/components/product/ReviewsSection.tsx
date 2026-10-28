"use client";

import { useState } from "react";
import { BadgeCheck, ChevronDown, Star, ThumbsUp, X } from "lucide-react";
import { useToast } from "@/components/ui/Toaster";
import { ImageUploadButton } from "@/components/admin/ImageUploadButton";
import { ReviewPhotoMosaic } from "@/components/product/ReviewPhotoMosaic";

// Matches the VM page.tsx builds from the real rows (column is `body`, not `text`).
type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  images: string[];
  author: string;
  verified: boolean;
  at: string;
  helpful: number;
};

// Optional per-aspect averages (Camera/Battery/…). Rendered only when supplied, so we
// never fabricate numbers — they appear once the schema + form carry aspect scores.
type AspectChip = { label: string; score: number };

function timeAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} hr${h === 1 ? "" : "s"} ago`;
  const day = Math.floor(h / 24); if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  const wk = Math.floor(day / 7); if (wk < 5) return `${wk} week${wk === 1 ? "" : "s"} ago`;
  const mo = Math.floor(day / 30); if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  const yr = Math.floor(day / 365); return `${yr} year${yr === 1 ? "" : "s"} ago`;
}

export function ReviewsSection({ productId, reviews, ratingAvg = 0, ratingCount = 0, aspectChips }: {
  productId: string; reviews: Review[]; ratingAvg?: number; ratingCount?: number; aspectChips?: AspectChip[];
}) {
  const [open, setOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [list, setList] = useState<Review[]>(reviews);
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [formImages, setFormImages] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const toast = useToast();

  const avg = ratingAvg || (list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0);
  const count = ratingCount || list.length;
  const band = avg >= 4.5 ? "Excellent" : avg >= 4 ? "Very Good" : avg >= 3 ? "Good" : avg >= 2 ? "Average" : avg > 0 ? "Poor" : "";
  const bandCls = avg >= 4 ? "bg-emerald-50 text-emerald-700" : avg >= 3 ? "bg-amber-50 text-amber-700" : "bg-flame-500/10 text-flame-600";

  const photoUrls = Array.from(new Set(list.flatMap((r) => r.images || []))).filter(Boolean);
  const visible = showAll ? list : list.slice(0, 12);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        // body field is `body` to match the column / read VM / create route.
        body: JSON.stringify({ rating, title: title.trim(), body: text.trim(), images: formImages }),
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) throw new Error(json?.error || "Could not publish");
      const created = json.review ?? json.data?.review;
      if (created) setList((l) => [created, ...l]);
      setShowForm(false); setTitle(""); setText(""); setRating(5); setFormImages([]);
      toast.push({ title: "Review published", body: "Thanks for the feedback." });
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : "Save failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left">
        <span className="font-display text-[15px] font-bold text-gray-900">Ratings &amp; reviews</span>
        <ChevronDown className={`size-5 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
          {/* Score row — image 5: big number + green star + tone pill, then verified-buyers line */}
          <div className="flex items-center gap-2">
            <span className="text-[22px] font-bold leading-none text-gray-900">{avg.toFixed(1)}</span>
            <Star className="size-4 fill-emerald-500 text-emerald-500" />
            {band ? <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${bandCls}`}>{band}</span> : null}
          </div>
          <p className="mt-1 flex items-center gap-1 text-[12.5px] text-gray-500">
            based on {count.toLocaleString("en-IN")} rating{count === 1 ? "" : "s"} by{" "}
            <BadgeCheck className="size-3.5 text-emerald-600" /> Verified Buyers
          </p>

          {/* Customer photo mosaic (embedded here, was a standalone block) */}
          <div className="mt-3">
            <ReviewPhotoMosaic urls={photoUrls} />
          </div>

          {/* Per-aspect chips — rendered only when real data is supplied (never faked) */}
          {aspectChips && aspectChips.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-3">
              {aspectChips.map((c) => (
                <span key={c.label} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[12px] text-gray-700">
                  {c.label}
                  <span className="font-bold text-gray-900">{c.score.toFixed(1)}</span>
                  <Star className="size-3 fill-emerald-500 text-emerald-500" />
                </span>
              ))}
            </div>
          )}

          {list.length ? (
            <>
              <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {visible.map((r) => (
                  <article key={r.id} className="min-w-[260px] max-w-[260px] shrink-0 rounded-xl border border-gray-200 bg-white p-3">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[11.5px] font-bold text-emerald-700">
                          {r.rating} <Star className="size-3 fill-emerald-600 text-emerald-600" />
                        </span>
                        <span className="text-[12.5px] font-semibold text-gray-900">{r.title || "Review"}</span>
                      </span>
                      <span className="shrink-0 text-[11px] text-gray-400">{timeAgo(r.at)}</span>
                    </div>
                    <p className="line-clamp-3 text-[12.5px] leading-relaxed text-gray-700">{r.body}</p>
                    <div className="mt-2 flex items-end justify-between gap-2 text-[11.5px]">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-gray-600">{r.author}</span>
                        {r.verified ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-600"><BadgeCheck className="size-3" /> Verified Buyer</span>
                        ) : null}
                      </span>
                      {r.helpful > 0 ? (
                        <span className="inline-flex shrink-0 items-center gap-0.5 text-gray-500"><ThumbsUp className="size-3.5" /> {r.helpful.toLocaleString("en-IN")}</span>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
              {list.length > 12 && (
                <button type="button" onClick={() => setShowAll((x) => !x)}
                  className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[#2874f0] hover:underline">
                  {showAll ? "Show fewer reviews" : "Show all reviews"} <ChevronDown className={`size-4 transition-transform ${showAll ? "rotate-180" : "-rotate-90"}`} />
                </button>
              )}
            </>
          ) : (
            <p className="py-2 text-[12.5px] text-gray-400">No reviews yet. Be the first to review.</p>
          )}

          {!showForm ? (
            <button type="button" onClick={() => setShowForm(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-gray-700 hover:border-gray-400">
              <Star className="size-4" /> Write a review
            </button>
          ) : (
            <form onSubmit={submit} className="mt-3 space-y-2 rounded-xl border border-gray-200 bg-gray-50/60 p-3">
              <div className="flex items-center gap-2 text-[13px]"><span className="font-semibold text-gray-700">Rating</span>
                <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-[13px]">
                  {[5,4,3,2,1].map((n) => <option key={n} value={n}>{n} ★</option>)}
                </select></div>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" className="h-9 w-full rounded-lg border border-gray-200 px-2 text-[13px] outline-none focus:border-gray-400" />
              <textarea value={text} onChange={(e) => setText(e.target.value)} required placeholder="What did you like or dislike? How was delivery and product quality?" className="min-h-[80px] w-full rounded-lg border border-gray-200 px-2 py-1.5 text-[13px] outline-none focus:border-gray-400" />

              {/* Photo upload — reuses the same ImageUploadButton the gallery/showcase editors use */}
              <div className="space-y-1.5">
                <span className="text-[12px] font-semibold text-gray-600">Photos (optional, up to 5)</span>
                <div className="flex flex-wrap items-center gap-2">
                  {formImages.map((src, k) => (
                    <span key={k} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="size-14 rounded-md border border-gray-200 object-cover" />
                      <button type="button" onClick={() => setFormImages((a) => a.filter((_, i) => i !== k))} aria-label="Remove photo"
                        className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-gray-900 text-white hover:bg-flame-600">
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                  {formImages.length < 5 && (
                    <ImageUploadButton onUploaded={(url) => setFormImages((a) => [...a, url])} />
                  )}
                </div>
              </div>

              {err ? <p role="alert" className="text-[12px] font-semibold text-flame-600">{err}</p> : null}
              <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-[13px] font-bold text-white hover:bg-gray-700 disabled:opacity-50">
                <Star className="size-4" /> {busy ? "Publishing…" : "Publish review"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default ReviewsSection;