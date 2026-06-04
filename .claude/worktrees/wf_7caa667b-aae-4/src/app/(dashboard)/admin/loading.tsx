export default function AdminLoading() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-6 bg-[#2a2a2a] rounded w-48" />
        <div className="h-3 bg-[#2a2a2a] rounded w-72" />
      </div>
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card-dark p-4 space-y-2">
            <div className="h-3 bg-[#2a2a2a] rounded w-20" />
            <div className="h-6 bg-[#2a2a2a] rounded w-16" />
          </div>
        ))}
      </div>
      {/* Table skeleton */}
      <div className="card-dark divide-y divide-[#2a2a2a]">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="w-8 h-8 rounded-full bg-[#2a2a2a] shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-[#2a2a2a] rounded w-40" />
              <div className="h-2 bg-[#2a2a2a] rounded w-24" />
            </div>
            <div className="h-6 bg-[#2a2a2a] rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
