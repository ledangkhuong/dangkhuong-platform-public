import TopBar from "@/components/layout/TopBar";

export default function Loading() {
  return (
    <div>
      <TopBar title="Blog" subtitle="Đang tải..." />

      <div className="p-6 max-w-5xl mx-auto space-y-8 animate-pulse">
        {/* Category chips */}
        <div className="flex gap-2 flex-wrap">
          {[80, 100, 72, 90, 64].map((w, i) => (
            <div
              key={i}
              className="h-8 rounded-full bg-zinc-800"
              style={{ width: w }}
            />
          ))}
        </div>

        {/* Featured post skeleton */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "#151515", border: "1px solid #2a2a2a" }}
        >
          {/* Wide thumbnail */}
          <div className="w-full bg-zinc-800" style={{ aspectRatio: "21/9" }} />
          {/* Content */}
          <div className="p-5 space-y-3">
            <div className="flex gap-2">
              <div className="h-5 bg-zinc-800 rounded-full w-16" />
              <div className="h-5 bg-zinc-800 rounded-full w-24" />
            </div>
            <div className="h-6 bg-zinc-800 rounded w-3/4" />
            <div className="h-4 bg-zinc-800 rounded w-full" />
            <div className="h-4 bg-zinc-800 rounded w-5/6" />
            <div className="flex justify-between pt-1">
              <div className="flex gap-4">
                <div className="h-3 bg-zinc-800 rounded w-16" />
                <div className="h-3 bg-zinc-800 rounded w-20" />
                <div className="h-3 bg-zinc-800 rounded w-14" />
              </div>
            </div>
          </div>
        </div>

        {/* Grid of post cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden"
              style={{ background: "#151515", border: "1px solid #2a2a2a" }}
            >
              {/* 16/9 thumbnail */}
              <div className="w-full bg-zinc-800" style={{ aspectRatio: "16/9" }} />
              {/* Card content */}
              <div className="p-4 space-y-2">
                <div className="h-4 bg-zinc-800 rounded-full w-20" />
                <div className="h-4 bg-zinc-800 rounded w-full" />
                <div className="h-4 bg-zinc-800 rounded w-4/5" />
                <div className="h-3 bg-zinc-800 rounded w-full" />
                <div className="flex gap-3 pt-1">
                  <div className="h-3 bg-zinc-800 rounded w-14" />
                  <div className="h-3 bg-zinc-800 rounded w-10" />
                  <div className="h-3 bg-zinc-800 rounded w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Newsletter CTA skeleton */}
        <div
          className="rounded-xl p-6 space-y-3"
          style={{ background: "#151515", border: "1px solid #2a2a2a" }}
        >
          <div className="h-5 bg-zinc-800 rounded w-48 mx-auto" />
          <div className="h-3 bg-zinc-800 rounded w-64 mx-auto" />
          <div className="flex gap-2 max-w-sm mx-auto">
            <div className="flex-1 h-10 bg-zinc-800 rounded-lg" />
            <div className="h-10 w-24 bg-zinc-800 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
