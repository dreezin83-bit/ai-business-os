/**
 * Shared loading spinner for dashboard routes.
 * Used by loading.tsx files to show a skeleton while page data loads.
 */
export function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-slate-800 rounded-lg animate-pulse" />
        <div className="h-10 w-32 bg-slate-800 rounded-lg animate-pulse" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-28 bg-slate-800/50 rounded-xl border border-slate-700/30 animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-slate-700/30 bg-slate-800/50 overflow-hidden">
        <div className="p-4 border-b border-slate-700/30 flex gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-4 rounded bg-slate-700/50 animate-pulse"
              style={{ width: `${60 + Math.random() * 80}px`, animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="p-4 border-b border-slate-700/20 flex gap-4"
          >
            {[...Array(4)].map((_, j) => (
              <div
                key={j}
                className="h-4 rounded bg-slate-700/30 animate-pulse"
                style={{ width: `${40 + Math.random() * 120}px`, animationDelay: `${(i + j) * 80}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
