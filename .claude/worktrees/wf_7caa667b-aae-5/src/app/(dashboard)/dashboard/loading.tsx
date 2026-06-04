import TopBar from "@/components/layout/TopBar";

export default function Loading() {
  return (
    <div>
      <TopBar title="Tổng quan" subtitle="Đang tải..." />
      <div className="p-6 max-w-6xl mx-auto space-y-8 animate-pulse">
        {/* Welcome + XP skeleton */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card-dark p-5 space-y-3">
            <div className="h-5 bg-[#2a2a2a] rounded w-48" />
            <div className="h-3 bg-[#2a2a2a] rounded w-64" />
            <div className="h-3 bg-[#2a2a2a] rounded w-32" />
          </div>
          <div className="card-dark p-5 space-y-3">
            <div className="h-3 bg-[#2a2a2a] rounded w-24" />
            <div className="h-6 bg-[#2a2a2a] rounded w-20" />
            <div className="progress-bar"><div className="h-full bg-[#2a2a2a] rounded-full w-1/2" /></div>
          </div>
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card-dark p-4 space-y-2">
              <div className="h-3 bg-[#2a2a2a] rounded w-16" />
              <div className="h-5 bg-[#2a2a2a] rounded w-12" />
            </div>
          ))}
        </div>
        {/* Quick access skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="card-dark p-4 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-[#2a2a2a]" />
              <div className="h-3 bg-[#2a2a2a] rounded w-20" />
              <div className="h-2 bg-[#2a2a2a] rounded w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
