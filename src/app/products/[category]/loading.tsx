export default function Loading() {
  return (
    <div className="container-x space-y-6 py-6" aria-busy="true" aria-live="polite">
      <div className="h-[180px] w-full animate-pulse rounded-2xl bg-gray-200 sm:h-[240px] md:h-[320px]" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-xl bg-gray-200" />
        ))}
      </div>
      <div className="h-[150px] w-full animate-pulse rounded-xl bg-gray-200" />
      <div className="h-[300px] w-full animate-pulse rounded-xl bg-gray-100" />
    </div>
  );
}