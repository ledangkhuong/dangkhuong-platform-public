"use client";

import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import EmailNav from "@/components/email/EmailNav";
import {
  Send,
  Eye,
  MousePointer,
  AlertTriangle,
  UserMinus,
  TrendingUp,
  TrendingDown,
  Trophy,
  RefreshCw,
  Calendar,
  ArrowUpRight,
  UserPlus,
  ShieldAlert,
  Loader2,
} from "lucide-react";

interface DailyStat {
  date: string;
  sent: number;
  opens: number;
  clicks: number;
  bounces: number;
  new_subscribers: number;
}

interface TopCampaign {
  id: string;
  name: string;
  subject: string;
  sent_count: number;
  open_count: number;
  click_count: number;
  open_rate: number;
  click_rate: number;
}

interface RecentBounce {
  email: string;
  bounce_type: string;
  reason: string;
  date: string;
  campaign_id: string;
}

interface AnalyticsData {
  summary: {
    total_sent: number;
    total_opens: number;
    total_clicks: number;
    total_bounces: number;
    total_complaints: number;
    total_unsubscribes: number;
  };
  rates: {
    avg_open_rate: number;
    avg_click_rate: number;
    avg_bounce_rate: number;
  };
  daily_stats: DailyStat[];
  top_campaigns: TopCampaign[];
  subscriber_growth: { date: string; new_subscribers: number; total_active: number }[];
  recent_bounces: RecentBounce[];
  bounce_breakdown: { hard_bounces: number; soft_bounces: number };
  period: string;
  campaign_count: number;
}

interface CampaignRow {
  id: string;
  name: string;
  subject: string;
  sent_count: number;
  open_count: number;
  click_count: number;
  status: string;
  total_recipients: number;
}

type SortField = "name" | "sent_count" | "open_count" | "click_count" | "open_rate" | "click_rate";
type SortDir = "asc" | "desc";

const periods = [
  { label: "7 ngày", value: "7d" },
  { label: "30 ngày", value: "30d" },
  { label: "90 ngày", value: "90d" },
];

