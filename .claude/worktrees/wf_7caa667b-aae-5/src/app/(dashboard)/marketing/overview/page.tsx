export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import TopBar from "@/components/layout/TopBar";
import {
  Eye,
  UserPlus,
  Users,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  BarChart2,
  Globe,
  Filter,
  Clock,
  ChevronDown,
} from "lucide-react";

/* ---------- Types ---------- */

interface SourceContactRow {
  utm_source: string;
  count: number;
}

interface SourceRevenueRow {
  utm_source: string;
  revenue: number;
  orders: number;
}

interface RecentConversion {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  utm_source: string | null;
  converted_at: string | null;
  lifetime_value: number | null;
}

/* ---------- Helpers ---------- */

function formatVND(amount: number): string {
  if (!amount) return "0đ";
  return amount.toLocaleString("vi-VN") + "đ";
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function pct(n: number, d: number): string {
  if (d === 0) return "0%";
  return (n / d * 100).toFixed(1) + "%";
}

function dropOff(from: number, to: number): string {
  if (from === 0) return "0%";
  return ((1 - to / from) * 100).toFixed(1) + "%";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return `${Math.floor(days / 30)} tháng trước`;
}

const SOURCE_COLORS: Record<string, string> = {
  facebook: "#1877F2",
  google: "#EA4335",
  tiktok: "#010101",
  email: "#D4A843",
  organic: "#22c55e",
  ads: "#f59e0b",
  social: "#ec4899",
  referral: "#a855f7",
  zalo: "#0068FF",
  youtube: "#FF0000",
  direct: "#6b7280",
};

function getSourceColor(source: string): string {
  return SOURCE_COLORS[source.toLowerCase()] ?? "#6b7280";
}

/* ---------- Page ---------- */

export default async function MarketingOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;

  // ── Auth check ──────────────────────────────────────────────
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
    redirect("/dashboard");
  }

  // ── Date range ──────────────────────────────────────────────
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const defaultTo = now.toISOString().slice(0, 10);

  const fromDate = params.from || defaultFrom;
  const toDate = params.to || defaultTo;
  const toDateEnd = toDate + "T23:59:59";

  // ── Admin client for data queries ───────────────────────────
  const admin = await createAdminClient();

  // ── KPI Queries (parallel) ──────────────────────────────────
  const [
    visitorsRes,
    leadsRes,
    customersRes,
    totalContactsRes,
    paidOrdersRes,
    sourceContactsRes,
    sourceRevenueRes,
    recentConversionsRes,
  ] = await Promise.all([
    // 1. Total visitors (page_view events in date range)
    admin
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event", "page_view")
      .gte("created_at", fromDate)
      .lte("created_at", toDateEnd)
      .then((r) => ({ count: r.count ?? 0, error: r.error })),

    // 2. Total leads (contacts in lead/contacted/qualified/negotiation stages)
    admin
      .from("crm_contacts")
      .select("id", { count: "exact", head: true })
      .in("journey_stage", ["lead", "contacted", "qualified", "negotiation"])
      .gte("created_at", fromDate)
      .lte("created_at", toDateEnd)
      .then((r) => ({ count: r.count ?? 0, error: r.error })),

    // 3. Total customers (contacts with journey_stage = customer or advocate)
    admin
      .from("crm_contacts")
      .select("id", { count: "exact", head: true })
      .in("journey_stage", ["customer", "advocate"])
      .gte("created_at", fromDate)
      .lte("created_at", toDateEnd)
      .then((r) => ({ count: r.count ?? 0, error: r.error })),

    // 4. Total contacts in date range (for conversion rate)
    admin
      .from("crm_contacts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", fromDate)
      .lte("created_at", toDateEnd)
      .then((r) => ({ count: r.count ?? 0, error: r.error })),

    // 5. Paid orders (revenue + count)
    admin
      .from("orders")
      .select("amount, revenue_source", { count: "exact" })
      .eq("status", "paid")
      .gte("paid_at", fromDate)
      .lte("paid_at", toDateEnd)
      .or("revenue_source.is.null,revenue_source.eq.platform")
      .then((r) => ({
        data: r.data ?? [],
        count: r.count ?? 0,
        error: r.error,
      })),

    // 6. Top marketing channels by contact count
    admin
      .from("crm_contacts")
      .select("utm_source")
      .not("utm_source", "is", null)
      .gte("created_at", fromDate)
      .lte("created_at", toDateEnd)
      .then((r) => ({ data: r.data ?? [], error: r.error })),

    // 7. Revenue per channel (orders with utm_source)
    admin
      .from("orders")
      .select("utm_source, amount, revenue_source")
      .eq("status", "paid")
      .not("utm_source", "is", null)
      .gte("paid_at", fromDate)
      .lte("paid_at", toDateEnd)
      .then((r) => ({ data: r.data ?? [], error: r.error })),

    // 8. Recent conversions (latest contacts that became customers)
    admin
      .from("crm_contacts")
      .select("id, full_name, email, phone, utm_source, converted_at, lifetime_value")
      .in("journey_stage", ["customer", "advocate"])
      .not("converted_at", "is", null)
      .order("converted_at", { ascending: false })
      .limit(10)
      .then((r) => ({ data: r.data ?? [], error: r.error })),
  ]);

  // ── KPI Calculations ───────────────────────────────────────
  const totalVisitors = visitorsRes.count;
  const totalLeads = leadsRes.count;
  const totalCustomers = customersRes.count;
  const totalContacts = totalContactsRes.count;
  const conversionRate = totalContacts > 0
    ? ((totalCustomers / totalContacts) * 100).toFixed(1)
    : "0.0";

  // Revenue
  const totalRevenue = (paidOrdersRes.data as { amount: number | null }[]).reduce(
    (sum, o) => sum + (o.amount ?? 0),
    0,
  );
  const paidOrderCount = paidOrdersRes.count;
  const avgOrderValue = paidOrderCount > 0 ? Math.round(totalRevenue / paidOrderCount) : 0;

  // ── Section A: Top 5 marketing channels ─────────────────────
  const sourceContactMap = new Map<string, number>();
  for (const row of sourceContactsRes.data as { utm_source: string }[]) {
    const src = row.utm_source.toLowerCase();
    sourceContactMap.set(src, (sourceContactMap.get(src) ?? 0) + 1);
  }
  const topSources: SourceContactRow[] = Array.from(sourceContactMap.entries())
    .map(([utm_source, count]) => ({ utm_source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxSourceCount = topSources.length > 0 ? topSources[0].count : 1;

  // ── Section B: Revenue per channel ──────────────────────────
  const sourceRevMap = new Map<string, { revenue: number; orders: number }>();
  for (const row of sourceRevenueRes.data as {
    utm_source: string;
    amount: number | null;
    revenue_source?: string | null;
  }[]) {
    const src = (row.utm_source ?? "").toLowerCase();
    if (!src) continue;
    // Skip comp rows
    if (row.revenue_source === "comp") continue;
    if (!sourceRevMap.has(src)) {
      sourceRevMap.set(src, { revenue: 0, orders: 0 });
    }
    const entry = sourceRevMap.get(src)!;
    entry.revenue += row.amount ?? 0;
    entry.orders += 1;
  }
  const sourceRevenueRows: SourceRevenueRow[] = Array.from(sourceRevMap.entries())
    .map(([utm_source, data]) => ({ utm_source, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  const maxSourceRevenue = sourceRevenueRows.length > 0
    ? Math.max(...sourceRevenueRows.map((r) => r.revenue))
    : 1;

  // ── Section C: Conversion funnel ────────────────────────────
  const funnelSteps = [
    { label: "Khách truy cập", value: totalVisitors, color: "#6b7280" },
    { label: "Lead", value: totalLeads, color: "#3b82f6" },
    { label: "Khách hàng", value: totalCustomers, color: "#22c55e" },
  ];
  const maxFunnelValue = Math.max(...funnelSteps.map((s) => s.value), 1);

  // ── Section D: Recent conversions ───────────────────────────
  const recentConversions = (recentConversionsRes.data ?? []) as RecentConversion[];

  // ── KPI cards config ────────────────────────────────────────
  const kpiCards = [
    {
      label: "Lượt truy cập",
      value: formatNumber(totalVisitors),
      icon: Eye,
      color: "#3b82f6",
    },
    {
      label: "Lead mới",
      value: formatNumber(totalLeads),
      icon: UserPlus,
      color: "#f59e0b",
    },
    {
      label: "Khách hàng mới",
      value: formatNumber(totalCustomers),
      icon: Users,
      color: "#22c55e",
    },
    {
      label: "Tỉ lệ chuyển đổi",
      value: conversionRate + "%",
      icon: TrendingUp,
      color: "#a855f7",
    },
    {
      label: "Tổng doanh thu",
      value: formatVND(totalRevenue),
      icon: DollarSign,
      color: "#D4A843",
    },
    {
      label: "Giá trị đơn TB",
      value: formatVND(avgOrderValue),
      icon: ShoppingCart,
      color: "#ec4899",
    },
  ];

  return (
    <div>
      <TopBar
        title="Tổng Quan Marketing"
        subtitle="Báo cáo tổng hợp hiệu quả marketing, kênh & phân tích chuyển đổi"
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* ── Header + Date Filter ───────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart2 size={20} className="text-[#D4A843]" />
              Tổng Quan Marketing
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Dữ liệu từ {fromDate} đến {toDate}
            </p>
          </div>
          <form method="GET" className="flex items-center gap-2">
            <input
              type="date"
              name="from"
              defaultValue={fromDate}
              className="input-dark px-3 py-1.5 text-xs"
            />
            <span className="text-gray-500 text-xs">{"→"}</span>
            <input
              type="date"
              name="to"
              defaultValue={toDate}
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

        {/* ── KPI Cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpiCards.map((card, i) => (
            <div key={i} className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{card.label}</span>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: card.color + "18" }}
                >
                  <card.icon size={15} style={{ color: card.color }} />
                </div>
              </div>
              <div className="text-xl font-bold text-white">{card.value}</div>
            </div>
          ))}
        </div>

        {/* ── Two-column: Sources + Revenue ───────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section A: Top 5 kenh marketing */}
          <div className="card-dark p-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={16} className="text-[#D4A843]" />
              <h3 className="font-semibold text-white text-sm">
                Top 5 kênh marketing
              </h3>
              <span className="text-xs text-gray-500 ml-auto">
                {topSources.reduce((s, r) => s + r.count, 0)} contacts
              </span>
            </div>

            {topSources.length > 0 ? (
              <div className="space-y-3">
                {topSources.map((src) => (
                  <div key={src.utm_source} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm shrink-0"
                          style={{ background: getSourceColor(src.utm_source) }}
                        />
                        <span className="text-white font-medium capitalize">
                          {src.utm_source}
                        </span>
                      </div>
                      <span className="text-white font-semibold text-sm">
                        {src.count}
                      </span>
                    </div>
                    <div
                      className="h-2.5 rounded-full overflow-hidden"
                      style={{ background: "#1a1a1a" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(src.count / maxSourceCount) * 100}%`,
                          background: getSourceColor(src.utm_source),
                          minWidth: src.count > 0 ? "4px" : "0",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
                Chưa có dữ liệu UTM tracking trong giai đoạn này
              </div>
            )}
          </div>

          {/* Section B: Doanh thu theo kenh */}
          <div className="card-dark p-5">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={16} className="text-[#D4A843]" />
              <h3 className="font-semibold text-white text-sm">
                Doanh thu theo kênh
              </h3>
              <span className="text-xs text-gray-500 ml-auto">
                {sourceRevenueRows.reduce((s, r) => s + r.orders, 0)} đơn hàng
              </span>
            </div>

            {sourceRevenueRows.length > 0 ? (
              <div className="space-y-3">
                {sourceRevenueRows.map((src) => (
                  <div key={src.utm_source} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm shrink-0"
                          style={{ background: getSourceColor(src.utm_source) }}
                        />
                        <span className="text-white font-medium capitalize">
                          {src.utm_source}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({src.orders} đơn)
                        </span>
                      </div>
                      <span className="text-[#D4A843] font-semibold text-sm">
                        {formatVND(src.revenue)}
                      </span>
                    </div>
                    <div
                      className="h-2.5 rounded-full overflow-hidden"
                      style={{ background: "#1a1a1a" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(src.revenue / maxSourceRevenue) * 100}%`,
                          background: "#D4A843",
                          minWidth: src.revenue > 0 ? "4px" : "0",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
                Chưa có dữ liệu doanh thu theo kênh
              </div>
            )}
          </div>
        </div>

        {/* ── Section C: Pheu chuyen doi ─────────────────────── */}
        <div className="card-dark p-5">
          <div className="flex items-center gap-2 mb-6">
            <Filter size={16} className="text-[#D4A843]" />
            <h3 className="font-semibold text-white text-sm">
              Phễu chuyển đổi
            </h3>
          </div>

          <div className="space-y-0">
            {funnelSteps.map((step, i) => {
              const widthPct = maxFunnelValue > 0
                ? Math.max((step.value / maxFunnelValue) * 100, 8)
                : 8;
              const prevStep = i > 0 ? funnelSteps[i - 1] : null;

              return (
                <div key={step.label}>
                  {/* Drop-off indicator between steps */}
                  {prevStep && (
                    <div className="flex items-center gap-3 py-2 pl-4">
                      <ChevronDown size={14} className="text-gray-600" />
                      <span className="text-xs text-gray-500">
                        Mất {dropOff(prevStep.value, step.value)} ({prevStep.value - step.value} người)
                      </span>
                    </div>
                  )}

                  {/* Funnel bar */}
                  <div className="flex items-center gap-4">
                    <div className="w-32 shrink-0 text-right">
                      <span className="text-sm text-gray-300 font-medium">
                        {step.label}
                      </span>
                    </div>
                    <div className="flex-1 relative">
                      <div
                        className="h-12 rounded-lg flex items-center px-4 transition-all"
                        style={{
                          width: `${widthPct}%`,
                          background: step.color + "20",
                          border: `1px solid ${step.color}40`,
                          minWidth: "120px",
                        }}
                      >
                        <span
                          className="text-lg font-bold"
                          style={{ color: step.color }}
                        >
                          {formatNumber(step.value)}
                        </span>
                      </div>
                    </div>
                    {prevStep && step.value > 0 && (
                      <div className="w-20 shrink-0">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            background: "rgba(34,197,94,0.1)",
                            color: "#22c55e",
                          }}
                        >
                          {pct(step.value, prevStep.value)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Funnel summary */}
          <div
            className="mt-6 pt-4 flex items-center justify-center gap-6"
            style={{ borderTop: "1px solid #2a2a2a" }}
          >
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">
                Visitor {"→"} Lead
              </div>
              <div className="text-sm font-semibold text-blue-400">
                {pct(totalLeads, totalVisitors)}
              </div>
            </div>
            <div
              className="w-px h-8"
              style={{ background: "#2a2a2a" }}
            />
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">
                Lead {"→"} Customer
              </div>
              <div className="text-sm font-semibold text-green-400">
                {pct(totalCustomers, totalLeads)}
              </div>
            </div>
            <div
              className="w-px h-8"
              style={{ background: "#2a2a2a" }}
            />
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">
                Visitor {"→"} Customer
              </div>
              <div className="text-sm font-semibold text-[#D4A843]">
                {pct(totalCustomers, totalVisitors)}
              </div>
            </div>
          </div>
        </div>

        {/* ── Section D: Hoat dong gan day ───────────────────── */}
        <div className="card-dark overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-[#D4A843]" />
              <h3 className="font-semibold text-white text-sm">
                Hoạt động chuyển đổi gần đây
              </h3>
            </div>
            <span className="text-xs text-gray-500">
              {recentConversions.length} chuyển đổi
            </span>
          </div>

          {recentConversions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                    {["Khách hàng", "Liên hệ", "Nguồn", "Giá trị", "Thời gian"].map(
                      (col) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {recentConversions.map((c, idx) => (
                    <tr
                      key={c.id}
                      className="transition-colors hover:bg-white/[0.02]"
                      style={{
                        borderBottom:
                          idx < recentConversions.length - 1
                            ? "1px solid #2a2a2a"
                            : "none",
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                            style={{
                              background: "rgba(34,197,94,0.15)",
                              color: "#22c55e",
                            }}
                          >
                            {(c.full_name ?? c.email ?? "?")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <span className="text-white font-medium truncate max-w-[160px]">
                            {c.full_name || c.email || "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          {c.email && (
                            <span className="text-gray-400 text-xs truncate max-w-[180px]">
                              {c.email}
                            </span>
                          )}
                          {c.phone && (
                            <span className="text-gray-500 text-xs">
                              {c.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {c.utm_source ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize"
                            style={{
                              background: getSourceColor(c.utm_source) + "18",
                              color: getSourceColor(c.utm_source),
                            }}
                          >
                            {c.utm_source}
                          </span>
                        ) : (
                          <span className="text-gray-600 text-xs">
                            Không rõ
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[#D4A843] font-semibold text-xs">
                          {formatVND(c.lifetime_value ?? 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-400 text-xs whitespace-nowrap">
                          {c.converted_at ? timeAgo(c.converted_at) : "N/A"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
              Chưa có dữ liệu chuyển đổi gần đây
            </div>
          )}
        </div>

        {/* ── Footer note ────────────────────────────────────── */}
        <div className="text-center text-xs text-gray-500 py-4">
          Dữ liệu tổng hợp từ analytics_events, crm_contacts và orders.
          Chuyển đổi tính theo journey_stage của crm_contacts.
        </div>
      </div>
    </div>
  );
}
