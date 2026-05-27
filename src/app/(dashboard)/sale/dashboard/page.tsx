/**
 * /sale/dashboard — personal performance dashboard for a sales rep.
 *
 * Server component. Pulls all KPIs in parallel via the helpers in
 * `@/lib/sale-kpi` (Agent O) — this page never queries Supabase directly
 * except for the small activity-log summary card at the bottom.
 *
 * Auth model:
 *   - Sale role          → saleId = scope.userId, sees only own data.
 *   - Admin / manager    → saleId = scope.userId, sees their OWN KPI
 *     (admins use /admin/sales-dashboard for team view + drill-down).
 *   - Anyone else        → redirect to /dashboard.
 */
import { redirect } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import { getViewerScope } from "@/lib/viewer-scope";
import { createAdminClient } from "@/lib/supabase/server";
import {
  getSaleKPI,
  getActionQueue,
  getFunnel,
  getStrategyTips,
  getDailyRevenue,
  type ActionQueueItem,
  type StrategyTip,
} from "@/lib/sale-kpi";
import ActionQueue from "./ActionQueue";
import FunnelViz from "./FunnelViz";
import RevenueTrend from "./RevenueTrend";
import Link from "next/link";
import {
  TrendingUp,
  CheckCircle,
  ListTodo,
  Target,
  Users,
  Repeat,
  ShoppingBag,
  Percent,
  Lightbulb,
  ArrowRight,
  Phone,
  Mail,
  FileText,
  StickyNote,
  Calendar,
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

function greeting(): string {
  // Vietnam wall-clock hour
  const vnHr = new Date(Date.now() + 7 * 3600 * 1000).getUTCHours();
  if (vnHr < 11) return "Chào buổi sáng";
  if (vnHr < 14) return "Chào buổi trưa";
  if (vnHr < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
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

// ─── Tip card ───────────────────────────────────────────────────────

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

// ─── KPI Card ───────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  caption?: React.ReactNode;
  progress?: number | null; // 0-100
}

function KpiCard({ icon, iconBg, label, value, caption, progress }: KpiCardProps) {
  return (
    <div className="stat-card">
      <div className="mb-3 flex items-center justify-between">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: iconBg }}
        >
          {icon}
        </div>
      </div>
      <div className="text-xl font-bold text-white sm:text-2xl">{value}</div>
      <div className="mt-0.5 text-xs text-gray-500">{label}</div>
      {progress !== undefined && progress !== null ? (
        <div className="mt-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1f1f1f]">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.max(0, Math.min(100, progress))}%`,
                background:
                  progress >= 80
                    ? "#22c55e"
                    : progress >= 40
                      ? "#D4A843"
                      : "#ef4444",
              }}
            />
          </div>
        </div>
      ) : null}
      {caption ? (
        <div className="mt-1.5 text-[11px] text-gray-400">{caption}</div>
      ) : null}
    </div>
  );
}

// ─── Activity log summary (inline server fragment) ──────────────────

type ActivityCounts = {
  today: number;
  week: number;
  byType: Array<{ type: string; count: number }>;
};

async function fetchActivitySummary(userId: string): Promise<ActivityCounts> {
  const supabase = await createAdminClient();

  // VN day boundaries
  const VN_OFFSET = 7 * 3600 * 1000;
  const vn = new Date(Date.now() + VN_OFFSET);
  const y = vn.getUTCFullYear();
  const m = vn.getUTCMonth();
  const d = vn.getUTCDate();
  const todayStartUtc = new Date(Date.UTC(y, m, d, 0, 0, 0) - VN_OFFSET);
  // Monday-anchored week
  const dow = vn.getUTCDay();
  const offToMon = (dow + 6) % 7;
  const weekStartUtc = new Date(
    Date.UTC(y, m, d - offToMon, 0, 0, 0) - VN_OFFSET
  );

  const { data } = await supabase
    .from("crm_activities")
    .select("type, created_at")
    .eq("created_by", userId)
    .gte("created_at", weekStartUtc.toISOString())
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = (data ?? []) as Array<{ type: string | null; created_at: string }>;
  const todayMs = todayStartUtc.getTime();

  let today = 0;
  const week = rows.length;
  const typeMap = new Map<string, number>();
  for (const row of rows) {
    if (new Date(row.created_at).getTime() >= todayMs) today += 1;
    const t = row.type || "other";
    typeMap.set(t, (typeMap.get(t) ?? 0) + 1);
  }
  const byType = Array.from(typeMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
  return { today, week, byType };
}

function ActivitySummary({ data }: { data: ActivityCounts }) {
  const typeLabel: Record<string, { label: string; icon: React.ReactNode }> = {
    call: { label: "Cuộc gọi", icon: <Phone size={11} /> },
    email: { label: "Email", icon: <Mail size={11} /> },
    note: { label: "Ghi chú", icon: <StickyNote size={11} /> },
    meeting: { label: "Cuộc hẹn", icon: <Calendar size={11} /> },
    assignment: { label: "Phân công", icon: <Users size={11} /> },
    journey_change: { label: "Đổi stage", icon: <TrendingUp size={11} /> },
    other: { label: "Khác", icon: <FileText size={11} /> },
  };

  return (
    <details className="card-dark p-4 [&[open]>summary>svg]:rotate-180">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm text-gray-300 hover:text-white">
        <div className="flex items-center gap-3">
          <FileText size={14} className="text-gray-400" />
          <span>
            Hoạt động:{" "}
            <span className="font-semibold text-white">{data.today}</span> hôm nay
            • <span className="font-semibold text-white">{data.week}</span> tuần này
          </span>
        </div>
        <ArrowRight size={14} className="rotate-90 transition-transform text-gray-500" />
      </summary>
      {data.byType.length === 0 ? (
        <p className="mt-3 text-xs text-gray-500">
          Chưa có hoạt động nào trong tuần này.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {data.byType.map(({ type, count }) => {
            const cfg = typeLabel[type] ?? typeLabel.other;
            return (
              <span
                key={type}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#2a2a2a] bg-[#141414] px-2.5 py-1 text-[11px] text-gray-300"
              >
                <span className="text-gray-400">{cfg.icon}</span>
                {cfg.label}: <span className="font-semibold text-white">{count}</span>
              </span>
            );
          })}
        </div>
      )}
    </details>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

export default async function SaleDashboardPage() {
  const scope = await getViewerScope();
  if (!scope.canView || !scope.userId) {
    redirect("/dashboard");
  }

  const saleId = scope.userId;

  // Fetch everything in parallel. Helpers internally use admin client and
  // scope by saleId — no further filtering required here.
  const [
    todayKpi,
    mtdKpi,
    actionQueue,
    funnel,
    tips,
    daily,
    activitySummary,
  ] = await Promise.all([
    getSaleKPI({ saleId, period: "today" }),
    getSaleKPI({ saleId, period: "mtd" }),
    getActionQueue({ saleId, limit: 80 }),
    getFunnel({ saleId }),
    getStrategyTips({ saleId }),
    getDailyRevenue({ saleId, days: 14 }),
    fetchActivitySummary(saleId),
  ]);

  // Bucket the action queue by kind for the client tabs.
  const overdue: ActionQueueItem[] = [];
  const todayActions: ActionQueueItem[] = [];
  const pendingChase: ActionQueueItem[] = [];
  const newLeads: ActionQueueItem[] = [];
  for (const a of actionQueue) {
    if (a.kind === "overdue_followup") overdue.push(a);
    else if (a.kind === "today_followup") todayActions.push(a);
    else if (a.kind === "pending_order_chase") pendingChase.push(a);
    else if (a.kind === "new_lead") newLeads.push(a);
  }

  const fullName = mtdKpi.full_name || todayKpi.full_name || "bạn";

  // MTD delta vs previous month
  const mtdDelta = deltaBadge(mtdKpi.revenue, mtdKpi.prev_period_revenue);
  const ordersDelta = deltaBadge(mtdKpi.orders_paid, 0); // prev count not exposed

  // Hero numbers
  const todayRevenueLabel = todayKpi.revenue > 0 ? formatVnd(todayKpi.revenue) : "0đ";
  // Caption preference: when a daily target exists, render "X / Y hôm nay (Z%)";
  // otherwise fall back to the legacy "Chưa đặt target / 0% target tháng" text.
  const hasDailyTarget =
    todayKpi.daily_revenue_target !== null && todayKpi.daily_revenue_target > 0;
  const totalActions = actionQueue.length;
  const overdueCount = overdue.length;

  return (
    <div>
      <TopBar
        title="Bảng điều khiển bán hàng"
        subtitle="Doanh số, khách cần chăm, và gợi ý hành động"
      />

      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        {/* ═══════════ HERO ═══════════ */}
        <div className="card-dark overflow-hidden">
          <div
            className="p-5 sm:p-6"
            style={{
              background:
                "linear-gradient(135deg, rgba(212,168,67,0.10) 0%, rgba(212,168,67,0.02) 60%, transparent 100%)",
            }}
          >
            <p className="text-base text-gray-300 sm:text-lg">
              <span aria-hidden>👋 </span>
              {greeting()},{" "}
              <span className="font-semibold text-white">{fullName}</span>
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Đây là bức tranh toàn cảnh hôm nay của bạn.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#2a2a2a] bg-[#141414] p-4">
                <div className="text-xs text-gray-400">Doanh số hôm nay</div>
                <div className="mt-1 text-2xl font-bold text-[#D4A843]">
                  {todayRevenueLabel}
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  {hasDailyTarget ? (
                    <>
                      {formatVnd(todayKpi.revenue)} /{" "}
                      {formatVnd(todayKpi.daily_revenue_target as number)} hôm
                      nay{" "}
                      <span className="font-semibold text-[#D4A843]">
                        ({(todayKpi.daily_pct ?? 0).toFixed(0)}%)
                      </span>
                    </>
                  ) : todayKpi.revenue_pct !== null ? (
                    `${todayKpi.revenue_pct.toFixed(0)}% target tháng`
                  ) : (
                    "Chưa đặt target"
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-[#2a2a2a] bg-[#141414] p-4">
                <div className="text-xs text-gray-400">Đơn paid hôm nay</div>
                <div className="mt-1 text-2xl font-bold text-white">
                  {todayKpi.orders_paid}
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  AOV {formatVndCompact(todayKpi.avg_order_value)}đ
                </div>
              </div>

              <div className="rounded-xl border border-[#2a2a2a] bg-[#141414] p-4">
                <div className="text-xs text-gray-400">Việc cần làm</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">
                    {totalActions}
                  </span>
                  {overdueCount > 0 ? (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-red-400">
                      <span aria-hidden>🔥</span>
                      {overdueCount} quá hạn
                    </span>
                  ) : null}
                </div>
                <Link
                  href="#queue"
                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#D4A843] hover:text-[#e8bd55]"
                >
                  Xem hàng đợi
                  <ArrowRight size={10} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ KPI STRIP (MTD) ═══════════ */}
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-gray-300">
              Hiệu suất tháng này
            </h2>
            <span className="text-xs text-gray-500">
              Period: MTD
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              icon={<TrendingUp size={17} className="text-[#D4A843]" />}
              iconBg="rgba(212,168,67,0.12)"
              label="Doanh số tháng"
              value={formatVndCompact(mtdKpi.revenue) + "đ"}
              progress={mtdKpi.revenue_pct}
              caption={
                <>
                  {mtdKpi.revenue_target ? (
                    <>
                      Target {formatVndCompact(mtdKpi.revenue_target)}đ
                      {" • "}
                    </>
                  ) : (
                    "Chưa có target"
                  )}
                  {mtdDelta ? (
                    <span
                      className={
                        mtdDelta.positive ? "text-green-400" : "text-red-400"
                      }
                    >
                      {mtdDelta.label} vs tháng trước
                    </span>
                  ) : null}
                </>
              }
            />

            <KpiCard
              icon={<CheckCircle size={17} className="text-[#22c55e]" />}
              iconBg="rgba(34,197,94,0.12)"
              label="Đơn paid tháng"
              value={mtdKpi.orders_paid.toString()}
              caption={
                <>
                  {mtdKpi.orders_pending} pending
                  {mtdKpi.pending_value > 0 ? (
                    <> • {formatVndCompact(mtdKpi.pending_value)}đ chờ</>
                  ) : null}
                  {ordersDelta && mtdKpi.prev_period_revenue > 0 ? null : null}
                </>
              }
            />

            <KpiCard
              icon={<Percent size={17} className="text-[#a855f7]" />}
              iconBg="rgba(168,85,247,0.12)"
              label="Tỉ lệ convert"
              value={`${mtdKpi.conversion_rate.toFixed(1)}%`}
              caption={
                <>Lead → đã liên hệ trở lên</>
              }
            />

            <KpiCard
              icon={<Users size={17} className="text-[#3b82f6]" />}
              iconBg="rgba(59,130,246,0.12)"
              label="Khách quản lý"
              value={mtdKpi.contacts_total.toString()}
              caption={
                <>
                  +{mtdKpi.contacts_new_this_period} khách mới tháng này
                </>
              }
            />

            <KpiCard
              icon={<ShoppingBag size={17} className="text-[#D4A843]" />}
              iconBg="rgba(212,168,67,0.12)"
              label="AOV"
              value={formatVndCompact(mtdKpi.avg_order_value) + "đ"}
              caption={<>Trung bình mỗi đơn paid</>}
            />

            <KpiCard
              icon={<Repeat size={17} className="text-[#f59e0b]" />}
              iconBg="rgba(245,158,11,0.12)"
              label="Retention"
              value={`${mtdKpi.retention_rate.toFixed(1)}%`}
              caption={<>Khách quay lại mua &ge;2 lần</>}
            />
          </div>
        </div>

        {/* ═══════════ ACTION QUEUE + FUNNEL + TIPS ═══════════ */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ActionQueue
              overdue={overdue}
              today={todayActions}
              pending={pendingChase}
              newLeads={newLeads}
            />
          </div>

          <div className="flex flex-col gap-4">
            <FunnelViz data={funnel} />

            <div className="card-dark p-5">
              <div className="mb-3 flex items-center gap-2">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{ background: "rgba(212,168,67,0.14)" }}
                >
                  <Lightbulb size={14} className="text-[#D4A843]" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  Gợi ý chiến lược
                </h3>
              </div>
              {tips.length === 0 ? (
                <p className="text-xs text-gray-500">
                  Bạn đang đi đúng hướng — không có gợi ý đặc biệt nào lúc này.
                </p>
              ) : (
                <div className="space-y-2">
                  {tips.map((tip) => (
                    <TipCard key={tip.id} tip={tip} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════ REVENUE TREND ═══════════ */}
        <RevenueTrend data={daily} />

        {/* ═══════════ ACTIVITY LOG SUMMARY ═══════════ */}
        <ActivitySummary data={activitySummary} />

        {/* Quick links footer */}
        <div className="flex flex-wrap items-center gap-3 pb-6 text-xs text-gray-500">
          <Link
            href="/crm/contacts"
            className="inline-flex items-center gap-1 hover:text-white"
          >
            <ListTodo size={12} />
            Danh sách khách
          </Link>
          <span className="text-gray-700">•</span>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1 hover:text-white"
          >
            <ShoppingBag size={12} />
            Đơn hàng của tôi
          </Link>
          <span className="text-gray-700">•</span>
          <Link
            href="/crm/pipeline"
            className="inline-flex items-center gap-1 hover:text-white"
          >
            <Target size={12} />
            Pipeline
          </Link>
        </div>
      </div>
    </div>
  );
}
