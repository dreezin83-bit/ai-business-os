export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-slate-800 rounded" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-20 bg-slate-800 rounded-xl" />
        ))}
      </div>
      <div className="h-48 bg-slate-800 rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="h-40 bg-slate-800 rounded-xl" />
        <div className="h-40 bg-slate-800 rounded-xl" />
      </div>
      <div className="h-96 bg-slate-800 rounded-xl" />
    </div>
  );
}