function rateColor(rate: number, type: "open" | "click") {
  if (type === "open") {
    if (rate >= 20) return "#D4A843";
    if (rate >= 10) return "#f59e0b";
    return "#ef4444";
  }
  if (rate >= 3) return "#D4A843";
  if (rate >= 1) return "#f59e0b";
  return "#ef4444";
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("30d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("sent_count");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, campaignsRes] = await Promise.all([
        fetch(`/api/email/analytics/overview?period=${period}`),
        fetch("/api/email/campaigns?limit=100"),
      ]);
      if (analyticsRes.ok) {
        const json = await analyticsRes.json();
        setData(json);
      }
      if (campaignsRes.ok) {
        const json = await campaignsRes.json();
        setCampaigns(json.campaigns || []);
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  // Sort campaigns for the table
  const sentCampaigns = campaigns.filter(
    (c) => c.status === "sent" && (c.total_recipients || c.sent_count || 0) > 0
  );
  const sortedCampaigns = [...sentCampaigns].sort((a, b) => {
    let aVal: number | string;
    let bVal: number | string;
    const aDenom = a.total_recipients || a.sent_count || 1;
    const bDenom = b.total_recipients || b.sent_count || 1;
    if (sortField === "name") {
      aVal = (a.name || a.subject || "").toLowerCase();
      bVal = (b.name || b.subject || "").toLowerCase();
    } else if (sortField === "open_rate") {
      aVal = aDenom > 0 ? (a.open_count / aDenom) * 100 : 0;
      bVal = bDenom > 0 ? (b.open_count / bDenom) * 100 : 0;
    } else if (sortField === "click_rate") {
      aVal = aDenom > 0 ? (a.click_count / aDenom) * 100 : 0;
      bVal = bDenom > 0 ? (b.click_count / bDenom) * 100 : 0;
    } else {
      aVal = (a[sortField] as number) || 0;
      bVal = (b[sortField] as number) || 0;
    }
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  // Prepare chart data
  const dailyStats = data?.daily_stats || [];
  const maxSent = Math.max(...dailyStats.map((d) => d.sent), 1);
  const maxOpens = Math.max(...dailyStats.map((d) => d.opens), 1);
  const maxNewSubs = Math.max(
    ...dailyStats.map((d) => d.new_subscribers),
    1
  );

  // SVG line chart points for open/click rate trend
  const chartWidth = 600;
  const chartHeight = 150;
  const padding = 20;

  function buildLinePoints(
    values: number[],
    maxVal: number
  ): string {
    if (values.length === 0) return "";
    const effectiveMax = maxVal || 1;
    return values
      .map((v, i) => {
        const x =
          padding +
          (i / Math.max(values.length - 1, 1)) *
            (chartWidth - padding * 2);
        const y =
          chartHeight -
          padding -
          (v / effectiveMax) * (chartHeight - padding * 2);
        return `${x},${y}`;
      })
      .join(" ");
  }

  // Calculate daily open/click rates
  const dailyOpenRates = dailyStats.map((d) =>
    d.sent > 0 ? (d.opens / d.sent) * 100 : 0
  );
  const dailyClickRates = dailyStats.map((d) =>
    d.sent > 0 ? (d.clicks / d.sent) * 100 : 0
  );
  const maxRate = Math.max(...dailyOpenRates, ...dailyClickRates, 1);

  const openRatePoints = buildLinePoints(dailyOpenRates, maxRate);
  const clickRatePoints = buildLinePoints(dailyClickRates, maxRate);

  // For circle positions
  function getPointCoords(values: number[], maxVal: number) {
    const effectiveMax = maxVal || 1;
    return values.map((v, i) => ({
      x:
        padding +
        (i / Math.max(values.length - 1, 1)) *
          (chartWidth - padding * 2),
      y:
        chartHeight -
        padding -
        (v / effectiveMax) * (chartHeight - padding * 2),
      value: v,
    }));
  }

  const openPoints = getPointCoords(dailyOpenRates, maxRate);
  const clickPoints = getPointCoords(dailyClickRates, maxRate);

  // Display interval for x-axis labels (show every Nth label)
  const labelInterval =
    dailyStats.length > 14
      ? Math.ceil(dailyStats.length / 7)
      : dailyStats.length > 7
        ? 2
        : 1;

  return (
    <div>
      <TopBar
        title="Email Marketing"
        subtitle="Quản lý campaigns, subscribers & analytics"
      />
      <EmailNav />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header with period selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              Analytics Dashboard
            </h2>
            <p className="text-sm text-[#9ca3af] mt-0.5">
              Thống kê tổng quan hiệu suất email marketing
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-[#9ca3af]" />
            <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #2a2a2a" }}>
              {periods.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    period === p.value
                      ? "bg-[#D4A843] text-black"
                      : "bg-[#1a1a1a] text-[#9ca3af] hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              onClick={fetchData}
              className="p-1.5 rounded-lg text-[#9ca3af] hover:text-white transition-colors"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-[#D4A843]" />
            <span className="ml-2 text-[#9ca3af]">Đang tải dữ liệu...</span>
          </div>
        ) : data ? (
          <>
            {/* Overview stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                {
                  label: "Email đã gửi",
                  value: data.summary.total_sent.toLocaleString("vi-VN"),
                  icon: Send,
                  color: "#3b82f6",
                  sub: `${data.campaign_count} campaigns`,
                },
                {
                  label: "Tỷ lệ mở",
                  value: `${data.rates.avg_open_rate}%`,
                  icon: Eye,
                  color: "#D4A843",
                  sub: `${data.summary.total_opens.toLocaleString("vi-VN")} lượt mở`,
                },
                {
                  label: "Tỷ lệ click",
                  value: `${data.rates.avg_click_rate}%`,
                  icon: MousePointer,
                  color: "#8b5cf6",
                  sub: `${data.summary.total_clicks.toLocaleString("vi-VN")} lượt click`,
                },
                {
                  label: "Tỷ lệ bounce",
                  value: `${data.rates.avg_bounce_rate}%`,
                  icon: AlertTriangle,
                  color: "#f59e0b",
                  sub: `${data.summary.total_bounces} bounces`,
                },
                {
                  label: "Huỷ đăng ký",
                  value: data.summary.total_unsubscribes.toLocaleString("vi-VN"),
                  icon: UserMinus,
                  color: "#ef4444",
                  sub: `${data.summary.total_complaints} complaints`,
                },
              ].map((s) => (
                <div key={s.label} className="stat-card">
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: s.color + "20" }}
                    >
                      <s.icon size={18} style={{ color: s.color }} />
                    </div>
                    <TrendingUp size={14} className="text-[#D4A843]" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-0.5">
                    {s.value}
                  </div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                  <div className="text-[11px] text-gray-400 mt-1">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Email Activity Bar Chart */}
              <div className="card-dark p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white text-sm">
                    Hoạt động gửi email
                  </h3>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1">
                      <span
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{ background: "#D4A843" }}
                      />
                      <span className="text-[#9ca3af]">Đã gửi</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{ background: "rgba(212,168,67,0.3)" }}
                      />
                      <span className="text-[#9ca3af]">Đã mở</span>
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <div className="flex items-end gap-[2px] h-40">
                    {dailyStats.map((d, i) => {
                      const sentHeight =
                        maxSent > 0 ? (d.sent / maxSent) * 100 : 0;
                      const openHeight =
                        maxSent > 0 ? (d.opens / maxSent) * 100 : 0;
                      return (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center justify-end relative cursor-pointer"
                          style={{ height: "100%" }}
                          onMouseEnter={() => setHoveredBar(i)}
                          onMouseLeave={() => setHoveredBar(null)}
                        >
                          {hoveredBar === i && (
                            <div
                              className="absolute -top-12 left-1/2 -translate-x-1/2 px-2 py-1.5 rounded-lg text-[10px] whitespace-nowrap z-10"
                              style={{
                                background: "#2a2a2a",
                                border: "1px solid #333",
                              }}
                            >
                              <div className="text-white font-medium">
                                {formatDate(d.date)}
                              </div>
                              <div className="text-[#D4A843]">
                                Gửi: {d.sent}
                              </div>
                              <div className="text-[#9ca3af]">
                                Mở: {d.opens}
                              </div>
                            </div>
                          )}
                          <div className="w-full relative">
                            <div
                              className="w-full rounded-t-sm transition-all"
                              style={{
                                height: `${Math.max(sentHeight * 1.6, d.sent > 0 ? 2 : 0)}px`,
                                background: "#D4A843",
                                opacity: hoveredBar === i ? 1 : 0.8,
                              }}
                            />
                            <div
                              className="w-full absolute bottom-0 rounded-t-sm"
                              style={{
                                height: `${Math.max(openHeight * 1.6, d.opens > 0 ? 2 : 0)}px`,
                                background: "rgba(212,168,67,0.3)",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* X-axis labels */}
                  <div className="flex gap-[2px] mt-1">
                    {dailyStats.map((d, i) => (
                      <div
                        key={i}
                        className="flex-1 text-center"
                      >
                        {i % labelInterval === 0 && (
                          <span className="text-[9px] text-gray-500">
                            {formatShortDate(d.date)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Open & Click Rate Trend (SVG) */}
              <div className="card-dark p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white text-sm">
                    Xu hướng Open & Click Rate
                  </h3>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: "#D4A843" }}
                      />
                      <span className="text-[#9ca3af]">Open rate</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: "#3b82f6" }}
                      />
                      <span className="text-[#9ca3af]">Click rate</span>
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full h-40"
                    preserveAspectRatio="none"
                  >
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                      <line
                        key={ratio}
                        x1={padding}
                        y1={
                          chartHeight -
                          padding -
                          ratio * (chartHeight - padding * 2)
                        }
                        x2={chartWidth - padding}
                        y2={
                          chartHeight -
                          padding -
                          ratio * (chartHeight - padding * 2)
                        }
                        stroke="#2a2a2a"
                        strokeWidth="1"
                      />
                    ))}
                    {/* Open rate line */}
                    {openRatePoints.length > 0 && (
                      <polyline
                        fill="none"
                        stroke="#D4A843"
                        strokeWidth="2"
                        points={openRatePoints}
                        strokeLinejoin="round"
                      />
                    )}
                    {/* Click rate line */}
                    {clickRatePoints.length > 0 && (
                      <polyline
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        points={clickRatePoints}
                        strokeLinejoin="round"
                      />
                    )}
                    {/* Open rate dots */}
                    {openPoints.map((p, i) => (
                      <circle
                        key={`o-${i}`}
                        cx={p.x}
                        cy={p.y}
                        r={hoveredPoint === i ? 5 : 3}
                        fill="#D4A843"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredPoint(i)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    ))}
                    {/* Click rate dots */}
                    {clickPoints.map((p, i) => (
                      <circle
                        key={`c-${i}`}
                        cx={p.x}
                        cy={p.y}
                        r={hoveredPoint === i ? 5 : 3}
                        fill="#3b82f6"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredPoint(i)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    ))}
                  </svg>
                  {/* Hover tooltip */}
                  {hoveredPoint !== null && dailyStats[hoveredPoint] && (
                    <div
                      className="absolute top-0 px-2 py-1.5 rounded-lg text-[10px] z-10 pointer-events-none"
                      style={{
                        background: "#2a2a2a",
                        border: "1px solid #333",
                        left: `${(hoveredPoint / Math.max(dailyStats.length - 1, 1)) * 100}%`,
                        transform: "translateX(-50%)",
                      }}
                    >
                      <div className="text-white font-medium">
                        {formatDate(dailyStats[hoveredPoint].date)}
                      </div>
                      <div className="text-[#D4A843]">
                        Open: {dailyOpenRates[hoveredPoint]?.toFixed(1)}%
                      </div>
                      <div className="text-[#3b82f6]">
                        Click: {dailyClickRates[hoveredPoint]?.toFixed(1)}%
                      </div>
                    </div>
                  )}
                  {/* X-axis labels */}
                  <div className="flex justify-between mt-1 px-5">
                    {dailyStats
                      .filter((_, i) => i % labelInterval === 0)
                      .map((d) => (
                        <span
                          key={d.date}
                          className="text-[9px] text-gray-500"
                        >
                          {formatShortDate(d.date)}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Campaign Performance Table */}
            <div className="card-dark overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
                <h3 className="font-semibold text-white text-sm">
                  Hiệu suất Campaign
                </h3>
                <span className="text-xs text-[#9ca3af]">
                  {sortedCampaigns.length} campaigns đã gửi
                </span>
              </div>
              {sortedCampaigns.length === 0 ? (
                <div className="p-8 text-center text-[#9ca3af] text-sm">
                  Chưa có campaign nào đã gửi trong khoảng thời gian này.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                        {[
                          { key: "name" as SortField, label: "Campaign" },
                          { key: "sent_count" as SortField, label: "Đã gửi" },
                          { key: "open_count" as SortField, label: "Mở" },
                          { key: "click_count" as SortField, label: "Click" },
                          { key: "open_rate" as SortField, label: "Open %" },
                          { key: "click_rate" as SortField, label: "Click %" },
                        ].map((col) => (
                          <th
                            key={col.key}
                            className={`text-xs text-gray-500 font-medium px-4 py-3 cursor-pointer hover:text-white transition-colors ${
                              col.key === "name" ? "text-left" : "text-right"
                            }`}
                            onClick={() => handleSort(col.key)}
                          >
                            <span className="inline-flex items-center gap-1">
                              {col.label}
                              {sortField === col.key && (
                                <span className="text-[#D4A843]">
                                  {sortDir === "asc" ? "↑" : "↓"}
                                </span>
                              )}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCampaigns.map((c, i) => {
                        const denom = c.total_recipients || c.sent_count || 1;
                        const openRate =
                          denom > 0
                            ? Math.round(
                                (c.open_count / denom) * 10000
                              ) / 100
                            : 0;
                        const clickRate =
                          denom > 0
                            ? Math.round(
                                (c.click_count / denom) * 10000
                              ) / 100
                            : 0;
                        return (
                          <tr
                            key={c.id}
                            className="hover:bg-[#1f1f1f] transition-colors"
                            style={{
                              borderBottom:
                                i < sortedCampaigns.length - 1
                                  ? "1px solid #2a2a2a"
                                  : "none",
                            }}
                          >
                            <td className="px-4 py-3">
                              <div className="text-white text-sm font-medium truncate max-w-[200px]">
                                {c.name || c.subject}
                              </div>
                              <div className="text-[11px] text-gray-500 truncate max-w-[200px]">
                                {c.subject}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-300">
                              {c.sent_count.toLocaleString("vi-VN")}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-300">
                              {c.open_count.toLocaleString("vi-VN")}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-300">
                              {c.click_count.toLocaleString("vi-VN")}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span
                                className="font-medium"
                                style={{
                                  color: rateColor(openRate, "open"),
                                }}
                              >
                                {openRate}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span
                                className="font-medium"
                                style={{
                                  color: rateColor(clickRate, "click"),
                                }}
                              >
                                {clickRate}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bottom row: Subscriber Growth + Top Campaigns + Bounce Summary */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Subscriber Growth */}
              <div className="card-dark p-5">
                <div className="flex items-center gap-2 mb-4">
                  <UserPlus size={16} className="text-[#D4A843]" />
                  <h3 className="font-semibold text-white text-sm">
                    Subscribers mới
                  </h3>
                </div>
                <div className="flex items-end gap-[2px] h-28">
                  {dailyStats.map((d, i) => {
                    const height =
                      maxNewSubs > 0
                        ? (d.new_subscribers / maxNewSubs) * 100
                        : 0;
                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center justify-end"
                        style={{ height: "100%" }}
                        title={`${formatDate(d.date)}: ${d.new_subscribers} subscribers mới`}
                      >
                        <div
                          className="w-full rounded-t-sm transition-all hover:opacity-100 opacity-80"
                          style={{
                            height: `${Math.max(height * 1.12, d.new_subscribers > 0 ? 2 : 0)}px`,
                            background: "#D4A843",
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2">
                  {dailyStats.length > 0 && (
                    <>
                      <span className="text-[9px] text-gray-500">
                        {formatShortDate(dailyStats[0].date)}
                      </span>
                      <span className="text-[9px] text-gray-500">
                        {formatShortDate(
                          dailyStats[dailyStats.length - 1].date
                        )}
                      </span>
                    </>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#9ca3af]">Tổng mới</span>
                    <span className="text-white font-medium">
                      {dailyStats
                        .reduce((sum, d) => sum + d.new_subscribers, 0)
                        .toLocaleString("vi-VN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Top Performing Campaigns */}
              <div className="card-dark p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy size={16} className="text-[#f59e0b]" />
                  <h3 className="font-semibold text-white text-sm">
                    Top Campaigns
                  </h3>
                </div>
                {data.top_campaigns.length === 0 ? (
                  <p className="text-[#9ca3af] text-xs text-center py-4">
                    Chưa có dữ liệu
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.top_campaigns.map((c, i) => (
                      <div
                        key={c.id}
                        className="p-2.5 rounded-lg"
                        style={{ background: "#222" }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0"
                                style={{
                                  background:
                                    i === 0
                                      ? "rgba(245,158,11,0.2)"
                                      : "rgba(107,114,128,0.2)",
                                  color:
                                    i === 0 ? "#f59e0b" : "#9ca3af",
                                }}
                              >
                                {i + 1}
                              </span>
                              <span className="text-white text-xs font-medium truncate">
                                {c.name || c.subject}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500 truncate mt-0.5 ml-6">
                              {c.subject}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div
                              className="text-xs font-bold"
                              style={{
                                color: rateColor(c.open_rate, "open"),
                              }}
                            >
                              {c.open_rate}%
                            </div>
                            <div className="text-[10px] text-[#9ca3af]">
                              open rate
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-3 mt-1.5 ml-6 text-[10px] text-[#9ca3af]">
                          <span>
                            Gửi: {c.sent_count.toLocaleString("vi-VN")}
                          </span>
                          <span>Click: {c.click_rate}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bounce & Complaint Summary */}
              <div className="card-dark p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldAlert size={16} className="text-[#ef4444]" />
                  <h3 className="font-semibold text-white text-sm">
                    Bounce & Complaints
                  </h3>
                </div>

                <div className="space-y-3 mb-4">
                  <div
                    className="flex items-center justify-between p-2.5 rounded-lg"
                    style={{ background: "#222" }}
                  >
                    <div>
                      <div className="text-xs text-white font-medium">
                        Hard Bounces
                      </div>
                      <div className="text-[10px] text-[#9ca3af]">
                        Email không tồn tại
                      </div>
                    </div>
                    <span className="text-sm font-bold text-[#ef4444]">
                      {data.bounce_breakdown.hard_bounces}
                    </span>
                  </div>
                  <div
                    className="flex items-center justify-between p-2.5 rounded-lg"
                    style={{ background: "#222" }}
                  >
                    <div>
                      <div className="text-xs text-white font-medium">
                        Soft Bounces
                      </div>
                      <div className="text-[10px] text-[#9ca3af]">
                        Hộp thư đầy / tạm thời
                      </div>
                    </div>
                    <span className="text-sm font-bold text-[#f59e0b]">
                      {data.bounce_breakdown.soft_bounces}
                    </span>
                  </div>
                  <div
                    className="flex items-center justify-between p-2.5 rounded-lg"
                    style={{ background: "#222" }}
                  >
                    <div>
                      <div className="text-xs text-white font-medium">
                        Complaints
                      </div>
                      <div className="text-[10px] text-[#9ca3af]">
                        Báo spam
                      </div>
                    </div>
                    <span className="text-sm font-bold text-[#ef4444]">
                      {data.summary.total_complaints}
                    </span>
                  </div>
                </div>

                {/* Recent problem emails */}
                {data.recent_bounces.length > 0 && (
                  <div>
                    <div className="text-[11px] text-gray-500 font-medium mb-2">
                      Email bounce gần đây
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {data.recent_bounces.slice(0, 5).map((b, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-[11px]"
                        >
                          <span className="text-gray-300 truncate max-w-[140px]">
                            {b.email}
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{
                              background:
                                b.bounce_type === "Permanent"
                                  ? "rgba(239,68,68,0.1)"
                                  : "rgba(245,158,11,0.1)",
                              color:
                                b.bounce_type === "Permanent"
                                  ? "#ef4444"
                                  : "#f59e0b",
                            }}
                          >
                            {b.bounce_type === "Permanent"
                              ? "Hard"
                              : "Soft"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <AlertTriangle size={24} className="text-[#f59e0b] mx-auto mb-2" />
            <p className="text-[#9ca3af] text-sm">
              Không thể tải dữ liệu analytics. Vui lòng thử lại.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
