import { createClient, createAdminClient } from "@/lib/supabase/server";
import TopBar from "@/components/layout/TopBar";
import {
  Layout,
  ExternalLink,
  TrendingUp,
  Eye,
  BarChart2,
  AlertTriangle,
} from "lucide-react";
import { redirect } from "next/navigation";

/* ---------- Types ---------- */

interface LandingPageRow {
  path: string;
  contacts: number;
  customers: number;
  revenue: number;
  pageViews: number;
  conversionRate: number;
}

/* ---------- Helpers ---------- */

function formatVND(amount: number): string {
  if (!amount) return "0đ";
  return amount.toLocaleString("vi-VN") + "đ";
}

function pctNum(n: number, d: number): number {
  if (d === 0) return 0;
  return (n / d) * 100;
}

function truncatePath(path: string, maxLen = 50): string {
  if (path.length <= maxLen) return path;
  return path.slice(0, maxLen - 3) + "...";
}

function conversionColor(rate: number): { bg: string; text: string } {
  if (rate >= 10) return { bg: "rgba(34,197,94,0.15)", text: "#22c55e" };
  if (rate >= 5) return { bg: "rgba(234,179,8,0.15)", text: "#eab308" };
  if (rate >= 1) return { bg: "rgba(249,115,22,0.15)", text: "#f97316" };
  return { bg: "rgba(239,68,68,0.15)", text: "#ef4444" };
}

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

/* ---------- Page ---------- */

