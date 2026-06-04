import TopBar from "@/components/layout/TopBar";

export default function Loading() {
  return (
    <div>
      <TopBar title="Khoá học" subtitle="Đang tải..." />

      {/* Desktop: side-by-side */}
      <div className="hidden lg:flex h-[calc(100vh-64px)] animate-pulse">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Video player skeleton */}
          <div className="w-full aspect-video rounded-xl bg-zinc-800" />

          {/* Lesson title + meta */}
          <div className="space-y-2">
            <div className="h-6 bg-zinc-800 rounded w-2/3" />
            <div className="flex gap-4">
              <div className="h-3 bg-zinc-800 rounded w-20" />
              <div className="h-3 bg-zinc-800 rounded w-28" />
            </div>
          </div>

          {/* Progress card */}
          <div className="rounded-xl p-4 space-y-2" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
            <div className="flex justify-between">
              <div className="h-3 bg-zinc-800 rounded w-32" />
              <div className="h-3 bg-zinc-800 rounded w-10" />
            </div>
            <div className="h-2 bg-zinc-800 rounded-full" />
            <div className="h-2 bg-zinc-800 rounded w-40" />
          </div>

          {/* Action button */}
          <div className="h-10 bg-zinc-800 rounded-xl w-48" />

          {/* Q&A section */}
          <div className="space-y-3">
            <div className="h-4 bg-zinc-800 rounded w-24" />
            {[1, 2].map((i) => (
              <div key={i} className="rounded-xl p-4 space-y-2" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-zinc-800 rounded w-32" />
                    <div className="h-3 bg-zinc-800 rounded w-full" />
                    <div className="h-3 bg-zinc-800 rounded w-4/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <aside
          className="w-80 shrink-0 border-l border-[#2a2a2a] overflow-y-auto"
          style={{ background: "#111" }}
        >
          {/* Sidebar header */}
          <div className="p-4 border-b border-[#2a2a2a] space-y-1">
            <div className="h-4 bg-zinc-800 rounded w-36" />
            <div className="h-3 bg-zinc-800 rounded w-24" />
          </div>

          {/* Chapter + lesson list */}
          {[1, 2, 3].map((ch) => (
            <div key={ch} className="border-b border-[#1f1f1f]">
              <div className="flex items-center justify-between p-3 bg-[#0d0d0d]">
                <div className="h-3 bg-zinc-800 rounded w-28" />
                <div className="h-3 bg-zinc-800 rounded w-8" />
              </div>
              {[1, 2, 3].map((l) => (
                <div key={l} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-3.5 h-3.5 rounded-full bg-zinc-800 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-zinc-800 rounded w-4/5" />
                    <div className="h-2 bg-zinc-800 rounded w-12" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </aside>
      </div>

      {/* Mobile: stacked */}
      <div className="lg:hidden p-4 space-y-5 animate-pulse">
        <div className="w-full aspect-video rounded-xl bg-zinc-800" />
        <div className="space-y-2">
          <div className="h-5 bg-zinc-800 rounded w-3/4" />
          <div className="flex gap-3">
            <div className="h-3 bg-zinc-800 rounded w-20" />
            <div className="h-3 bg-zinc-800 rounded w-24" />
          </div>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full" />
        <div className="h-10 bg-zinc-800 rounded-xl w-40" />
      </div>
    </div>
  );
}
