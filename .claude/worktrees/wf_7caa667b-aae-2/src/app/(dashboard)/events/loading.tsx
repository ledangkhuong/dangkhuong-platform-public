import TopBar from "@/components/layout/TopBar";

export default function Loading() {
  return (
    <div>
      <TopBar title="Sự kiện" subtitle="Đang tải..." />

      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 animate-pulse">
        {/* Month calendar card */}
        <div
          className="rounded-xl p-5"
          style={{ background: "#151515", border: "1px solid #2a2a2a" }}
        >
          {/* Calendar header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-800" />
              <div className="space-y-1">
                <div className="h-5 bg-zinc-800 rounded w-32" />
                <div className="h-3 bg-zinc-800 rounded w-44" />
              </div>
            </div>
            <div className="flex gap-1">
              <div className="w-8 h-8 bg-zinc-800 rounded-lg" />
              <div className="w-8 h-8 bg-zinc-800 rounded-lg" />
            </div>
          </div>

          {/* Day-of-week labels */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-5 bg-zinc-800 rounded mx-auto w-5" />
            ))}
          </div>

          {/* Calendar grid — 5 rows × 7 columns */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-10 rounded-xl bg-zinc-800" />
            ))}
          </div>
        </div>

        {/* Section heading */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-zinc-800 rounded" />
          <div className="h-5 bg-zinc-800 rounded w-36" />
        </div>

        {/* Event cards */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl p-5"
            style={{ background: "#151515", border: "1px solid #2a2a2a" }}
          >
            <div className="flex items-start gap-4">
              {/* Date block */}
              <div className="shrink-0 w-14 space-y-1 text-center">
                <div className="h-8 bg-zinc-800 rounded w-10 mx-auto" />
                <div className="h-3 bg-zinc-800 rounded w-12 mx-auto" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-2">
                {/* Badges row */}
                <div className="flex gap-2">
                  <div className="h-5 bg-zinc-800 rounded-full w-24" />
                  <div className="h-5 bg-zinc-800 rounded-full w-16" />
                </div>
                {/* Title */}
                <div className="h-5 bg-zinc-800 rounded w-3/4" />
                {/* Description */}
                <div className="h-3 bg-zinc-800 rounded w-full" />
                <div className="h-3 bg-zinc-800 rounded w-5/6" />
                {/* Meta row */}
                <div className="flex gap-4 flex-wrap">
                  <div className="h-3 bg-zinc-800 rounded w-20" />
                  <div className="h-3 bg-zinc-800 rounded w-16" />
                  <div className="h-3 bg-zinc-800 rounded w-14" />
                </div>
                {/* CTA button */}
                {i === 1 && (
                  <div className="h-9 bg-zinc-800 rounded-xl w-32 mt-1" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
