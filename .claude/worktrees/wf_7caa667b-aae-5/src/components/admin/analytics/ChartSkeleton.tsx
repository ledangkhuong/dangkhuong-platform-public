"use client";

// Card skeleton - for KPI cards
export function CardSkeleton() {
  return (
    <div className="card-dark p-5 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[#2a2a2a]" />
        <div className="h-3 w-20 bg-[#2a2a2a] rounded" />
      </div>
      <div className="h-7 w-32 bg-[#2a2a2a] rounded mb-2" />
      <div className="h-3 w-16 bg-[#2a2a2a] rounded" />
    </div>
  );
}

// Chart skeleton - for any chart area
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div
      className="card-dark p-5 animate-pulse"
      style={{ height }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-28 bg-[#2a2a2a] rounded" />
        <div className="h-3 w-16 bg-[#2a2a2a] rounded" />
      </div>
      <div className="flex items-end gap-2 h-[calc(100%-60px)] px-2">
        <div className="flex-1 bg-[#2a2a2a] rounded-t" style={{ height: "65%" }} />
        <div className="flex-1 bg-[#2a2a2a] rounded-t" style={{ height: "45%" }} />
        <div className="flex-1 bg-[#2a2a2a] rounded-t" style={{ height: "80%" }} />
        <div className="flex-1 bg-[#2a2a2a] rounded-t" style={{ height: "55%" }} />
        <div className="flex-1 bg-[#2a2a2a] rounded-t" style={{ height: "70%" }} />
        <div className="flex-1 bg-[#2a2a2a] rounded-t" style={{ height: "40%" }} />
        <div className="flex-1 bg-[#2a2a2a] rounded-t" style={{ height: "90%" }} />
        <div className="flex-1 bg-[#2a2a2a] rounded-t" style={{ height: "60%" }} />
      </div>
    </div>
  );
}

// Table skeleton - for product performance table
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card-dark p-5 animate-pulse">
      <div className="h-4 w-36 bg-[#2a2a2a] rounded mb-4" />
      <div className="space-y-3">
        {/* Header row */}
        <div className="flex items-center gap-4 pb-3 border-b border-[#2a2a2a]">
          <div className="h-3 w-32 bg-[#2a2a2a] rounded" />
          <div className="h-3 w-20 bg-[#2a2a2a] rounded" />
          <div className="h-3 w-20 bg-[#2a2a2a] rounded" />
          <div className="h-3 w-16 bg-[#2a2a2a] rounded" />
        </div>
        {/* Data rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-2">
            <div className="h-3 w-32 bg-[#2a2a2a] rounded" />
            <div className="h-3 w-20 bg-[#2a2a2a] rounded" />
            <div className="h-3 w-20 bg-[#2a2a2a] rounded" />
            <div className="h-3 w-16 bg-[#2a2a2a] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Funnel skeleton
export function FunnelSkeleton() {
  return (
    <div className="card-dark p-5 animate-pulse">
      <div className="h-4 w-28 bg-[#2a2a2a] rounded mb-6" />
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-full bg-[#2a2a2a] rounded" />
        <div className="h-10 w-[85%] bg-[#2a2a2a] rounded" />
        <div className="h-10 w-[65%] bg-[#2a2a2a] rounded" />
        <div className="h-10 w-[45%] bg-[#2a2a2a] rounded" />
        <div className="h-10 w-[30%] bg-[#2a2a2a] rounded" />
      </div>
    </div>
  );
}
