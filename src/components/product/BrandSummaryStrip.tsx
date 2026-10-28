export function BrandSummaryStrip({ brand, highlights, price, image, name }: {
  brand: string; highlights: string[]; price: number; image: string | null; name: string;
}) {
  const chips = highlights.filter(Boolean).slice(0, 3);
  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#f3f0ff] px-3 py-2.5 ring-1 ring-violet-100">
      <p className="font-display text-[15px] font-extrabold text-gray-900">{brand}</p>
      <div className="min-w-0 flex-1 text-center">
        {chips.length ? <p className="truncate text-[11.5px] font-medium text-gray-700">{chips.join(" | ")}</p> : null}
        <p className="text-[13px] font-bold text-gray-900">Just ₹{Number(price).toLocaleString("en-IN")}</p>
      </div>
      {image
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={image} alt={name} className="h-12 w-12 rounded-lg border border-white bg-white object-contain" />
        : null}
    </div>
  );
}
export default BrandSummaryStrip;