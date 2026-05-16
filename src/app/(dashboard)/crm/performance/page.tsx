import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import TopBar from "@/components/layout/TopBar";
import {
  Trophy,
  TrendingUp,
  Users,
  Target,
  DollarSign,
  BarChart2,
  Clock,
  CheckCircle,
} from "lucide-react";

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

function formatVND(amount: number): string {
  return amount.toLocaleString("vi-VN") + "đ";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/* ─── Types ──────────────────────────────────────────────────────────────────── */

interface RepPerformance {
  rep_id: string;
  rep_name: string;
  rep_avatar: string | null;
  total_contacts: number;
  converted_contacts: number;
  pending_contacts: number;
  total_deals: number;
  won_deals: number;
  lost_deals: number;
  active_deals: number;
  total_revenue: number;
  pipeline_value: number;
  conversion_rate: number;
  activities_30d: number;
  pending_actions: number;
}

/* ─── Deal Stages ────────────────────────────────────────────────────────────── */

const DEAL_STAGES = [
  { key: "lead", label: "Lead", color: "#3b82f6" },
  { key: "contacted", label: "Liên hệ", color: "#8b5cf6" },
  { key: "demo", label: "Demo", color: "#a855f7" },
  { key: "proposal", label: "Báo giá", color: "#ec4899" },
  { key: "negotiation", label: "Đàm phán", color: "#f97316" },
  { key: "won", label: "Thắng", color: "#22c55e" },
  { key: "lost", label: "Mất", color: "#ef4444" },
];

/* ─── Page ───────────────────────────────────────────────────────────────────── */

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  /* Auth + role guard */
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!["admin", "manager"].includes(profile?.role ?? "")) redirect("/dashboard");

  /* Query params for date filtering */
  const params = await searchParams;
  const fromDate = params.from ?? null;
  const toDate = params.to ?? null;

  /* Fetch performance data */
  const admin = await createAdminClient();

  let query = admin.from("crm_sales_performance").select("*");

  // The view may support date filtering via RPC or we just fetch all
  // If from/to provided, we can pass them to a function or filter client-side
  const { data: performanceData } = await query.order("total_revenue", {
    ascending: false,
  });

  const reps = (performanceData ?? []) as RepPerformance[];

  /* Also fetch deal stage distribution per rep */
  const { data: dealStageData } = await admin
    .from("crm_deals")
    .select("assigned_to, stage")
    .not("assigned_to", "is", null);

  const repDealStages = new Map<string, Record<string, number>>();
  for (const deal of dealStageData ?? []) {
    const repId = deal.assigned_to as string;
    if (!repDealStages.has(repId)) {
      repDealStages.set(repId, {});
    }
    const stages = repDealStages.get(repId)!;
    stages[deal.stage] = (stages[deal.stage] ?? 0) + 1;
  }

  /* Compute summary stats */
  const totalRevenue = reps.reduce((sum, r) => sum + r.total_revenue, 0);
  const avgConversion =
    reps.length > 0
      ? reps.reduce((sum, r) => sum + r.conversion_rate, 0) / reps.length
      : 0;
  const totalActiveDeals = reps.reduce((sum, r) => sum + r.active_deals, 0);
  const totalPendingActions = reps.reduce((sum, r) => sum + r.pending_actions, 0);

  /* Summary stat cards config */
  const summaryStats = [
    {
      label: "Tổng doanh thu",
      value: formatVND(totalRevenue),
      icon: DollarSign,
      color: "#D4A843",
    },
    {
      label: "Tỷ lệ chuyển đổi TB",
      value: `${avgConversion.toFixed(1)}%`,
      icon: Target,
      color: "#22c55e",
    },
    {
      label: "Deals đang hoạt động",
      value: String(totalActiveDeals),
      icon: BarChart2,
      color: "#3b82f6",
    },
    {
      label: "Cần xử lý",
      value: String(totalPendingActions),
      icon: Clock,
      color: "#f59e0b",
    },
  ];

  return (
    <div>
      <TopBar
        title="Sales Performance"
        subtitle="Hiệu suất đội ngũ bán hàng"
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header + Date Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              Bảng xếp hạng Sales
            </h2>
            <p className="text-gray-400 text-sm">
              Theo dõi và đánh giá hiệu suất từng thành viên
            </p>
          </div>

          {/* Time Filter */}
          <form className="flex items-center gap-2">
            <input
              type="date"
              name="from"
              defaultValue={fromDate ?? ""}
              className="input-dark px-3 py-1.5 rounded-lg text-xs"
              placeholder="Từ ngày"
            />
            <span className="text-gray-500 text-xs">→</span>
            <input
              type="date"
              name="to"
              defaultValue={toDate ?? ""}
              className="input-dark px-3 py-1.5 rounded-lg text-xs"
              placeholder="Đến ngày"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
              style={{
                background: "rgba(212,168,67,0.15)",
                border: "1px solid rgba(212,168,67,0.3)",
              }}
            >
              Lọc
            </button>
          </form>
        </div>

        {/* Summary Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryStats.map((stat, idx) => (
            <div key={idx} className="card-dark p-4 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: stat.color + "15" }}
              >
                <stat.icon size={18} style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-lg font-bold text-white">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Sales Leaderboard Table */}
        <div className="card-dark overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-[#D4A843]" />
              <h3 className="font-semibold text-white">Bảng xếp hạng</h3>
            </div>
            <span className="text-xs text-gray-500">
              {reps.length} thành viên
            </span>
          </div>

          {reps.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2a2a2a]">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sales Rep
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contacts
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deals
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                      Conversion
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pipeline
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Activities
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pending
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a2a]">
                  {reps.map((rep, idx) => {
                    const rank = idx + 1;
                    const isTop = rank === 1;
                    return (
                      <tr
                        key={rep.rep_id}
                        className="hover:bg-[#111111] transition-colors"
                      >
                        {/* Rank */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center">
                            {isTop ? (
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center"
                                style={{
                                  background: "rgba(212,168,67,0.15)",
                                }}
                              >
                                <Trophy
                                  size={14}
                                  className="text-[#D4A843]"
                                />
                              </div>
                            ) : (
                              <span className="text-gray-400 font-semibold text-sm">
                                {rank}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Sales Rep */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {rep.rep_avatar ? (
                              <img
                                src={rep.rep_avatar}
                                alt={rep.rep_name}
                                className={`w-8 h-8 rounded-full object-cover ring-2 ${isTop ? "ring-[#D4A843]/40" : "ring-transparent"}`}
                              />
                            ) : (
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                style={{
                                  background: isTop
                                    ? "linear-gradient(135deg, #D4A843, #b8922e)"
                                    : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                                }}
                              >
                                {getInitials(rep.rep_name)}
                              </div>
                            )}
                            <div>
                              <p
                                className="font-medium text-white text-sm"
                                style={{
                                  color: isTop ? "#D4A843" : undefined,
                                }}
                              >
                                {rep.rep_name}
                              </p>
                              {isTop && (
                                <p className="text-[10px] text-[#D4A843] opacity-70">
                                  Top performer
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contacts */}
                        <td className="px-4 py-3 text-center">
                          <span className="text-white font-medium">
                            {rep.total_contacts}
                          </span>
                        </td>

                        {/* Deals (won/total) */}
                        <td className="px-4 py-3 text-center">
                          <span className="text-[#22c55e] font-semibold">
                            {rep.won_deals}
                          </span>
                          <span className="text-gray-500">
                            /{rep.total_deals}
                          </span>
                        </td>

                        {/* Revenue */}
                        <td className="px-4 py-3 text-right">
                          <span className="text-white font-semibold">
                            {formatVND(rep.total_revenue)}
                          </span>
                        </td>

                        {/* Conversion Rate with Progress Bar */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full overflow-hidden bg-[#1a1a1a]">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(rep.conversion_rate, 100)}%`,
                                  background:
                                    rep.conversion_rate >= 50
                                      ? "#22c55e"
                                      : rep.conversion_rate >= 25
                                        ? "#f59e0b"
                                        : "#ef4444",
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-400 w-10 text-right">
                              {rep.conversion_rate.toFixed(0)}%
                            </span>
                          </div>
                        </td>

                        {/* Pipeline Value */}
                        <td className="px-4 py-3 text-right">
                          <span className="text-gray-300 text-sm">
                            {formatVND(rep.pipeline_value)}
                          </span>
                        </td>

                        {/* Activities (30d) */}
                        <td className="px-4 py-3 text-center">
                          <span className="text-gray-300">
                            {rep.activities_30d}
                          </span>
                        </td>

                        {/* Pending Actions */}
                        <td className="px-4 py-3 text-center">
                          {rep.pending_actions > 0 ? (
                            <span
                              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                              style={{
                                background: "rgba(245,158,11,0.1)",
                                color: "#f59e0b",
                              }}
                            >
                              {rep.pending_actions}
                            </span>
                          ) : (
                            <CheckCircle
                              size={14}
                              className="text-[#22c55e] mx-auto"
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-600">
              <Users size={32} className="mb-3 opacity-50" />
              <p className="text-sm">Chưa có dữ liệu hiệu suất</p>
              <p className="text-xs text-gray-700 mt-1">
                Dữ liệu sẽ xuất hiện khi có hoạt động bán hàng
              </p>
            </div>
          )}
        </div>

        {/* Individual Rep Cards */}
        {reps.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-[#D4A843]" />
              <h3 className="font-semibold text-white">
                Chi tiết từng thành viên
              </h3>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reps.map((rep, idx) => {
                const stages = repDealStages.get(rep.rep_id) ?? {};
                const maxStageCount = Math.max(
                  ...DEAL_STAGES.map((s) => stages[s.key] ?? 0),
                  1
                );

                return (
                  <div key={rep.rep_id} className="card-dark p-5 space-y-4">
                    {/* Rep Header */}
                    <div className="flex items-center gap-3">
                      {rep.rep_avatar ? (
                        <img
                          src={rep.rep_avatar}
                          alt={rep.rep_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                          style={{
                            background:
                              idx === 0
                                ? "linear-gradient(135deg, #D4A843, #b8922e)"
                                : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                          }}
                        >
                          {getInitials(rep.rep_name)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">
                          {rep.rep_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {rep.activities_30d} hoạt động (30 ngày)
                        </p>
                      </div>
                      {idx === 0 && (
                        <Trophy size={16} className="text-[#D4A843] shrink-0" />
                      )}
                    </div>

                    {/* Deal Stages Mini Bar Chart */}
                    <div>
                      <p className="text-[11px] text-gray-500 mb-2 uppercase tracking-wider">
                        Phân bố deals theo giai đoạn
                      </p>
                      <div className="flex items-end gap-1 h-16">
                        {DEAL_STAGES.map((stage) => {
                          const count = stages[stage.key] ?? 0;
                          const heightPct =
                            maxStageCount > 0
                              ? (count / maxStageCount) * 100
                              : 0;
                          return (
                            <div
                              key={stage.key}
                              className="flex-1 flex flex-col items-center gap-0.5"
                            >
                              <span className="text-[9px] text-gray-500">
                                {count > 0 ? count : ""}
                              </span>
                              <div
                                className="w-full rounded-t transition-all"
                                style={{
                                  height: `${Math.max(heightPct, 4)}%`,
                                  background: stage.color,
                                  opacity: count > 0 ? 1 : 0.2,
                                  minHeight: "2px",
                                }}
                                title={`${stage.label}: ${count}`}
                              />
                              <span className="text-[8px] text-gray-600 truncate w-full text-center">
                                {stage.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Conversion Funnel */}
                    <div>
                      <p className="text-[11px] text-gray-500 mb-2 uppercase tracking-wider">
                        Conversion Funnel
                      </p>
                      <div className="space-y-1.5">
                        {/* Contacts */}
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: "100%",
                              background: "rgba(59,130,246,0.3)",
                            }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: "100%",
                                background: "#3b82f6",
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap w-20 text-right">
                            {rep.total_contacts} contacts
                          </span>
                        </div>

                        {/* Converted (qualified) */}
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: "100%",
                              background: "rgba(168,85,247,0.15)",
                            }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${rep.total_contacts > 0 ? (rep.converted_contacts / rep.total_contacts) * 100 : 0}%`,
                                background: "#a855f7",
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap w-20 text-right">
                            {rep.converted_contacts} qualified
                          </span>
                        </div>

                        {/* Won */}
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: "100%",
                              background: "rgba(34,197,94,0.15)",
                            }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${rep.total_contacts > 0 ? (rep.won_deals / rep.total_contacts) * 100 : 0}%`,
                                background: "#22c55e",
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap w-20 text-right">
                            {rep.won_deals} won
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-[#2a2a2a]">
                      <div className="text-center">
                        <p className="text-sm font-bold text-[#D4A843]">
                          {formatVND(rep.total_revenue)}
                        </p>
                        <p className="text-[10px] text-gray-500">Revenue</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-white">
                          {rep.conversion_rate.toFixed(0)}%
                        </p>
                        <p className="text-[10px] text-gray-500">CVR</p>
                      </div>
                      <div className="text-center">
                        {rep.pending_actions > 0 ? (
                          <p className="text-sm font-bold text-[#f59e0b]">
                            {rep.pending_actions}
                          </p>
                        ) : (
                          <CheckCircle
                            size={14}
                            className="text-[#22c55e] mx-auto"
                          />
                        )}
                        <p className="text-[10px] text-gray-500">Pending</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
