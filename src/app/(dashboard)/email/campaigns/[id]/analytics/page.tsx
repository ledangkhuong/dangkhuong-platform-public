"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import EmailNav from "@/components/email/EmailNav";
import {
  ArrowLeft,
  Send,
  CheckCircle,
  Eye,
  MousePointer,
  AlertTriangle,
  ShieldAlert,
  UserMinus,
  ExternalLink,
  RefreshCw,
  Loader2,
  Download,
  Link2,
} from "lucide-react";

interface CampaignAnalytics {
  overview: {
    sent: number;
    delivered: number;
    opens: number;
    unique_opens: number;
    clicks: number;
    unique_clicks: number;
    bounces: number;
    complaints: number;
    unsubscribes: number;
  };
  rates: {
    open_rate: number;
    click_rate: number;
    bounce_rate: number;
    complaint_rate: number;
  };
  timeline: { date: string; opens: number; clicks: number }[];
  top_links: { url: string; clicks: number }[];
  engagement_breakdown: Record<string, number>;
}

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  sent_count: number;
  sent_at: string;
  created_at: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function rateColor(rate: number, type: "open" | "click" | "bounce") {
  if (type === "bounce") {
    if (rate <= 2) return "#22c55e";
    if (rate <= 5) return "#f59e0b";
    return "#ef4444";
  }
  if (type === "open") {
    if (rate >= 20) return "#22c55e";
    if (rate >= 10) return "#f59e0b";
    return "#ef4444";
  }
  if (rate >= 3) return "#22c55e";
  if (rate >= 1) return "#f59e0b";
  return "#ef4444";
}

