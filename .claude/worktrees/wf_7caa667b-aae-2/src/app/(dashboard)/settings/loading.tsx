import TopBar from "@/components/layout/TopBar";

export default function Loading() {
  return (
    <div>
      <TopBar title="Cài đặt" subtitle="Đang tải..." />

      <div className="p-4 sm:p-6 max-w-5xl mx-auto animate-pulse">
        {/* Mobile: horizontal tab chips */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 md:hidden">
          {[88, 100, 80, 100].map((w, i) => (
            <div
              key={i}
              className="h-9 bg-zinc-800 rounded-lg shrink-0"
              style={{ width: w }}
            />
          ))}
        </div>

        <div className="flex gap-6">
          {/* Desktop: tab sidebar */}
          <div className="w-52 shrink-0 hidden md:block">
            <div
              className="rounded-xl p-2 space-y-0.5"
              style={{ background: "#151515", border: "1px solid #2a2a2a" }}
            >
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2.5">
                  <div className="w-4 h-4 bg-zinc-800 rounded" />
                  <div className="flex-1 h-3 bg-zinc-800 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Avatar card */}
            <div
              className="rounded-xl p-6"
              style={{ background: "#151515", border: "1px solid #2a2a2a" }}
            >
              <div className="h-4 bg-zinc-800 rounded w-28 mb-4" />
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-full bg-zinc-800 shrink-0" />
                <div className="space-y-2">
                  <div className="h-8 bg-zinc-800 rounded-lg w-28" />
                  <div className="h-3 bg-zinc-800 rounded w-48" />
                </div>
              </div>
            </div>

            {/* Personal info form card */}
            <div
              className="rounded-xl p-6 space-y-5"
              style={{ background: "#151515", border: "1px solid #2a2a2a" }}
            >
              <div className="h-4 bg-zinc-800 rounded w-40" />
              {/* Name + email grid */}
              <div className="grid md:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-3 bg-zinc-800 rounded w-20" />
                    <div className="h-10 bg-zinc-800 rounded-lg" />
                  </div>
                ))}
              </div>
              {/* Phone */}
              <div className="space-y-1.5 md:w-1/2">
                <div className="h-3 bg-zinc-800 rounded w-28" />
                <div className="h-10 bg-zinc-800 rounded-lg" />
              </div>
              {/* Bio */}
              <div className="space-y-1.5">
                <div className="h-3 bg-zinc-800 rounded w-16" />
                <div className="h-20 bg-zinc-800 rounded-lg" />
              </div>
              <div className="flex justify-end">
                <div className="h-9 bg-zinc-800 rounded-lg w-28" />
              </div>
            </div>

            {/* Social links card */}
            <div
              className="rounded-xl p-6 space-y-4"
              style={{ background: "#151515", border: "1px solid #2a2a2a" }}
            >
              <div className="h-4 bg-zinc-800 rounded w-32" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-3 bg-zinc-800 rounded w-20 shrink-0" />
                  <div className="flex-1 h-10 bg-zinc-800 rounded-lg" />
                </div>
              ))}
              <div className="flex justify-end">
                <div className="h-9 bg-zinc-800 rounded-lg w-16" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
