/**
 * /admin/sales-dashboard — team-wide sales performance overview for admin
 * and manager roles. Server component.
 *
 * Auth: admin or manager only — sale role is bounced to /sale/dashboard,
 * everyone else to /dashboard.
 *
 * Data is fetched in parallel via the helpers in `@/lib/sale-kpi`:
 *   - team-wide KPI (saleId: null, period: 'mtd')   → Hero
 *   - leaderboard (period: 'mtd')                   → Team ranking
 *   - funnel (saleId: null)                         → All contacts by stage
 *   - daily revenue (saleId: null, days: 30)        → Trend chart
 *   - strategy tips (saleId: null)                  → Admin coaching alerts
 *
 * Additionally pulls the list of sale reps + their current-month targets
 * to render the SetTargetForm at the bottom.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import TopBar from "@/components/layout/TopBar";
import FunnelViz from "@/app/(dashboard)/sale/dashboard/FunnelViz";
import { getViewerScope } from "@/lib/viewer-scope";
import { createAdminClient } from "@/lib/supabase/server";
import {
  getSaleKPI,
  getTeamLeaderboard,
  getFunnel,
  getStrategyTips,
  getDailyRevenue,
  type StrategyTip,
} from "@/lib/sale-kpi";
import Leaderboard from "./Leaderboard";
import TrendChart from "./TrendChart";
import SetTargetForm from "./SetTargetForm";
import {
  TrendingUp,
  Lightbulb,
  ArrowRight,
  Trophy,
} from "lucide-react";

export const dynamic = "force-dynamic";

// ─── Formatting helpers ─────────────────────────────────────────────

function formatVnd(n: number): string {
  return n.toLocaleString("vi-VN") + "đ";
}

function formatVndCompact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function vnMonthLabel(): string {
  const vn = new Date(Date.now() + 7 * 3600 * 1000);
  const month = vn.getUTCMonth() + 1;
  const year = vn.getUTCFullYear();
  return `${month}/${year}`;
}

function currentMonthKey(): string {
  const vn = new Date(Date.now() + 7 * 3600 * 1000);
  const y = vn.getUTCFullYear();
  const m = vn.getUTCMonth();
  const mm = String(m + 1).padStart(2, "0");
  return `${y}-${mm}-01`;
}

function deltaBadge(current: number, prev: number) {
  if (prev <= 0) {
    if (current > 0) return { label: "+mới", positive: true };
    return null;
  }
  const diffPct = Math.round(((current - prev) / prev) * 100);
  if (diffPct === 0) return null;
  return {
    label: `${diffPct > 0 ? "+" : ""}${diffPct}%`,
    positive: diffPct > 0,
  };
}

// ─── Tip card (mirrors /sale/dashboard's TipCard, colors aligned) ───

function TipCard({ tip }: { tip: StrategyTip }) {
  const palette = {
    info: {
      border: "rgba(59,130,246,0.35)",
      bg: "rgba(59,130,246,0.08)",
      icon: "#60a5fa",
      title: "#93c5fd",
    },
    warning: {
      border: "rgba(245,158,11,0.4)",
      bg: "rgba(245,158,11,0.08)",
      icon: "#f59e0b",
      title: "#fcd34d",
    },
    critical: {
      border: "rgba(239,68,68,0.45)",
      bg: "rgba(239,68,68,0.08)",
      icon: "#ef4444",
      title: "#fca5a5",
    },
  }[tip.severity];

  return (
    <div
      className="rounded-lg border p-3"
      style={{ borderColor: palette.border, backgroundColor: palette.bg }}
    >
      <div className="flex items-start gap-2">
        <Lightbulb size={14} style={{ color: palette.icon }} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" style={{ color: palette.title }}>
            {tip.title}
          </p>
          <p className="mt-0.5 text-xs text-gray-300">{tip.detail}</p>
          {tip.cta_label && tip.cta_href ? (
            <Link
              href={tip.cta_href}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#D4A843] hover:text-[#e8bd55]"
            >
              {tip.cta_label}
              <ArrowRight size={11} />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

export default async function AdminSalesDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ target_saved?: string; target_error?: string }>;
}) {
  const scope = await getViewerScope();
  if (!scope.canView) redirect("/dashboard");
  if (scope.role !== "admin" && scope.role !== "manager") {
    // sale → personal dashboard
    redirect("/sale/dashboard");
  }

  const sp = await searchParams;
  const savedFlag = sp.target_saved === "1";
  const errorCode = sp.target_error || null;

  const month = currentMonthKey();
  const admin = await createAdminClient();

  // Parallel data fetch
  const [teamKpi, leaderboard, funnel, tips, daily, salesProfilesRes, targetsRes] =
    await Promise.all([
      getSaleKPI({ saleId: null, period: "mtd" }),
      getTeamLeaderboard({ period: "mtd" }),
      getFunnel({ saleId: null }),
      getStrategyTips({ saleId: null }),
      getDailyRevenue({ saleId: null, days: 30 }),
      admin
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("role", "sale")
        .order("full_name", { ascending: true }),
      admin
        .from("sale_targets")
        .select("sale_user_id, revenue_target, orders_target")
        .eq("month", month),
    ]);

  const salesProfiles =
    (salesProfilesRes.data ?? []) as Array<{
      id: string;
      full_name: string | null;
      avatar_url: string | null;
    }>;

  const targetMap = new Map<
    string,
    { revenue_target: number; orders_target: number }
  >();
  for (const t of (targetsRes.data ?? []) as Array<{
    sale_user_id: string;
    revenue_target: number | null;
    orders_target: number | null;
  }>) {
    targetMap.set(t.sale_user_id, {
      revenue_target: Number(t.revenue_target ?? 0),
      orders_target: Number(t.orders_target ?? 0),
    });
  }

  const avatarMap = new Map<string, string | null>();
  for (const p of salesProfiles) avatarMap.set(p.id, p.avatar_url);

  const targetRows = salesProfiles.map((p) => {
    const t = targetMap.get(p.id);
    return {
      sale_user_id: p.id,
      full_name: p.full_name,
      current_revenue_target: t?.revenue_target ?? null,
      current_orders_target: t?.orders_target ?? null,
    };
  });

  // Hero numbers
  const teamRevenue = teamKpi.revenue;
  const teamTarget = teamKpi.revenue_target ?? 0;
  const teamPct =
    teamTarget > 0 ? Math.round((teamRevenue / teamTarget) * 1000) / 10 : null;
  const teamDelta = deltaBadge(teamKpi.revenue, teamKpi.prev_period_revenue);
  const topSale = leaderboard[0] && leaderboard[0].revenue > 0 ? leaderboard[0] : null;

  // Alerts grouped by severity
  const critical = tips.filter((t) => t.severity === "critical");
  const warning = tips.filter((t) => t.severity === "warning");
  const info = tips.filter((t) => t.severity === "info");

  return (
    <div>
      <TopBar
        title="Tổng quan đội Sale"
        subtitle="Doanh số toàn đội, bảng xếp hạng, và gợi ý cho quản lý"
      />

      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        {/* ═══════════ HERO ═══════════ */}
        <div className="card-dark overflow-hidden">
          <div
            className="p-5 sm:p-6"
            style={{
              background:
                "linear-gradient(135deg, rgba(212,168,67,0.12) 0%, rgba(212,168,67,0.02) 60%, transparent 100%)",
            }}
          >
            <p className="text-base text-gray-300 sm:text-lg">
              <span aria-hidden>📈 </span>
              <span className="font-semibold text-white">Doanh số tháng {vnMonthLabel()}</span>
            </p>

            <div className="mt-3 flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-bold text-[#D4A843] sm:text-4xl">
                {formatVnd(teamRevenue)}
              </span>
              {teamTarget > 0 ? (
                <span className="text-sm text-gray-400">
                  / {formatVnd(teamTarget)}
                </span>
              ) : (
                <span className="text-sm text-gray-500">(chưa đặt target tổng)</span>
              )}
              {teamPct !== null ? (
                <span
                  className={
                    teamPct >= 80
                      ? "text-sm font-semibold text-green-400"
                      : teamPct >= 40
                        ? "text-sm font-semibold text-yellow-400"
                        : "text-sm font-semibold text-red-400"
                  }
                >
                  {teamPct.toFixed(1)}%
                </span>
              ) : null}
            </div>

            {teamTarget > 0 ? (
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#1f1f1f]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(0, Math.min(100, teamPct ?? 0))}%`,
                    background:
                      (teamPct ?? 0) >= 80
                        ? "#22c55e"
                        : (teamPct ?? 0) >= 40
                          ? "#D4A843"
                          : "#ef4444",
                  }}
                />
              </div>
            ) : null}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#2a2a2a] bg-[#141414] p-4">
                <div className="text-xs text-gray-400">vs tháng trước</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-bold text-white">
                    {formatVndCompact(teamKpi.prev_period_revenue)}đ
                  </span>
                  {teamDelta ? (
                    <span
                      className={
                        teamDelta.positive
                          ? "text-sm font-semibold text-green-400"
                          : "text-sm font-semibold text-red-400"
                      }
                    >
                      {teamDelta.label}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">—</span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-[#2a2a2a] bg-[#141414] p-4">
                <div className="text-xs text-gray-400">Đơn paid tháng</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-bold text-white">
                    {teamKpi.orders_paid}
                  </span>
                  <span className="text-xs text-gray-500">
                    AOV {formatVndCompact(teamKpi.avg_order_value)}đ
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-[#2a2a2a] bg-[#141414] p-4">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Trophy size={11} className="text-[#D4A843]" /> Top sale
                </div>
                {topSale ? (
                  <Link
                    href={`/admin/sales-dashboard/${topSale.sale_user_id}`}
                    className="mt-1 flex items-baseline gap-2 hover:text-[#D4A843]"
                  >
                    <span className="truncate text-base font-semibold text-white">
                      {topSale.full_name || "(Chưa có tên)"}
                    </span>
                    <span className="text-sm font-semibold text-[#D4A843]">
                      {formatVndCompact(topSale.revenue)}đ
                    </span>
                  </Link>
                ) : (
                  <p className="mt-1 text-sm text-gray-500">Chưa có doanh số tháng này</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ LEADERBOARD ═══════════ */}
        <Leaderboard rows={leaderboard} avatars={avatarMap} />

        {/* ═══════════ FUNNEL + TREND ═══════════ */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <FunnelViz data={funnel} />
          </div>
          <div className="lg:col-span-2">
            <TrendChart data={daily} />
          </div>
        </div>

        {/* ═══════════ ALERTS / TIPS ═══════════ */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: "rgba(212,168,67,0.14)" }}
            >
              <Lightbulb size={14} className="text-[#D4A843]" />
            </div>
            <h2 className="text-base font-semibold text-white">
              Gợi ý chiến lược cho quản lý
            </h2>
          </div>

          {tips.length === 0 ? (
            <div className="card-dark p-5 text-sm text-gray-500">
              Đội đang đi đúng hướng — chưa có cảnh báo nào.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
                  Quan trọng ({critical.length})
                </p>
                {critical.length === 0 ? (
                  <p className="text-xs text-gray-600">Không có cảnh báo nghiêm trọng.</p>
                ) : (
                  critical.map((t) => <TipCard key={t.id} tip={t} />)
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-yellow-400">
                  Cảnh báo ({warning.length})
                </p>
                {warning.length === 0 ? (
                  <p className="text-xs text-gray-600">Không có cảnh báo.</p>
                ) : (
                  warning.map((t) => <TipCard key={t.id} tip={t} />)
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                  Thông tin ({info.length})
                </p>
                {info.length === 0 ? (
                  <p className="text-xs text-gray-600">Không có gợi ý.</p>
                ) : (
                  info.map((t) => <TipCard key={t.id} tip={t} />)
                )}
              </div>
            </div>
          )}
        </div>

        {/* ═══════════ SET TARGETS ═══════════ */}
        <SetTargetForm
          rows={targetRows}
          month={month}
          saved={savedFlag}
          errorCode={errorCode}
        />

        {/* Quick links footer */}
        <div className="flex flex-wrap items-center gap-3 pb-6 text-xs text-gray-500">
          <Link
            href="/admin/users?role=sale"
            className="inline-flex items-center gap-1 hover:text-white"
          >
            <TrendingUp size={12} />
            Quản lý sale rep
          </Link>
          <span className="text-gray-700">•</span>
          <Link
            href="/crm/assignments"
            className="inline-flex items-center gap-1 hover:text-white"
          >
            Phân công lead
          </Link>
          <span className="text-gray-700">•</span>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1 hover:text-white"
          >
            Tất cả đơn hàng
          </Link>
        </div>
      </div>
    </div>
  );
}