export default async function LandingPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;

  // Auth check
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

  const allowedRoles = ["admin", "manager", "marketing"];
  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect("/");
  }

  // Date range
  const defaults = defaultDateRange();
  const dateFrom = params.from || defaults.from;
  const dateTo = params.to || defaults.to;

  // Data queries via admin client
  const adminClient = await createAdminClient();

  // Fetch contacts with first_landing_path
  let contactQuery = adminClient
    .from("crm_contacts")
    .select(
      "id, first_landing_path, first_page, journey_stage, lifetime_value, created_at"
    );

  contactQuery = contactQuery.gte("created_at", dateFrom);
  contactQuery = contactQuery.lte("created_at", dateTo + "T23:59:59");

  const { data: contactsData } = await contactQuery;
  const contacts = contactsData ?? [];

  // Fetch page_view events from analytics_events
  let eventsQuery = adminClient
    .from("analytics_events")
    .select("page")
    .eq("event", "page_view")
    .not("page", "is", null);

  eventsQuery = eventsQuery.gte("created_at", dateFrom);
  eventsQuery = eventsQuery.lte("created_at", dateTo + "T23:59:59");

  const { data: eventsData } = await eventsQuery;
  const events = eventsData ?? [];

  // Count page views per path
  const pageViewMap = new Map<string, number>();
  for (const e of events) {
    const page = e.page as string;
    if (!page) continue;
    pageViewMap.set(page, (pageViewMap.get(page) || 0) + 1);
  }

  const isCustomer = (s: string | null | undefined) =>
    s === "customer" || s === "advocate";

  // Aggregate contacts by first_landing_path
  const landingMap = new Map<
    string,
    { contacts: number; customers: number; revenue: number }
  >();
  for (const c of contacts) {
    const path =
      (c.first_landing_path as string | null) ??
      (c.first_page as string | null);
    if (!path) continue;
    if (!landingMap.has(path)) {
      landingMap.set(path, { contacts: 0, customers: 0, revenue: 0 });
    }
    const row = landingMap.get(path)!;
    row.contacts += 1;
    if (isCustomer(c.journey_stage as string | null)) row.customers += 1;
    row.revenue += Number(c.lifetime_value) || 0;
  }

  // Build final rows
  const allPaths = new Set([...Array.from(landingMap.keys()), ...Array.from(pageViewMap.keys())]);
  const landingRows: LandingPageRow[] = [];
  for (const path of Array.from(allPaths)) {
    const contactStats = landingMap.get(path) || {
      contacts: 0,
      customers: 0,
      revenue: 0,
    };
    const pageViews = pageViewMap.get(path) || 0;
    landingRows.push({
      path,
      contacts: contactStats.contacts,
      customers: contactStats.customers,
      revenue: contactStats.revenue,
      pageViews,
      conversionRate: pctNum(contactStats.customers, contactStats.contacts),
    });
  }

  // Sort by contacts DESC
  landingRows.sort((a, b) => b.contacts - a.contacts);

  // Summary cards
  const totalPages = landingRows.filter(
    (r) => r.contacts > 0 || r.pageViews > 0
  ).length;

  const bestConvertingPage =
    landingRows.filter((r) => r.contacts >= 3).sort((a, b) => b.conversionRate - a.conversionRate)[0] ||
    null;

  const mostTrafficPage =
    [...landingRows].sort((a, b) => b.pageViews - a.pageViews)[0] || null;

  const pagesWithContacts = landingRows.filter((r) => r.contacts > 0);
  const avgConversionRate =
    pagesWithContacts.length > 0
      ? pagesWithContacts.reduce((sum, r) => sum + r.conversionRate, 0) /
        pagesWithContacts.length
      : 0;

  // Max values for progress bars
  const maxPageViews = Math.max(...landingRows.map((r) => r.pageViews), 1);

  // Top 5 landing pages (by contacts)
  const top5 = landingRows.filter((r) => r.contacts > 0).slice(0, 5);

  // Pages with traffic but no conversions
  const noConversionPages = landingRows
    .filter((r) => r.pageViews > 0 && r.customers === 0 && r.contacts > 0)
    .sort((a, b) => b.pageViews - a.pageViews)
    .slice(0, 10);

  // Pages with traffic but zero contacts at all
  const trafficOnlyPages = landingRows
    .filter((r) => r.pageViews >= 5 && r.contacts === 0)
    .sort((a, b) => b.pageViews - a.pageViews)
    .slice(0, 10);

  const opportunityPages = [...noConversionPages, ...trafficOnlyPages]
    .sort((a, b) => b.pageViews - a.pageViews)
    .slice(0, 10);

  return (
    <div>
      <TopBar
        title="Landing Pages"
        subtitle="Hiệu suất từng trang đích"
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header with date filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Layout size={20} className="text-[#D4A843]" />
              Landing Page Analytics
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Phân tích hiệu suất các trang đích theo lưu lượng, contacts và chuyển đổi
            </p>
          </div>
          <form method="GET" className="flex items-center gap-2">
            <input
              type="date"
              name="from"
              defaultValue={dateFrom}
              className="input-dark px-3 py-1.5 text-xs"
            />
            <span className="text-gray-500 text-xs">{"→"}</span>
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

        {/* ============================================================ */}
        {/* Section A: Summary Cards                                      */}
        {/* ============================================================ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Trang theo dõi",
              value: String(totalPages),
              icon: Layout,
              color: "#3b82f6",
            },
            {
              label: "Trang chuyển đổi tốt nhất",
              value: bestConvertingPage
                ? truncatePath(bestConvertingPage.path, 24)
                : "—",
              icon: TrendingUp,
              color: "#22c55e",
              sub: bestConvertingPage
                ? bestConvertingPage.conversionRate.toFixed(1) + "% CV"
                : undefined,
            },
            {
              label: "Trang nhiều traffic nhất",
              value: mostTrafficPage
                ? truncatePath(mostTrafficPage.path, 24)
                : "—",
              icon: Eye,
              color: "#a855f7",
              sub: mostTrafficPage
                ? mostTrafficPage.pageViews.toLocaleString("vi-VN") +
                  " lượt xem"
                : undefined,
            },
            {
              label: "Tỷ lệ chuyển đổi TB",
              value: avgConversionRate.toFixed(1) + "%",
              icon: TrendingUp,
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
              <div
                className="text-lg font-bold text-white truncate"
                title={
                  "sub" in stat && stat.sub ? stat.sub : undefined
                }
              >
                {stat.value}
              </div>
              {"sub" in stat && stat.sub && (
                <div className="text-xs text-gray-400 mt-0.5">
                  {stat.sub}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ============================================================ */}
        {/* Section B: Landing Page Table (Main)                          */}
        {/* ============================================================ */}
        <div className="card-dark overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-[#D4A843]" />
              <h3 className="font-semibold text-white text-sm">
                Hiệu suất từng trang đích
              </h3>
            </div>
            <span className="text-xs text-gray-500">
              {landingRows.length} trang
            </span>
          </div>

          {landingRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                    {[
                      "Trang",
                      "Lượt xem",
                      "Contacts",
                      "Khách hàng",
                      "CV%",
                      "Doanh thu",
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
                  {landingRows.map((row, idx) => {
                    const cvColor = conversionColor(row.conversionRate);
                    return (
                      <tr
                        key={row.path}
                        className="transition-colors hover:bg-white/[0.02]"
                        style={{
                          borderBottom:
                            idx < landingRows.length - 1
                              ? "1px solid #2a2a2a"
                              : "none",
                        }}
                      >
                        {/* Path */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <a
                              href={row.path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-white hover:text-[#D4A843] transition-colors group"
                            >
                              <ExternalLink
                                size={12}
                                className="text-gray-500 group-hover:text-[#D4A843] shrink-0"
                              />
                              <span
                                className="font-mono text-xs truncate block max-w-[280px]"
                                title={row.path}
                              >
                                {truncatePath(row.path)}
                              </span>
                            </a>
                          </div>
                        </td>
                        {/* Page Views with progress bar */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold w-12">
                              {row.pageViews.toLocaleString("vi-VN")}
                            </span>
                            <div className="flex-1 max-w-[80px]">
                              <div
                                className="h-1.5 rounded-full overflow-hidden"
                                style={{ background: "#1a1a1a" }}
                              >
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${(row.pageViews / maxPageViews) * 100}%`,
                                    background: "#a855f7",
                                    minWidth:
                                      row.pageViews > 0 ? "4px" : "0",
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                        {/* Contacts */}
                        <td className="px-4 py-3">
                          <span className="text-blue-400 font-semibold">
                            {row.contacts}
                          </span>
                        </td>
                        {/* Customers */}
                        <td className="px-4 py-3">
                          <span className="text-green-400 font-semibold">
                            {row.customers}
                          </span>
                        </td>
                        {/* Conversion Rate */}
                        <td className="px-4 py-3">
                          {row.contacts > 0 ? (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                              style={{
                                background: cvColor.bg,
                                color: cvColor.text,
                              }}
                            >
                              {row.conversionRate.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-600 text-xs">
                              —
                            </span>
                          )}
                        </td>
                        {/* Revenue */}
                        <td className="px-4 py-3">
                          <span className="text-[#D4A843] font-semibold">
                            {formatVND(row.revenue)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
              Chưa có dữ liệu landing page
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* Section C: Top 5 Landing Pages Cards                          */}
        {/* ============================================================ */}
        {top5.length > 0 && (
          <div className="card-dark p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-[#D4A843]" />
              <h3 className="font-semibold text-white text-sm">
                Top 5 trang đích hàng đầu
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {top5.map((row, i) => {
                const cvColor = conversionColor(row.conversionRate);
                const funnelMax = Math.max(
                  row.pageViews,
                  row.contacts,
                  1
                );
                return (
                  <div
                    key={row.path}
                    className="rounded-lg p-4 space-y-3"
                    style={{
                      background: "#0f0f0f",
                      border: "1px solid #2a2a2a",
                    }}
                  >
                    {/* Rank + Path */}
                    <div className="flex items-start gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{
                          background: "#D4A84318",
                          color: "#D4A843",
                        }}
                      >
                        {i + 1}
                      </div>
                      <a
                        href={row.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white text-xs font-mono truncate hover:text-[#D4A843] transition-colors"
                        title={row.path}
                      >
                        {truncatePath(row.path, 30)}
                      </a>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-gray-500">Lượt xem</div>
                        <div className="text-white font-semibold">
                          {row.pageViews.toLocaleString("vi-VN")}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Contacts</div>
                        <div className="text-blue-400 font-semibold">
                          {row.contacts}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Khách hàng</div>
                        <div className="text-green-400 font-semibold">
                          {row.customers}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Doanh thu</div>
                        <div className="text-[#D4A843] font-semibold text-[11px]">
                          {formatVND(row.revenue)}
                        </div>
                      </div>
                    </div>

                    {/* Conversion Funnel Mini Bar */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                        Phễu chuyển đổi
                      </div>
                      {[
                        {
                          label: "Xem",
                          value: row.pageViews,
                          color: "#a855f7",
                        },
                        {
                          label: "Contact",
                          value: row.contacts,
                          color: "#3b82f6",
                        },
                        {
                          label: "KH",
                          value: row.customers,
                          color: "#22c55e",
                        },
                      ].map((step) => (
                        <div
                          key={step.label}
                          className="flex items-center gap-2"
                        >
                          <span className="text-[10px] text-gray-400 w-10 shrink-0">
                            {step.label}
                          </span>
                          <div
                            className="flex-1 h-2 rounded-full overflow-hidden"
                            style={{ background: "#1a1a1a" }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${funnelMax > 0 ? (step.value / funnelMax) * 100 : 0}%`,
                                background: step.color,
                                minWidth:
                                  step.value > 0 ? "4px" : "0",
                              }}
                            />
                          </div>
                          <span
                            className="text-[10px] font-semibold w-8 text-right"
                            style={{ color: step.color }}
                          >
                            {step.value}
                          </span>
                        </div>
                      ))}
                      {/* Conversion badge */}
                      <div className="flex justify-end pt-1">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{
                            background: cvColor.bg,
                            color: cvColor.text,
                          }}
                        >
                          CV {row.conversionRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* Section D: Optimization Opportunities                         */}
        {/* ============================================================ */}
        {opportunityPages.length > 0 && (
          <div className="card-dark overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-yellow-500" />
                <h3 className="font-semibold text-white text-sm">
                  Cơ hội tối ưu hóa
                </h3>
                <span className="text-xs text-gray-500 ml-2">
                  Trang có traffic nhưng chưa có chuyển đổi
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {opportunityPages.length} trang
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                    {[
                      "Trang",
                      "Lượt xem",
                      "Contacts",
                      "Khách hàng",
                      "Trạng thái",
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
                  {opportunityPages.map((row, idx) => {
                    const status =
                      row.contacts === 0
                        ? {
                            label: "Không có contact",
                            bg: "rgba(239,68,68,0.1)",
                            color: "#ef4444",
                          }
                        : {
                            label: "Chưa chuyển đổi",
                            bg: "rgba(234,179,8,0.1)",
                            color: "#eab308",
                          };
                    return (
                      <tr
                        key={row.path}
                        className="transition-colors hover:bg-white/[0.02]"
                        style={{
                          borderBottom:
                            idx < opportunityPages.length - 1
                              ? "1px solid #2a2a2a"
                              : "none",
                        }}
                      >
                        <td className="px-4 py-3">
                          <a
                            href={row.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-white hover:text-[#D4A843] transition-colors group"
                          >
                            <ExternalLink
                              size={12}
                              className="text-gray-500 group-hover:text-[#D4A843] shrink-0"
                            />
                            <span
                              className="font-mono text-xs truncate block max-w-[280px]"
                              title={row.path}
                            >
                              {truncatePath(row.path)}
                            </span>
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-white font-semibold">
                            {row.pageViews.toLocaleString("vi-VN")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-blue-400 font-semibold">
                            {row.contacts}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-500">0</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              background: status.bg,
                              color: status.color,
                            }}
                          >
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer note */}
        <div className="text-center text-xs text-gray-500 py-4">
          Dữ liệu landing page dựa trên first_landing_path từ crm_contacts và page_view từ analytics_events.
          Mặc định hiển thị 30 ngày gần nhất.
        </div>
      </div>
    </div>
  );
}
