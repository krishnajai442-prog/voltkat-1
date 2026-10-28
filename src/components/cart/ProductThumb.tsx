"use client";

import { useState } from "react";

/**
 * Product thumbnail that NEVER shows a broken image. Plain <img> (so any src — local,
 * remote, or a picsum fallback that the knowledge base confirms is currently
 * Cloudflare-403-blocking — just works with no next/image remote allowlist), swapping to
 * a letter tile on error/empty. Children are absolutely positioned to fill a `relative`
 * parent, mirroring next/image `fill` so caller layout is unchanged.
 */
export function ProductThumb({
  src,
  name,
  imgClass = "absolute inset-0 size-full object-contain p-1.5",
  tileClass = "absolute inset-0 grid place-items-center bg-canvas text-[11px] font-bold text-ink-300",
}: {
  src: string;
  name: string;
  imgClass?: string;
  tileClass?: string;
}) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <span className={tileClass} aria-hidden>
        {(name || "V").slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} loading="lazy" onError={() => setErr(true)} className={imgClass} />
  );
}