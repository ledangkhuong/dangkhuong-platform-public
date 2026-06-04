"use client";

import dynamic from "next/dynamic";

const AnalyticsDashboard = dynamic(
  () => import("@/components/admin/analytics/AnalyticsDashboard"),
  { ssr: false, loading: () => <div className="h-[400px] bg-[#151515] rounded-xl animate-pulse" /> }
);

export default function AnalyticsDashboardWrapper() {
  return <AnalyticsDashboard />;
}
