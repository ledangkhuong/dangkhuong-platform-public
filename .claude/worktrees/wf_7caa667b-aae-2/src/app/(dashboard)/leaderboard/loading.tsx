import TopBar from "@/components/layout/TopBar";

export default function Loading() {
  return (
    <div>
      <TopBar title="Bảng xếp hạng" subtitle="Đang tải..." />
      <div className="p-6 max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card-dark p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#2a2a2a]" />
              <div className="space-y-1">
                <div className="h-3 bg-[#2a2a2a] rounded w-12" />
                <div className="h-5 bg-[#2a2a2a] rounded w-10" />
              </div>
            </div>
          ))}
        </div>
        <div className="card-dark p-6">
          <div className="flex items-end justify-center gap-4">
            {[80, 110, 60].map((h, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-[#2a2a2a]" />
                <div className="h-3 bg-[#2a2a2a] rounded w-12" />
                <div className="w-20 bg-[#2a2a2a] rounded-t-lg" style={{ height: h }} />
              </div>
            ))}
          </div>
        </div>
        <div className="card-dark divide-y divide-[#1f1f1f]">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="w-6 h-4 bg-[#2a2a2a] rounded" />
              <div className="w-9 h-9 rounded-full bg-[#2a2a2a]" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-[#2a2a2a] rounded w-32" />
                <div className="h-2 bg-[#2a2a2a] rounded w-20" />
              </div>
              <div className="h-4 bg-[#2a2a2a] rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
