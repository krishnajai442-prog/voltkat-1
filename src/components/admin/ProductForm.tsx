"use client";
import { ImageUploadButton } from "@/components/admin/ImageUploadButton";
import { Copy } from "lucide-react";
import { ZoomIn } from "lucide-react";
import { ImagePreviewModal } from "@/components/admin/ImagePreviewModal";
import { Image as ImageIcon, List, Plus, Save, Trash2, Palette } from"lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, Select } from "@/components/ui/Input";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ProductOptionsEditor, type OptionsPayload } from "@/components/admin/ProductOptionsEditor";
import { BrandPicker, type BrandOption } from "@/components/admin/BrandPicker";
import { parseProductOptions } from "@/lib/product-options";
import { useToast } from "@/components/ui/Toaster";

type Option = { id: string; name: string };

type Initial = {
  name: string;
  slug: string;
  shortDescription: string;
  categoryId: string;
  brandId: string;
  mrp: number;
  salePrice: number;
  stock: number;
  lowStockAt: number;
  subtype: string;
  groupId: string;
  ram: string;
  storage: string;
  screenSize: string;
  processor: string;
  color: string;
  warrantyMonths: number;
  codEligible: boolean;
  emiEligible: boolean;
  exchangeEligible: boolean;
  featured: boolean;
  active: boolean;
  hsnCode: string;
  tags: string;
  images: { url: string; alt: string }[];
  specifications: { group: string; label: string; value: string }[];
  // Flipkart-style options — the editor treats `colors` as a rich list (name + swatch image URL)
  colors: any[];
  variants: any[];
  optionGroups: any[];
};

const blank: Initial = {
  name: "",
  slug: "",
  shortDescription: "",
  categoryId: "",
  brandId: "",
  mrp: 0,
  salePrice: 0,
  stock: 0,
  lowStockAt: 5,
  subtype: "",
  groupId: "",
  ram: "",
  storage: "",
  screenSize: "",
  processor: "",
  color: "",
  warrantyMonths: 12,
  codEligible: true,
  emiEligible: true,
  exchangeEligible: true,
  featured: false,
  active: true,
  hsnCode: "",
  tags: "",
  images: [{ url: "", alt: "" }],
  specifications: [],
  colors: [],
  variants: [],
  optionGroups: [],
};

