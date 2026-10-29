import prisma from "@/lib/prisma";
import { inr } from "@/lib/utils";
import { GuardedImg } from "@/components/order/thanks-client";

// Dynamic featured banner, styled to the Flipkart creative composition:
// tall panel, soft blue->white wash with a glow, product bleeding right,
// hero price, brand wordmark, corner disclosure tag, illustration disclaimer.
// Data is 100% real (one random in-stock product that HAS an image); nothing
// here is fabricated. Rotation follows the home page's ISR window (~5s), so it
// changes on each revalidate/deploy rather than on every manual refresh.
export async function SponsoredStrip() {
  const pool = await prisma.product.findMany({
    where: { active: true, stock: { gt: 0 } },
    select: {
      id: true,
      name: true,
      slug: true,
      salePrice: true,
      mrp: true,
      discountPercent: true,
      brand: { select: { name: true } },
      images: { take: 1, orderBy: { position: "asc" }, select: { url: true } },
    },
    take: 40,
  });

  // only feature products that actually have a photo, so the right side is never empty
  const withImage = pool.filter((p) => p.images[0]?.url);
  if (withImage.length === 0) return null;

  const p = withImage[Math.floor(Math.random() * withImage.length)]!;
  const image = p.images[0]!.url;
  const brand = p.brand?.name ?? null;
  const disc =
    p.discountPercent ??
    (p.mrp > p.salePrice ? Math.round(((p.mrp - p.salePrice) / p.mrp) * 100) : 0);

  return (
    <section className="container-x mt-4" aria-label="Featured product">
      <a
        href={`/product/${p.slug}`}
        className="relative flex min-h-[150px] items-center gap-3 overflow-hidden rounded-3xl border border-hairline bg-gradient-to-r from-[#d7ecff] via-[#eaf4ff] to-white p-5 no-underline shadow-sm transition-shadow hover:shadow-md sm:min-h-[176px] sm:gap-5 sm:p-7"
      >
        {/* corner disclosure tag — same position/restraint as the reference "AD" chip */}
        <span className="absolute right-3 top-3 z-20 rounded bg-ink-900/65 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur">
          Featured
        </span>

        {/* LEFT: headline + hero price + disclaimer */}
        <span className="relative z-10 min-w-0 flex-1">
          <span className="block font-display text-[17px] font-extrabold leading-[1.15] text-ink-900 line-clamp-2 sm:text-[21px]">
            {p.name}
          </span>

          <span className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[23px] font-black leading-none tabular-nums text-ink-900 sm:text-[28px]">
              {inr(p.salePrice)}
            </span>
            {p.mrp > p.salePrice && (
              <span className="text-[12px] tabular-nums text-ink-400 line-through sm:text-[13px]">
                {inr(p.mrp)}
              </span>
            )}
            {disc > 0 && (
              <span className="text-[12px] font-bold text-emerald-600 sm:text-[13px]">
                {disc}% off
              </span>
            )}
          </span>

          <span className="mt-3 block text-[10px] leading-tight text-ink-400">
            *Image for illustration.
          </span>
        </span>

        {/* RIGHT: glow + bleeding product + brand wordmark (no white box) */}
        <span className="relative z-10 -mr-2 h-32 w-[42%] shrink-0 sm:-mr-4 sm:h-44">
          <span
            aria-hidden
            className="absolute right-0 top-1/2 size-36 -translate-y-1/2 rounded-full bg-sky-200/60 blur-2xl sm:size-44"
          />
          <span className="relative grid h-full w-full place-items-center">
            <GuardedImg
              src={image}
              name={p.name}
              className="max-h-full w-auto object-contain drop-shadow-2xl"
            />
          </span>
          {brand && (
            <span className="absolute bottom-0 right-1 text-[11px] font-black uppercase tracking-[0.18em] text-ink-400 sm:text-[12px]">
              {brand}
            </span>
          )}
        </span>
      </a>
    </section>
  );
}