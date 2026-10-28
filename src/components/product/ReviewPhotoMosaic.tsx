type Props = { urls: string[]; max?: number };

export function ReviewPhotoMosaic({ urls, max = 5 }: Props) {
  const list = (urls ?? []).filter(Boolean);
  if (list.length < 2) return null;
  const shown = list.slice(0, max);
  const extra = list.length - shown.length;
  return (
    <div className="grid auto-rows-[120px] grid-cols-3 gap-2 pb-3 md:auto-rows-[140px]">
      {shown.map((u, i) => (
        <div key={u + i} className={`relative overflow-hidden rounded-lg bg-gray-100 ${i === 0 ? "row-span-2" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u} alt="" loading="lazy" className="size-full object-cover" />
          {i === shown.length - 1 && extra > 0 ? (
            <span className="absolute inset-0 grid place-items-center bg-black/45 text-[15px] font-bold text-white">+{extra}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default ReviewPhotoMosaic;