export default function CampaignAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [data, setData] = useState<CampaignAnalytics | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredTimelinePoint, setHoveredTimelinePoint] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, campaignRes] = await Promise.all([
        fetch(`/api/email/campaigns/${campaignId}/analytics`),
        fetch(`/api/email/campaigns/${campaignId}`),
      ]);
      if (analyticsRes.ok) {
        setData(await analyticsRes.json());
      }
      if (campaignRes.ok) {
        const json = await campaignRes.json();
        setCampaign(json.campaign || json);
      }
    } catch (err) {
      console.error("Failed to fetch campaign analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // SVG chart setup
  const chartWidth = 600;
  const chartHeight = 150;
  const padding = 20;

  const timeline = data?.timeline || [];
  const maxTimelineVal = Math.max(
    ...timeline.map((t) => Math.max(t.opens, t.clicks)),
    1
  );

  function buildLinePoints(values: number[], maxVal: number): string {
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

  const openValues = timeline.map((t) => t.opens);
  const clickValues = timeline.map((t) => t.clicks);
  const openLinePoints = buildLinePoints(openValues, maxTimelineVal);
  const clickLinePoints = buildLinePoints(clickValues, maxTimelineVal);
  const openCoords = getPointCoords(openValues, maxTimelineVal);
  const clickCoords = getPointCoords(clickValues, maxTimelineVal);

  // Export analytics as CSV
  function handleExport() {
    if (!data || !campaign) return;
    const rows = [
      ["Metric", "Value"],
      ["Campaign", campaign.name || campaign.subject],
      ["Sent", String(data.overview.sent)],
      ["Delivered", String(data.overview.delivered)],
      ["Opens (unique)", String(data.overview.unique_opens)],
      ["Clicks (unique)", String(data.overview.unique_clicks)],
      ["Bounces", String(data.overview.bounces)],
      ["Complaints", String(data.overview.complaints)],
      ["Open Rate", `${data.rates.open_rate}%`],
      ["Click Rate", `${data.rates.click_rate}%`],
      ["Bounce Rate", `${data.rates.bounce_rate}%`],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign-analytics-${campaignId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const campaignName = campaign?.name || campaign?.subject || "Campaign";

  return (
    <div>
      <TopBar
        title={campaignName}
        subtitle="Chi tiết analytics campaign"
      />
      <EmailNav />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Back button and actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/email/campaigns")}
            className="flex items-center gap-2 text-sm text-[#9ca3af] hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Quay lại Campaigns
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="p-1.5 rounded-lg text-[#9ca3af] hover:text-white transition-colors"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#9ca3af] hover:text-white transition-colors"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
            >
              <Download size={14} />
              Xuất CSV
            </button>
          </div>
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-[#22c55e]" />
            <span className="ml-2 text-[#9ca3af]">Đang tải dữ liệu...</span>
          </div>
        ) : data ? (
          <>
            {/* Campaign info bar */}
            {campaign && (
              <div
                className="card-dark p-4 flex flex-wrap items-center gap-4 text-xs text-[#9ca3af]"
              >
                <span>
                  <strong className="text-white">Tiêu đề:</strong>{" "}
                  {campaign.subject}
                </span>
                {campaign.sent_at && (
                  <span>
                    <strong className="text-white">Gửi lúc:</strong>{" "}
                    {formatDate(campaign.sent_at)}
                  </span>
                )}
                <span>
                  <strong className="text-white">Trạng thái:</strong>{" "}
                  <span className="text-[#22c55e] font-medium capitalize">
                    {campaign.status}
                  </span>
                </span>
              </div>
            )}

            {/* Large stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                {
                  label: "Đã gửi",
                  value: data.overview.sent,
                  icon: Send,
                  color: "#3b82f6",
                },
                {
                  label: "Delivered",
                  value: data.overview.delivered,
                  icon: CheckCircle,
                  color: "#22c55e",
                },
                {
                  label: "Opens",
                  value: data.overview.unique_opens,
                  icon: Eye,
                  color: "#f59e0b",
                  sub: `${data.overview.opens} tổng`,
                },
                {
                  label: "Clicks",
                  value: data.overview.unique_clicks,
                  icon: MousePointer,
                  color: "#8b5cf6",
                  sub: `${data.overview.clicks} tổng`,
                },
                {
                  label: "Bounces",
                  value: data.overview.bounces,
                  icon: AlertTriangle,
                  color: "#ef4444",
                },
                {
                  label: "Complaints",
                  value: data.overview.complaints,
                  icon: ShieldAlert,
                  color: "#ef4444",
                },
              ].map((s) => (
                <div key={s.label} className="stat-card text-center">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2"
                    style={{ background: s.color + "20" }}
                  >
                    <s.icon size={16} style={{ color: s.color }} />
                  </div>
                  <div className="text-xl font-bold text-white">
                    {s.value.toLocaleString("vi-VN")}
                  </div>
                  <div className="text-[11px] text-gray-500">{s.label}</div>
                  {"sub" in s && s.sub && (
                    <div className="text-[10px] text-gray-600 mt-0.5">
                      {s.sub}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Rate highlight */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Open Rate",
                  value: data.rates.open_rate,
                  type: "open" as const,
                },
                {
                  label: "Click Rate",
                  value: data.rates.click_rate,
                  type: "click" as const,
                },
                {
                  label: "Bounce Rate",
                  value: data.rates.bounce_rate,
                  type: "bounce" as const,
                },
                {
                  label: "Complaint Rate",
                  value: data.rates.complaint_rate,
                  type: "bounce" as const,
                },
              ].map((r) => (
                <div key={r.label} className="card-dark p-4 text-center">
                  <div
                    className="text-3xl font-bold mb-1"
                    style={{ color: rateColor(r.value, r.type) }}
                  >
                    {r.value}%
                  </div>
                  <div className="text-xs text-[#9ca3af]">{r.label}</div>
                </div>
              ))}
            </div>

            {/* Timeline chart + Top links */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Timeline */}
              <div className="card-dark p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white text-sm">
                    Opens & Clicks theo thời gian
                  </h3>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: "#22c55e" }}
                      />
                      <span className="text-[#9ca3af]">Opens</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: "#3b82f6" }}
                      />
                      <span className="text-[#9ca3af]">Clicks</span>
                    </span>
                  </div>
                </div>

                {timeline.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-[#9ca3af] text-xs">
                    Chưa có dữ liệu timeline
                  </div>
                ) : (
                  <div className="relative">
                    <svg
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                      className="w-full h-40"
                      preserveAspectRatio="none"
                    >
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
                      <polyline
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="2"
                        points={openLinePoints}
                        strokeLinejoin="round"
                      />
                      <polyline
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        points={clickLinePoints}
                        strokeLinejoin="round"
                      />
                      {openCoords.map((p, i) => (
                        <circle
                          key={`o-${i}`}
                          cx={p.x}
                          cy={p.y}
                          r={hoveredTimelinePoint === i ? 5 : 3}
                          fill="#22c55e"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredTimelinePoint(i)}
                          onMouseLeave={() => setHoveredTimelinePoint(null)}
                        />
                      ))}
                      {clickCoords.map((p, i) => (
                        <circle
                          key={`c-${i}`}
                          cx={p.x}
                          cy={p.y}
                          r={hoveredTimelinePoint === i ? 5 : 3}
                          fill="#3b82f6"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredTimelinePoint(i)}
                          onMouseLeave={() => setHoveredTimelinePoint(null)}
                        />
                      ))}
                    </svg>
                    {hoveredTimelinePoint !== null &&
                      timeline[hoveredTimelinePoint] && (
                        <div
                          className="absolute top-0 px-2 py-1.5 rounded-lg text-[10px] z-10 pointer-events-none"
                          style={{
                            background: "#2a2a2a",
                            border: "1px solid #333",
                            left: `${(hoveredTimelinePoint / Math.max(timeline.length - 1, 1)) * 100}%`,
                            transform: "translateX(-50%)",
                          }}
                        >
                          <div className="text-white font-medium">
                            {formatShortDate(
                              timeline[hoveredTimelinePoint].date
                            )}
                          </div>
                          <div className="text-[#22c55e]">
                            Opens: {timeline[hoveredTimelinePoint].opens}
                          </div>
                          <div className="text-[#3b82f6]">
                            Clicks: {timeline[hoveredTimelinePoint].clicks}
                          </div>
                        </div>
                      )}
                    <div className="flex justify-between mt-1 px-5">
                      {timeline.length > 0 && (
                        <>
                          <span className="text-[9px] text-gray-600">
                            {formatShortDate(timeline[0].date)}
                          </span>
                          <span className="text-[9px] text-gray-600">
                            {formatShortDate(
                              timeline[timeline.length - 1].date
                            )}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Top clicked links */}
              <div className="card-dark p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Link2 size={16} className="text-[#3b82f6]" />
                  <h3 className="font-semibold text-white text-sm">
                    Top Links được click
                  </h3>
                </div>
                {data.top_links.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-[#9ca3af] text-xs">
                    Chưa có link nào được click
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[240px] overflow-y-auto">
                    {data.top_links.map((link, i) => {
                      const maxClicks = data.top_links[0]?.clicks || 1;
                      const width = (link.clicks / maxClicks) * 100;
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs text-gray-300 truncate flex-1 flex items-center gap-1">
                              <ExternalLink
                                size={10}
                                className="text-[#3b82f6] shrink-0"
                              />
                              {link.url}
                            </span>
                            <span className="text-xs font-medium text-[#3b82f6] shrink-0">
                              {link.clicks}
                            </span>
                          </div>
                          <div
                            className="h-1.5 rounded-full"
                            style={{ background: "#222" }}
                          >
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${width}%`,
                                background: "#3b82f6",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Engagement breakdown */}
            {Object.keys(data.engagement_breakdown).length > 0 && (
              <div className="card-dark p-5">
                <h3 className="font-semibold text-white text-sm mb-4">
                  Trạng thái gửi email
                </h3>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(data.engagement_breakdown).map(
                    ([status, count]) => {
                      const colors: Record<string, string> = {
                        delivered: "#22c55e",
                        sent: "#3b82f6",
                        opened: "#f59e0b",
                        clicked: "#8b5cf6",
                        bounced: "#ef4444",
                        failed: "#ef4444",
                        pending: "#6b7280",
                      };
                      const color = colors[status] || "#6b7280";
                      return (
                        <div
                          key={status}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg"
                          style={{ background: "#222" }}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: color }}
                          />
                          <span className="text-xs text-gray-300 capitalize">
                            {status}
                          </span>
                          <span
                            className="text-xs font-bold"
                            style={{ color }}
                          >
                            {count}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <AlertTriangle
              size={24}
              className="text-[#f59e0b] mx-auto mb-2"
            />
            <p className="text-[#9ca3af] text-sm">
              Không thể tải analytics cho campaign này.
            </p>
            <button
              onClick={() => router.push("/email/campaigns")}
              className="mt-3 text-sm text-[#22c55e] hover:underline"
            >
              Quay lại danh sách campaigns
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