export function ProductForm({
  categories,
  brands,
  initial,
  productId,
  canDelete,
  footer,
}: {
  categories: Option[];
  brands: BrandOption[];
  initial?: Initial;
  productId?: string;
  canDelete?: boolean;
  footer?: ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<Initial>(initial ?? blank);
  const [busy, setBusy] = useState(false);
  const [copyBusy, setCopyBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

  // Parallel raw text for the numeric fields so Backspace can clear a 0 to "Nothing".
  // The model value (form.*) stays a number and the SUBMITTED PAYLOAD IS UNCHANGED
  // (empty -> 0 exactly as today's Number("") coercion), so no validator/route/Prisma
  // behaviour moves — only the visible box can go blank. num()/txt() keep raw + form in sync.
  const [raw, setRaw] = useState<Record<string, string>>(() => ({
    mrp: String(form.mrp),
    salePrice: String(form.salePrice),
    stock: String(form.stock),
    lowStockAt: String(form.lowStockAt),
    warrantyMonths: String(form.warrantyMonths),
    hsnCode: form.hsnCode,
  }));
  function num(k: "mrp" | "salePrice" | "stock" | "lowStockAt" | "warrantyMonths", v: string) {
    setRaw((r) => ({ ...r, [k]: v }));
    const n = Number(v);
    set(k, v === "" || !Number.isFinite(n) ? 0 : n);
  }
  function txt(k: "hsnCode", v: string) {
    setRaw((r) => ({ ...r, [k]: v }));
    set(k, v);
  }
  const [preview, setPreview] = useState<string | null>(null);

  function set<K extends keyof Initial>(key: K, value: Initial[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

    async function duplicate() {
    if (!productId) return;
    setCopyBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${productId}/duplicate`, { method: "POST" });
      const json = (await res.json().catch(() => ({} as { ok?: boolean; id?: string; error?: string }))) as {
        ok?: boolean; id?: string; slug?: string; error?: string;
      };
      if (!res.ok || !json.ok || !json.id) throw new Error(json.error ?? "Could not copy the product");
      toast.push({ title: "Product copied", body: "Opened the copy for editing." });
      router.push(`/admin/products/${json.id}/edit`);
      router.refresh();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Copy failed");
    } finally {
      setCopyBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      // The parser produces sanitized `colors: string[]` (names) + `colorOptions: rich[]`
      // from our single rich `form.colors`, plus sanitized variants / optionGroups.
      // Anything it doesn't recognize is ignored, so spreading its result is a no-op
      // for fields outside its scope.
      const parsed = parseProductOptions({
        colors: form.colors,
        variants: form.variants,
        optionGroups: form.optionGroups,
      });

      const payload = {
        ...form,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        images: form.images.filter((i) => i.url.trim()).map((i) => ({url: i.url.trim(), alt: i.alt.trim() || form.name })),
        specifications: form.specifications.filter((s) => s.label.trim() && s.value.trim()),
        ...parsed,
      };

      const res = await fetch(productId ? `/api/admin/products/${productId}` : "/api/admin/products", {
        method: productId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as { ok: boolean; error?: string; fields?: Record<string, string[]> };
      if (!json.ok) {
        const first = json.fields ? Object.values(json.fields).flat()[0] : json.error;
        throw new Error(first ?? "Save failed");
      }

      toast.push({ title: productId ? "Product updated" : "Product created" });
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <section className="card grid gap-3 p-5 sm:grid-cols-2">
        <Input containerClassName="sm:col-span-2" label="Product name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
        <Input label="Slug (optional)" value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto-generated" />
          <BrandPicker
          brands={brands}
          categories={categories.map((c) => c.name)}
          preferred={categories.find((c) => c.id === form.categoryId)?.name}
          value={form.brandId}
          onChange={(id) => set("brandId", id)}
        />
        <Select label="Category" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} required>
          <option value="">Select category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Input label="Subtype" value={form.subtype} onChange={(e) => set("subtype", e.target.value)} placeholder="Smartphone / Ultrabook / AC" />
        <Input label="Family group (same value links colour/variant siblings)" value={form.groupId} onChange={(e) => set("groupId", e.target.value)} placeholder="iphone-16-plus" />
        <Input containerClassName="sm:col-span-2" label="Short description" value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} maxLength={240} />
      </section>

      <section className="card grid gap-3 p-5 sm:grid-cols-3">
         <Input label="MRP (₹)" type="number" value={raw.mrp} onChange={(e) => num("mrp", e.target.value)} required min={1} />
        <Input label="Sale price (₹)" type="number" value={raw.salePrice} onChange={(e) => num("salePrice", e.target.value)} required min={1} />
        <Input label="Stock" type="number" value={raw.stock} onChange={(e) => num("stock", e.target.value)} required min={0} />
        <Input label="Low stock alert at" type="number" value={raw.lowStockAt} onChange={(e) => num("lowStockAt", e.target.value)} min={0} />
        <Input label="Warranty months" type="number" value={raw.warrantyMonths} onChange={(e) => num("warrantyMonths", e.target.value)} min={0} />
        <Input label="HSN code" value={raw.hsnCode} onChange={(e) => txt("hsnCode", e.target.value)} />
      </section>

      <section className="card grid gap-3 p-5 sm:grid-cols-3">
        <Input label="RAM" value={form.ram} onChange={(e) => set("ram", e.target.value)} placeholder="8 GB / 16 GB" />
        <Input label="Storage" value={form.storage} onChange={(e) => set("storage", e.target.value)} placeholder="256 GB / 1 TB" />
        <Input label="Screen size" value={form.screenSize} onChange={(e) => set("screenSize", e.target.value)} placeholder="6.7 inch / 1.5 ton" />
        <Input label="Processor" value={form.processor} onChange={(e)=> set("processor", e.target.value)} placeholder="A18 Pro / Ryzen 7" />
        <Input label="Color" value={form.color} onChange={(e) => set("color", e.target.value)} />
        <Input containerClassName="sm:col-span-3" label="Tags (comma separated)" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="5g, wireless, fast-charging" />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
          <ImageIcon className="size-4 text-electric-600" /> Images
                </h2>
        <div className="mb-2">
          <button type="button" onClick={() => set("images", [...form.images, { url: "", alt: "" }])} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#2874f0] hover:underline">
            <Plus className="size-3.5" /> Add image
          </button>
        </div>
        <div className="space-y-2">
          {form.images.map((img, idx) => (
             <div key={idx} className="grid gap-2 sm:grid-cols-[auto_auto_1fr_1fr_auto]">
                {img.url ? (
                <button
                  type="button"
                  onClick={() => setPreview(img.url)}
                  title="Click to preview full image"
                  className="group/thumb relative block size-12 shrink-0 cursor-zoom-in overflow-hidden rounded border border-gray-200 bg-white"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="size-full object-cover" />
                  <span className="absolute inset-0 grid place-items-center text-white opacity-0 transition-opacity group-hover/thumb:bg-black/30 group-hover/thumb:opacity-100">
                    <ZoomIn className="size-4" />
                  </span>
                </button>
              ) : (
                <div className="size-12 shrink-0 rounded border border-dashed border-gray-300" />
              )}
              <ImageUploadButton onUploaded={(url) => {
                const next = [...form.images];
                next[idx] = { ...next[idx]!, url };
                set("images", next);
              }} />
              <Input placeholder="…or paste a URL" value={img.url} onChange={(e) => {
                const next = [...form.images];
                next[idx] = { ...next[idx]!, url: e.target.value };
                set("images", next);
              }} required={idx === 0} />
              <Input placeholder="Alt text" value={img.alt} onChange={(e) => {
                const next = [...form.images];
                next[idx] = { ...next[idx]!, alt: e.target.value };
                set("images", next);
              }} />
              <button type="button" onClick={() => set("images", form.images.filter((_, i) => i !== idx))} className="grid size-12 place-items-center rounded-xl border border-hairline text-flame-600 hover:bg-flame-500/10" aria-label="Remove image">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
        {/* <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => set("images", [...form.images, { url: "", alt: ""}])}>
          <Plus className="size-3.5" /> Add image
        </Button> */}
      </section>

      <section className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
          <List className="size-4 text-electric-600" /> Specifications
        </h2>
        <div className="space-y-2">
          {form.specifications.map((spec, idx) => (
            <div key={idx} className="grid gap-2 sm:grid-cols-[10rem_1fr_1fr_auto]">
              <Input placeholder="Group" value={spec.group} onChange={(e) => {
                const next = [...form.specifications];
                next[idx] = { ...next[idx]!, group: e.target.value };
                set("specifications", next);
              }} />
              <Input placeholder="Label" value={spec.label} onChange={(e) => {
                const next = [...form.specifications];
                next[idx] = { ...next[idx]!, label: e.target.value };
                set("specifications", next);
              }} />
              <Input placeholder="Value" value={spec.value} onChange={(e) => {
                const next = [...form.specifications];
                next[idx] = { ...next[idx]!, value: e.target.value };
                set("specifications", next);
              }} />
              <button type="button" onClick={() => set("specifications", form.specifications.filter((_, i) => i !== idx))} className="grid size-12 place-items-center rounded-xl border border-hairline text-flame-600 hover:bg-flame-500/10" aria-label="Remove spec">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
        <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => set("specifications", [...form.specifications, { group: "General", label: "", value: "" }])}>
          <Plus className="size-3.5" /> Add specification
        </Button>
      </section>

      {/* Flipkart-style colours / groups / variants */}
      <section className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
          <Palette className="size-4 text-electric-600" /> Colours, groups & variants
        </h2>
        <p className="mb-4 text-[12.5px] text-gray-500">
          Swatches (with optional image URL), pill option groups (e.g. System Memory) and price variants. Variant price = sale price + group add + variant add.
        </p>
        <ProductOptionsEditor
          value={{ colors: form.colors, variants: form.variants, optionGroups: form.optionGroups }}
          onChange={(v: OptionsPayload) => setForm((f) => ({ ...f, colors: v.colors ?? f.colors, variants: v.variants ?? f.variants, optionGroups: v.optionGroups ?? f.optionGroups }))}
        />
      </section>

      <section className="card grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Checkbox checked={form.active} onChange={(e) => set("active", e.target.checked)} label="Active" />
        <Checkbox checked={form.featured} onChange={(e) => set("featured", e.target.checked)} label="Featured" />
        <Checkbox checked={form.codEligible} onChange={(e) => set("codEligible", e.target.checked)} label="COD eligible" />
        <Checkbox checked={form.emiEligible} onChange={(e) => set("emiEligible", e.target.checked)} label="EMI eligible" />
        <Checkbox checked={form.exchangeEligible} onChange={(e) => set("exchangeEligible", e.target.checked)} label="Exchange eligible" />
      </section>
      {footer}

      {error && (
        <p role="alert" className="rounded-xl bg-flame-500/10 px-4 py-3 text-[13px] font-semibold text-flame-600">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={busy}>
          {!busy && <Save className="size-4" />}
          {productId ? "Update product" : "Create product"}
        </Button>
        {productId && (
          <Button type="button" variant="outline" loading={copyBusy} onClick={() => void duplicate()}>
            {!copyBusy && <Copy className="size-4" />}
            Copy product
          </Button>
        )}
        <Button type="button" variant="outline" onClick={() => router.push("/admin/products")}>
          Cancel
        </Button>
        {productId && canDelete && (
          <ConfirmButton
            url={`/api/admin/products/${productId}`}
            confirmText="Delete this product? Only allowed if no order history exists."
            successText="Product deleted"
            variant="danger"
          >
            Delete product
          </ConfirmButton>
        )}
      </div>
         {preview && <ImagePreviewModal url={preview} onClose={() => setPreview(null)} />}
    </form>
  );
}