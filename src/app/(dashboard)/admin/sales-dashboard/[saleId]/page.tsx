/**
 * /admin/sales-dashboard/[saleId] — admin drill-down into one sale rep's
 * personal performance. Server component, admin/manager only.
 *
 * Reuses Agent P's presentational components (FunnelViz, ActionQueue,
 * RevenueTrend) from /sale/dashboard but is a separate page so that:
 *   - Auth gating is different (admin/manager only — sale role can't view
 *     other reps' dashboards).
 *   - The header is admin-flavored ("Xem hồ sơ Sale: …" + back link).
 *   - We don't depend on Agent P's page exporting an internal renderer.
 *
 * All data is fetched in parallel via the same sale-kpi helpers, but with
 * `saleId` set to the URL param instead of `scope.userId`.
 */
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
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
import ActionQueue from "@/app/(dashboard)/sale/dashboard/ActionQueue";
import FunnelViz from "@/app/(dashboard)/sale/dashboard/FunnelViz";
import RevenueTrend from "@/app/(dashboard)/sale/dashboard/RevenueTrend";
import {
  TrendingUp,
  CheckCircle,
  Target,
  Users,
  Repeat,
  ShoppingBag,
  Percent,
  Lightbulb,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

export const dynamic = "force-dynamic";

function formatVndCompact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
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

interface KpiCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  caption?: React.ReactNode;
  progress?: number | null;
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

export default async function AdminSaleDrillDownPage({
  params,
}: {
  params: Promise<{ saleId: string }>;
}) {
  const scope = await getViewerScope();
  if (!scope.canView) redirect("/dashboard");
  if (scope.role !== "admin" && scope.role !== "manager") {
    redirect("/sale/dashboard");
  }

  const { saleId } = await params;

  // Verify saleId is a real sale-role profile
  const admin = await createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, role, avatar_url, email")
    .eq("id", saleId)
    .maybeSingle();

  if (!profile || profile.role !== "sale") {
    notFound();
  }

  // Parallel fetch — same surface as /sale/dashboard
  const [todayKpi, mtdKpi, actionQueue, funnel, tips, daily] = await Promise.all([
    getSaleKPI({ saleId, period: "today" }),
    getSaleKPI({ saleId, period: "mtd" }),
    getActionQueue({ saleId, limit: 80 }),
    getFunnel({ saleId }),
    getStrategyTips({ saleId }),
    getDailyRevenue({ saleId, days: 30 }),
  ]);

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

  const fullName = profile.full_name || "Sale";
  const mtdDelta = deltaBadge(mtdKpi.revenue, mtdKpi.prev_period_revenue);

  return (
    <div>
      <TopBar
        title={`Hồ sơ sale: ${fullName}`}
        subtitle="Bảng điều khiển bán hàng — xem theo từng sale rep"
      />

      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        {/* ═══════════ HEADER ROW ═══════════ */}
        <div className="card-dark p-5 sm:p-6">
          <Link
            href="/admin/sales-dashboard"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#D4A843] hover:text-[#e8bd55]"
          >
            <ArrowLeft size={12} />
            Quay lại tổng quan
          </Link>
          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-white">
                <span aria-hidden>👤 </span>
                Xem hồ sơ Sale:{" "}
                <span className="text-[#D4A843]">{fullName}</span>
              </p>
              {profile.email ? (
                <p className="mt-0.5 text-xs text-gray-500">{profile.email}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Link
                href={`/admin/users?q=${encodeURIComponent(fullName)}`}
                className="rounded-md border border-[#2a2a2a] bg-[#141414] px-2.5 py-1 text-gray-300 hover:border-[#D4A843]/40 hover:text-white"
              >
                Tài khoản
              </Link>
              <Link
                href={`/crm/contacts?assigned_to=${saleId}`}
                className="rounded-md border border-[#2a2a2a] bg-[#141414] px-2.5 py-1 text-gray-300 hover:border-[#D4A843]/40 hover:text-white"
              >
                Khách hàng phụ trách
              </Link>
              <Link
                href={`/admin/orders?assigned_to=${saleId}`}
                className="rounded-md border border-[#2a2a2a] bg-[#141414] px-2.5 py-1 text-gray-300 hover:border-[#D4A843]/40 hover:text-white"
              >
                Đơn hàng
              </Link>
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
              Hôm nay: {formatVndCompact(todayKpi.revenue)}đ • {todayKpi.orders_paid} đơn
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
                    "Chưa có target "
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
                </>
              }
            />

            <KpiCard
              icon={<Percent size={17} className="text-[#a855f7]" />}
              iconBg="rgba(168,85,247,0.12)"
              label="Tỉ lệ convert"
              value={`${mtdKpi.conversion_rate.toFixed(1)}%`}
              caption={<>Lead → đã liên hệ trở lên</>}
            />

            <KpiCard
              icon={<Users size={17} className="text-[#3b82f6]" />}
              iconBg="rgba(59,130,246,0.12)"
              label="Khách quản lý"
              value={mtdKpi.contacts_total.toString()}
              caption={
                <>+{mtdKpi.contacts_new_this_period} khách mới tháng này</>
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
                  Gợi ý cho {fullName}
                </h3>
              </div>
              {tips.length === 0 ? (
                <p className="text-xs text-gray-500">
                  Đang đi đúng hướng — không có gợi ý đặc biệt.
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

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-3 pb-6 text-xs text-gray-500">
          <Link
            href="/admin/sales-dashboard"
            className="inline-flex items-center gap-1 hover:text-white"
          >
            <ArrowLeft size={12} />
            Tổng quan đội
          </Link>
          <span className="text-gray-700">•</span>
          <Link
            href={`/admin/users?q=${encodeURIComponent(fullName)}`}
            className="inline-flex items-center gap-1 hover:text-white"
          >
            <Target size={12} />
            Đặt target cho {fullName}
          </Link>
        </div>
      </div>
    </div>
  );
}
