import { createClient, createAdminClient } from "@/lib/supabase/server";
import TopBar from "@/components/layout/TopBar";
import {
  Filter,
  TrendingDown,
  ArrowDown,
  Users,
  Eye,
  Target,
  BarChart2,
  Zap,
  AlertTriangle,
  Award,
  ChevronRight,
} from "lucide-react";
import { redirect } from "next/navigation";

/* ---------- Types ---------- */

interface StageData {
  key: string;
  label: string;
  count: number;
  color: string;
  pctOfTotal: number;
  dropOffFromPrev: number;
  conversionFromPrev: number;
}

interface SourceFunnel {
  source: string;
  stages: Record<string, number>;
  total: number;
  customers: number;
  completionRate: number;
}

/* ---------- Constants ---------- */

const JOURNEY_STAGES = [
  { key: "visitor", label: "Visitor", color: "#6b7280" },
  { key: "lead", label: "Lead", color: "#3b82f6" },
  { key: "contacted", label: "Contacted", color: "#8b5cf6" },
  { key: "qualified", label: "Qualified", color: "#a855f7" },
  { key: "negotiation", label: "Negotiation", color: "#f59e0b" },
  { key: "customer", label: "Customer", color: "#22c55e" },
  { key: "advocate", label: "Advocate", color: "#10b981" },
] as const;

/* ---------- Helpers ---------- */

function pct(n: number, d: number): string {
  if (d === 0) return "0%";
  return (n / d * 100).toFixed(1) + "%";
}

function pctNum(n: number, d: number): number {
  if (d === 0) return 0;
  return Number((n / d * 100).toFixed(1));
}

function defaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function defaultTo(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ---------- Page ---------- */

export default async function FunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;

  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const allowedRoles = ["admin", "manager", "marketing"];
  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect("/");
  }

  const adminClient = await createAdminClient();

  const dateFrom = params.from || defaultFrom();
  const dateTo = params.to || defaultTo();

  // ── 1. Fetch all contacts within date range ──────────────────
  let contactQuery = adminClient
    .from("crm_contacts")
    .select("id, journey_stage, utm_source, created_at, converted_at");

  contactQuery = contactQuery.gte("created_at", dateFrom);
  contactQuery = contactQuery.lte("created_at", dateTo + "T23:59:59");

  const { data: contactsData } = await contactQuery;
  const contacts = contactsData ?? [];

  // ── 2. Fetch page_view count as top-of-funnel ────────────────
  let pvQuery = adminClient
    .from("analytics_events")
    .select("*", { count: "exact", head: true })
    .eq("event", "page_view");

  pvQuery = pvQuery.gte("created_at", dateFrom);
  pvQuery = pvQuery.lte("created_at", dateTo + "T23:59:59");

  const { count: pageViewCount } = await pvQuery;
  const totalPageViews = pageViewCount ?? 0;

  // ── 3. Count contacts by journey_stage ───────────────────────
  const stageCounts: Record<string, number> = {};
  for (const stage of JOURNEY_STAGES) {
    stageCounts[stage.key] = 0;
  }
  for (const c of contacts) {
    const stage = (c.journey_stage as string) || "visitor";
    if (stageCounts[stage] !== undefined) {
      stageCounts[stage] += 1;
    }
  }

  const totalContacts = contacts.length;

  // ── 4. Build funnel stage data ───────────────────────────────
  // The funnel is cumulative: everyone at stage N also passed through stage N-1.
  // We build cumulative counts: contacts at stage X or BEYOND.
  const stageOrder = JOURNEY_STAGES.map(s => s.key);
  const cumulativeCounts: Record<string, number> = {};

  // For cumulative: count of contacts at this stage or later
  for (let i = 0; i < stageOrder.length; i++) {
    let cumSum = 0;
    for (let j = i; j < stageOrder.length; j++) {
      cumSum += stageCounts[stageOrder[j]];
    }
    cumulativeCounts[stageOrder[i]] = cumSum;
  }

  // Build stage data with page_views as the very top
  const topOfFunnel = Math.max(totalPageViews, cumulativeCounts["visitor"] || 0);

  const stageDataList: StageData[] = JOURNEY_STAGES.map((stage, i) => {
    const count = cumulativeCounts[stage.key];
    const prevCount = i === 0 ? topOfFunnel : cumulativeCounts[stageOrder[i - 1]];
    const dropOff = prevCount > 0 ? pctNum(prevCount - count, prevCount) : 0;
    const conversionFromPrev = prevCount > 0 ? pctNum(count, prevCount) : 0;

    return {
      key: stage.key,
      label: stage.label,
      count,
      color: stage.color,
      pctOfTotal: topOfFunnel > 0 ? pctNum(count, topOfFunnel) : 0,
      dropOffFromPrev: dropOff,
      conversionFromPrev,
    };
  });

  // Overall conversion rate (customer+advocate / topOfFunnel)
  const customersAndAdvocates = (cumulativeCounts["customer"] || 0);
  const overallConversionRate = topOfFunnel > 0
    ? pctNum(customersAndAdvocates, topOfFunnel)
    : 0;

  // ── 5. Find biggest drop-off ─────────────────────────────────
  let biggestDropoff = { from: "—", to: "—", rate: 0 };
  for (let i = 1; i < stageDataList.length; i++) {
    if (stageDataList[i].dropOffFromPrev > biggestDropoff.rate) {
      biggestDropoff = {
        from: stageDataList[i - 1].label,
        to: stageDataList[i].label,
        rate: stageDataList[i].dropOffFromPrev,
      };
    }
  }
  // Also check page_views -> visitor
  const pvToVisitorDropoff = topOfFunnel > 0
    ? pctNum(topOfFunnel - (cumulativeCounts["visitor"] || 0), topOfFunnel)
    : 0;
  if (pvToVisitorDropoff > biggestDropoff.rate) {
    biggestDropoff = {
      from: "Page Views",
      to: "Visitor",
      rate: pvToVisitorDropoff,
    };
  }

  // ── 6. Funnel by source ──────────────────────────────────────
  const sourceMap = new Map<string, SourceFunnel>();
  for (const c of contacts) {
    const src = ((c.utm_source as string) || "direct").toLowerCase();
    if (!sourceMap.has(src)) {
      sourceMap.set(src, {
        source: src,
        stages: {},
        total: 0,
        customers: 0,
        completionRate: 0,
      });
    }
    const row = sourceMap.get(src)!;
    row.total += 1;
    const stage = (c.journey_stage as string) || "visitor";
    row.stages[stage] = (row.stages[stage] || 0) + 1;
    if (stage === "customer" || stage === "advocate") {
      row.customers += 1;
    }
  }

  const sourceFunnels = Array.from(sourceMap.values())
    .map(sf => ({
      ...sf,
      completionRate: sf.total > 0 ? pctNum(sf.customers, sf.total) : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const bestSource = sourceFunnels.length > 0
    ? sourceFunnels.reduce((best, s) => s.completionRate > best.completionRate ? s : best)
    : null;

  // ── 7. Average time to convert (contacts with converted_at) ──
  const conversionTimes: { stage: string; avgDays: number }[] = [];
  const convertedContacts = contacts.filter(
    c => c.converted_at && c.created_at
  );
  if (convertedContacts.length > 0) {
    const totalMs = convertedContacts.reduce((sum, c) => {
      const created = new Date(c.created_at as string).getTime();
      const converted = new Date(c.converted_at as string).getTime();
      return sum + Math.max(0, converted - created);
    }, 0);
    const avgDays = totalMs / convertedContacts.length / (1000 * 60 * 60 * 24);
    conversionTimes.push({
      stage: "Overall",
      avgDays: Number(avgDays.toFixed(1)),
    });
  }

  // ── Funnel gradient colors (gray → green) ────────────────────
  const funnelGradient = [
    "#4b5563", // visitor - gray
    "#3b82f6", // lead - blue
    "#7c3aed", // contacted - violet
    "#a855f7", // qualified - purple
    "#f59e0b", // negotiation - amber
    "#22c55e", // customer - green
    "#10b981", // advocate - emerald
  ];

  // Max width percentages for funnel bars (100% down to ~25%)
  const maxWidth = 100;
  const minWidth = 25;

  return (
    <div>
      <TopBar
        title="Phễu Chuyển Đổi"
        subtitle="Phân tích hành trình khách hàng từ visitor đến customer"
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Date filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Filter size={20} className="text-[#D4A843]" />
              Conversion Funnel
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {totalContacts.toLocaleString("vi-VN")} contacts &middot;{" "}
              {totalPageViews.toLocaleString("vi-VN")} page views
            </p>
          </div>
          <form method="GET" className="flex items-center gap-2">
            <input
              type="date"
              name="from"
              defaultValue={dateFrom}
              className="input-dark px-3 py-1.5 text-xs"
            />
            <span className="text-gray-500 text-xs">&rarr;</span>
            <input
              type="date"
              name="to"
              defaultValue={dateTo}
              className="input-dark px-3 py-1.5 text-xs"
            />
            <button
              type="submit"
              className="btn-green px-3 py-1.5 text-xs font-medium rounded-lg"
            >
              Lọc
            </button>
          </form>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Page Views (Top of Funnel)",
              value: totalPageViews.toLocaleString("vi-VN"),
              icon: Eye,
              color: "#6b7280",
            },
            {
              label: "Total Contacts",
              value: totalContacts.toLocaleString("vi-VN"),
              icon: Users,
              color: "#3b82f6",
            },
            {
              label: "Customers + Advocates",
              value: String(customersAndAdvocates),
              icon: Target,
              color: "#22c55e",
            },
            {
              label: "Overall Conversion",
              value: overallConversionRate + "%",
              icon: TrendingDown,
              color: "#D4A843",
            },
          ].map((stat, i) => (
            <div key={i} className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{stat.label}</span>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: stat.color + "18" }}
                >
                  <stat.icon size={15} style={{ color: stat.color }} />
                </div>
              </div>
              <div className="text-xl font-bold text-white">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* ============================================================ */}
        {/* Section A: Visual Funnel (Hero)                               */}
        {/* ============================================================ */}
        <div className="card-dark p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart2 size={18} className="text-[#D4A843]" />
            <h3 className="text-lg font-bold text-white">
              Visual Conversion Funnel
            </h3>
          </div>

          {/* Page Views — top of funnel */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Eye size={14} style={{ color: "#9ca3af" }} />
                <span className="text-sm font-semibold text-white">
                  Page Views
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-white">
                  {totalPageViews.toLocaleString("vi-VN")}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: "rgba(107,114,128,0.15)", color: "#9ca3af" }}
                >
                  100%
                </span>
              </div>
            </div>
            <div
              style={{
                width: "100%",
                height: "40px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #374151 0%, #4b5563 100%)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 100%)",
                }}
              />
            </div>
          </div>

          {/* Drop-off arrow: page_views → visitor */}
          <div className="flex items-center justify-center gap-2 py-1">
            <ArrowDown size={14} className="text-gray-600" />
            <span className="text-[11px] text-gray-500">
              {pvToVisitorDropoff}% drop-off
            </span>
          </div>

          {/* Funnel stages */}
          <div className="space-y-0">
            {stageDataList.map((stage, i) => {
              // Calculate bar width proportionally
              const widthPct =
                topOfFunnel > 0
                  ? Math.max(
                      minWidth,
                      Math.round(
                        minWidth +
                          ((maxWidth - minWidth) * stage.count) / topOfFunnel
                      )
                    )
                  : minWidth;

              return (
                <div key={stage.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ background: funnelGradient[i] }}
                      />
                      <span className="text-sm font-semibold text-white">
                        {stage.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white">
                        {stage.count.toLocaleString("vi-VN")}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{
                          background: funnelGradient[i] + "20",
                          color: funnelGradient[i],
                        }}
                      >
                        {stage.pctOfTotal}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <div
                      style={{
                        width: `${widthPct}%`,
                        height: "36px",
                        borderRadius: "8px",
                        background: `linear-gradient(135deg, ${funnelGradient[i]}99 0%, ${funnelGradient[i]}66 100%)`,
                        border: `1px solid ${funnelGradient[i]}55`,
                        position: "relative",
                        overflow: "hidden",
                        transition: "all 0.3s ease",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 100%)",
                        }}
                      />
                      {/* Count label inside bar */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.9)",
                            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                          }}
                        >
                          {stage.conversionFromPrev}% from prev
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Drop-off indicator between stages */}
                  {i < stageDataList.length - 1 && (
                    <div className="flex items-center justify-center gap-2 py-1">
                      <ArrowDown size={12} className="text-gray-600" />
                      <span className="text-[11px] text-gray-500">
                        {stageDataList[i + 1].dropOffFromPrev}% drop-off
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ============================================================ */}
        {/* Section B: Stage-by-stage Breakdown                           */}
        {/* ============================================================ */}
        <div className="card-dark overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2">
              <TrendingDown size={16} className="text-[#D4A843]" />
              <h3 className="font-semibold text-white text-sm">
                Stage-by-Stage Breakdown
              </h3>
            </div>
            <span className="text-xs text-gray-500">
              {JOURNEY_STAGES.length} stages
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                  {[
                    "Transition",
                    "From",
                    "To",
                    "Conversion Rate",
                    "Drop-off",
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Page Views → Visitor */}
                <tr
                  className="transition-colors hover:bg-white/[0.02]"
                  style={{ borderBottom: "1px solid #2a2a2a" }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-white">
                      <span className="text-gray-400">Page Views</span>
                      <ChevronRight size={12} className="text-gray-600" />
                      <span className="text-gray-300">Visitor</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white font-semibold">
                    {totalPageViews.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-3 text-white font-semibold">
                    {(cumulativeCounts["visitor"] || 0).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        background: "rgba(34,197,94,0.1)",
                        color: "#22c55e",
                      }}
                    >
                      {pct(cumulativeCounts["visitor"] || 0, totalPageViews)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        background: "rgba(239,68,68,0.1)",
                        color: "#ef4444",
                      }}
                    >
                      {pvToVisitorDropoff}%
                    </span>
                  </td>
                </tr>

                {/* Stage transitions */}
                {stageDataList.map((stage, i) => {
                  if (i === 0) return null; // Skip visitor (already shown above)
                  const prev = stageDataList[i - 1];
                  return (
                    <tr
                      key={stage.key}
                      className="transition-colors hover:bg-white/[0.02]"
                      style={{
                        borderBottom:
                          i < stageDataList.length - 1
                            ? "1px solid #2a2a2a"
                            : "none",
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-sm"
                            style={{ background: funnelGradient[i - 1] }}
                          />
                          <span className="text-gray-400">{prev.label}</span>
                          <ChevronRight
                            size={12}
                            className="text-gray-600"
                          />
                          <div
                            className="w-2.5 h-2.5 rounded-sm"
                            style={{ background: funnelGradient[i] }}
                          />
                          <span className="text-gray-300">{stage.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white font-semibold">
                        {prev.count.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3 text-white font-semibold">
                        {stage.count.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            background: "rgba(34,197,94,0.1)",
                            color: "#22c55e",
                          }}
                        >
                          {stage.conversionFromPrev}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            background:
                              stage.dropOffFromPrev > 50
                                ? "rgba(239,68,68,0.1)"
                                : "rgba(245,158,11,0.1)",
                            color:
                              stage.dropOffFromPrev > 50
                                ? "#ef4444"
                                : "#f59e0b",
                          }}
                        >
                          {stage.dropOffFromPrev}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Average conversion time */}
          {conversionTimes.length > 0 && (
            <div
              className="px-5 py-3 flex items-center gap-2 text-xs"
              style={{ borderTop: "1px solid #2a2a2a" }}
            >
              <Zap size={13} className="text-[#D4A843]" />
              <span className="text-gray-400">
                Thời gian chuyển đổi trung bình:{" "}
                <span className="text-white font-semibold">
                  {conversionTimes[0].avgDays} ngày
                </span>
              </span>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* Section C: Funnel by Source                                    */}
        {/* ============================================================ */}
        <div className="card-dark p-5">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={16} className="text-[#D4A843]" />
            <h3 className="font-semibold text-white text-sm">
              Funnel by Source
            </h3>
            <span className="text-xs text-gray-500 ml-auto">
              Top {sourceFunnels.length} sources
            </span>
          </div>

          {sourceFunnels.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {sourceFunnels.map((sf) => {
                // Build cumulative for this source
                const srcCumulative: number[] = [];
                for (let i = 0; i < stageOrder.length; i++) {
                  let cumSum = 0;
                  for (let j = i; j < stageOrder.length; j++) {
                    cumSum += sf.stages[stageOrder[j]] || 0;
                  }
                  srcCumulative.push(cumSum);
                }
                const srcMax = Math.max(1, ...srcCumulative);

                return (
                  <div
                    key={sf.source}
                    className="rounded-xl overflow-hidden"
                    style={{
                      background: "#0f0f0f",
                      border: "1px solid #2a2a2a",
                    }}
                  >
                    {/* Source header */}
                    <div
                      className="flex items-center justify-between px-4 py-3"
                      style={{ borderBottom: "1px solid #2a2a2a" }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm"
                          style={{
                            background:
                              sf.source === "facebook"
                                ? "#1877F2"
                                : sf.source === "google"
                                  ? "#EA4335"
                                  : sf.source === "tiktok"
                                    ? "#010101"
                                    : sf.source === "email"
                                      ? "#D4A843"
                                      : "#6b7280",
                          }}
                        />
                        <span className="text-sm font-semibold text-white capitalize">
                          {sf.source}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {sf.total} contacts
                        </span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                          style={{
                            background: "rgba(34,197,94,0.1)",
                            color: "#22c55e",
                          }}
                        >
                          {sf.completionRate}%
                        </span>
                      </div>
                    </div>

                    {/* Mini funnel */}
                    <div className="px-4 py-3 space-y-1.5">
                      {JOURNEY_STAGES.map((stage, si) => {
                        const count = srcCumulative[si];
                        const barW =
                          srcMax > 0
                            ? Math.max(8, Math.round((count / srcMax) * 100))
                            : 0;
                        return (
                          <div key={stage.key} className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-500 w-20 shrink-0 truncate">
                              {stage.label}
                            </span>
                            <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${barW}%`,
                                  background: funnelGradient[si],
                                  minWidth: count > 0 ? "4px" : "0",
                                  transition: "width 0.3s ease",
                                }}
                              />
                            </div>
                            <span className="text-[11px] text-gray-400 w-8 text-right font-semibold">
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
              Chưa có dữ liệu nguồn
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* Section D: Key Insights                                       */}
        {/* ============================================================ */}
        <div
          className="rounded-xl p-5"
          style={{
            background:
              "linear-gradient(135deg, rgba(212,168,67,0.06) 0%, rgba(34,197,94,0.04) 100%)",
            border: "1px solid rgba(212,168,67,0.15)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Award size={16} className="text-[#D4A843]" />
            <h3 className="font-semibold text-white text-sm">Key Insights</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Biggest drop-off */}
            <div
              className="rounded-lg p-4"
              style={{
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.12)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-red-400" />
                <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
                  Biggest Drop-off
                </span>
              </div>
              <p className="text-white text-sm font-semibold">
                {biggestDropoff.from} &rarr; {biggestDropoff.to}
              </p>
              <p className="text-red-400 text-2xl font-bold mt-1">
                {biggestDropoff.rate}%
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Cần tập trung cải thiện giai đoạn này
              </p>
            </div>

            {/* Best converting source */}
            <div
              className="rounded-lg p-4"
              style={{
                background: "rgba(34,197,94,0.06)",
                border: "1px solid rgba(34,197,94,0.12)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Award size={14} className="text-green-400" />
                <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">
                  Best Converting Source
                </span>
              </div>
              <p className="text-white text-sm font-semibold capitalize">
                {bestSource?.source ?? "—"}
              </p>
              <p className="text-green-400 text-2xl font-bold mt-1">
                {bestSource?.completionRate ?? 0}%
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Tỷ lệ hoàn thành funnel cao nhất
              </p>
            </div>

            {/* Overall funnel completion */}
            <div
              className="rounded-lg p-4"
              style={{
                background: "rgba(212,168,67,0.06)",
                border: "1px solid rgba(212,168,67,0.12)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Target size={14} className="text-[#D4A843]" />
                <span className="text-xs font-semibold text-[#D4A843] uppercase tracking-wider">
                  Funnel Completion Rate
                </span>
              </div>
              <p className="text-white text-sm font-semibold">
                Page View &rarr; Customer
              </p>
              <p className="text-[#D4A843] text-2xl font-bold mt-1">
                {overallConversionRate}%
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Tỷ lệ chuyển đổi toàn bộ phễu
              </p>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="text-center text-xs text-gray-500 py-4">
          Dữ liệu phễu chuyển đổi dựa trên crm_contacts.journey_stage và analytics_events page_view.
        </div>
      </div>
    </div>
  );
}
