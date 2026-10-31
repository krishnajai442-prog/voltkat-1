"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { List } from "lucide-react";
import { SpecEditor } from "@/components/admin/SpecEditor";
import { ImageListEditor } from "@/components/admin/ImageListEditor";
import { DescriptionEditor } from "@/components/admin/DescriptionEditor";

type SpecRow = { group: string; label: string; value: string };
type ImgRow = { url: string; alt: string | null; position?: number };

// The /edit footer. Warranty / Manufacturer Info / Showcase self-source from the
// specs+images GETs; Description is seeded from the server-fetched product column
// (passed as a prop by the edit page) and saves through its own /description route,
// independent of the main Update button - same own-save contract as SpecEditor.
export function ProductDetailEditors({ description = "" }: { description?: string } = {}) {
  const p = useParams();
  const id = Array.isArray(p.id) ? p.id[0] : p.id;

  const [warranty, setWarranty] = useState<SpecRow[]>([]);
  const [mfg, setMfg] = useState<SpecRow[]>([]);
  const [banners, setBanners] = useState<ImgRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      try {
        const [s, im] = await Promise.all([
          fetch(`/api/admin/products/${id}/specs`).then((r) => r.json()),
          fetch(`/api/admin/products/${id}/images`).then((r) => r.json()),
        ]);
        if (!alive) return;
        const specs: (SpecRow & { kind?: string })[] = Array.isArray(s.specs) ? s.specs : [];
        const imgs: ImgRow[] = Array.isArray(im.images) ? im.images : [];
        setWarranty(specs.filter((x) => x.kind === "WARRANTY"));
        setMfg(specs.filter((x) => x.kind === "MFG"));
        setBanners(imgs.filter((x) => (x as { kind?: string }).kind === "SHOWCASE"));
        setLoaded(true);
      } catch {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (!id) return null;
  if (!loaded) return <p className="text-[13px] text-gray-400">Loading detail editors...</p>;

  const Head = ({ children }: { children: React.ReactNode }) => (
    <h3 className="mb-3 inline-flex items-center gap-2 font-display text-[15px] font-bold text-gray-900">
      <List className="size-4 text-gray-400" /> {children}
    </h3>
  );

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <Head>Description</Head>
        <DescriptionEditor productId={id} initial={description} />
      </section>
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <Head>Warranty</Head>
        <SpecEditor productId={id} kind="WARRANTY" initial={warranty} />
      </section>
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <Head>Manufacturer Info</Head>
        <SpecEditor productId={id} kind="MFG" initial={mfg} />
      </section>
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <Head>Showcase banners</Head>
        <ImageListEditor productId={id} initial={banners} />
      </section>
    </div>
  );
}