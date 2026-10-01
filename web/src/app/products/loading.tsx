export default function ProductsLoading() {
  return (
    <div className="container mx-auto px-4 xl:px-8 py-8" aria-busy="true" aria-label="Đang tải sản phẩm">
      <div className="h-8 w-56 bg-slate-200 animate-pulse rounded mb-8" />
      <div className="flex gap-8">
        <div className="hidden lg:block w-64 shrink-0 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 animate-pulse rounded" />
          ))}
        </div>
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-[3/4] bg-slate-200 animate-pulse rounded-xl" />
              <div className="mt-3 h-4 w-3/4 bg-slate-200 animate-pulse rounded" />
              <div className="mt-2 h-4 w-1/3 bg-slate-200 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
