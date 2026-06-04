import { createClient, createAdminClient } from "@/lib/supabase/server";
import TopBar from "@/components/layout/TopBar";
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Megaphone,
  Hash,
  AlertCircle,
} from "lucide-react";
import { redirect } from "next/navigation";

/* ---------- Types ---------- */

interface ChannelRow {
  source: string;
  contacts: number;
  leads: number;
  customers: number;
  conversionRate: number;
  revenue: number;
  avgRevenuePerCustomer: number;
  paidRevenue: number;
}

interface MediumRow {
  medium: string;
  count: number;
  customers: number;
}

interface CampaignRow {
  campaign: string;
  count: number;
  customers: number;
  revenue: number;
}

interface ChannelDetail {
  source: string;
  contacts: number;
  customers: number;
  revenue: number;
  mediums: MediumRow[];
  campaigns: CampaignRow[];
  previousPeriodContacts: number;
}

/* ---------- Helpers ---------- */

function formatVND(amount: number): string {
  if (!amount) return "0đ";
  return amount.toLocaleString("vi-VN") + "đ";
}

function pct(n: number, d: number): string {
  if (d === 0) return "0%";
  return ((n / d) * 100).toFixed(1) + "%";
}

function pctNum(n: number, d: number): number {
  if (d === 0) return 0;
  return (n / d) * 100;
}

const SOURCE_COLORS: Record<string, string> = {
  facebook: "#1877F2",
  google: "#EA4335",
  tiktok: "#000000",
  email: "#f59e0b",
  organic: "#22c55e",
  direct: "#6b7280",
  referral: "#a855f7",
  ads: "#ec4899",
  social: "#06b6d4",
  zalo: "#0068FF",
};

function getSourceColor(source: string): string {
  return SOURCE_COLORS[source.toLowerCase()] ?? "#6b7280";
}

function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    facebook: "Facebook",
    google: "Google",
    tiktok: "TikTok",
    email: "Email",
    organic: "Organic",
    direct: "Direct",
    referral: "Referral",
    ads: "Ads",
    social: "Social",
    zalo: "Zalo",
  };
  return labels[source.toLowerCase()] ?? source.charAt(0).toUpperCase() + source.slice(1);
}

/* ---------- Page ---------- */

export default async function ChannelAnalyticsPage({
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

  // Date range (default: last 30 days)
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const defaultTo = now.toISOString().split("T")[0];

  const dateFrom = params.from || defaultFrom;
  const dateTo = params.to || defaultTo;

  // Previous period for trend comparison
  const fromDate = new Date(dateFrom);
  const toDate = new Date(dateTo);
  const periodLength = toDate.getTime() - fromDate.getTime();
  const prevFrom = new Date(fromDate.getTime() - periodLength)
    .toISOString()
    .split("T")[0];
  const prevTo = new Date(fromDate.getTime() - 1)
    .toISOString()
    .split("T")[0];

  // Data queries via admin client
  const adminClient = await createAdminClient();

  // Fetch current period contacts
  const { data: currentContacts } = await adminClient
    .from("crm_contacts")
    .select(
      "id, utm_source, utm_medium, utm_campaign, journey_stage, lifetime_value, created_at"
    )
    .gte("created_at", dateFrom)
    .lte("created_at", dateTo + "T23:59:59");

  const contacts = currentContacts ?? [];

  // Fetch previous period contacts for trend comparison
  const { data: prevContacts } = await adminClient
    .from("crm_contacts")
    .select("id, utm_source, created_at")
    .gte("created_at", prevFrom)
    .lte("created_at", prevTo + "T23:59:59");

  const previousContacts = prevContacts ?? [];

  // Fetch paid orders with utm_source for actual revenue
  const { data: paidOrders } = await adminClient
    .from("orders")
    .select("id, utm_source, amount, status, paid_at")
    .eq("status", "paid")
    .not("utm_source", "is", null)
    .gte("paid_at", dateFrom)
    .lte("paid_at", dateTo + "T23:59:59");

  const orders = paidOrders ?? [];

  // Build paid revenue by source
  const paidRevenueBySource = new Map<string, number>();
  for (const o of orders) {
    const src = ((o.utm_source as string) ?? "").toLowerCase();
    if (!src) continue;
    paidRevenueBySource.set(
      src,
      (paidRevenueBySource.get(src) ?? 0) + (Number(o.amount) || 0)
    );
  }

  // Build previous period counts by source
  const prevCountBySource = new Map<string, number>();
  for (const c of previousContacts) {
    const src = ((c.utm_source as string) ?? "").toLowerCase();
    if (!src) continue;
    prevCountBySource.set(src, (prevCountBySource.get(src) ?? 0) + 1);
  }

  // Aggregate channels
  const channelMap = new Map<
    string,
    {
      contacts: number;
      leads: number;
      customers: number;
      revenue: number;
      mediums: Map<string, { count: number; customers: number }>;
      campaigns: Map<
        string,
        { count: number; customers: number; revenue: number }
      >;
    }
  >();

  const isCustomer = (s: string | null | undefined) =>
    s === "customer" || s === "advocate";
  const isLead = (s: string | null | undefined) =>
    s === "lead" || s === "contacted" || s === "qualified" || s === "negotiation";

  for (const c of contacts) {
    const src = ((c.utm_source as string) ?? "").toLowerCase() || "direct";

    if (!channelMap.has(src)) {
      channelMap.set(src, {
        contacts: 0,
        leads: 0,
        customers: 0,
        revenue: 0,
        mediums: new Map(),
        campaigns: new Map(),
      });
    }
    const row = channelMap.get(src)!;
    row.contacts += 1;

    if (isCustomer(c.journey_stage)) {
      row.customers += 1;
    }
    if (isLead(c.journey_stage)) {
      row.leads += 1;
    }
    row.revenue += Number(c.lifetime_value) || 0;

    // Medium breakdown
    const medium = ((c.utm_medium as string) ?? "none").toLowerCase();
    if (!row.mediums.has(medium)) {
      row.mediums.set(medium, { count: 0, customers: 0 });
    }
    const mediumRow = row.mediums.get(medium)!;
    mediumRow.count += 1;
    if (isCustomer(c.journey_stage)) mediumRow.customers += 1;

    // Campaign breakdown
    const campaign = c.utm_campaign as string | null;
    if (campaign) {
      if (!row.campaigns.has(campaign)) {
        row.campaigns.set(campaign, { count: 0, customers: 0, revenue: 0 });
      }
      const campRow = row.campaigns.get(campaign)!;
      campRow.count += 1;
      if (isCustomer(c.journey_stage)) campRow.customers += 1;
      campRow.revenue += Number(c.lifetime_value) || 0;
    }
  }

  // Build channel rows sorted by contacts desc
  const channelRows: ChannelRow[] = Array.from(channelMap.entries())
    .map(([source, data]) => ({
      source,
      contacts: data.contacts,
      leads: data.leads,
      customers: data.customers,
      conversionRate: pctNum(data.customers, data.contacts),
      revenue: data.revenue,
      avgRevenuePerCustomer:
        data.customers > 0 ? data.revenue / data.customers : 0,
      paidRevenue: paidRevenueBySource.get(source) ?? 0,
    }))
    .sort((a, b) => b.contacts - a.contacts);

  // Build channel detail cards for top 5
  const top5Details: ChannelDetail[] = channelRows.slice(0, 5).map((ch) => {
    const data = channelMap.get(ch.source)!;
    return {
      source: ch.source,
      contacts: ch.contacts,
      customers: ch.customers,
      revenue: ch.revenue,
      mediums: Array.from(data.mediums.entries())
        .map(([medium, d]) => ({
          medium,
          count: d.count,
          customers: d.customers,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      campaigns: Array.from(data.campaigns.entries())
        .map(([campaign, d]) => ({
          campaign,
          count: d.count,
          customers: d.customers,
          revenue: d.revenue,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      previousPeriodContacts: prevCountBySource.get(ch.source) ?? 0,
    };
  });

  // Summary stats
  const totalChannels = channelRows.length;
  const bestChannel =
    channelRows.length > 0
      ? channelRows.reduce((best, ch) =>
          ch.conversionRate > best.conversionRate ? ch : best
        )
      : null;
  const worstChannel =
    channelRows.length > 0
      ? channelRows.reduce((worst, ch) =>
          ch.conversionRate < worst.conversionRate ? ch : worst
        )
      : null;
  const totalContacts = channelRows.reduce((s, r) => s + r.contacts, 0);
  const totalCustomers = channelRows.reduce((s, r) => s + r.customers, 0);
  const overallConversion = pctNum(totalCustomers, totalContacts);

  // Max values for progress bars
  const maxContacts =
    channelRows.length > 0
      ? Math.max(...channelRows.map((r) => r.contacts))
      : 1;
  const maxRevenue =
    channelRows.length > 0
      ? Math.max(...channelRows.map((r) => r.revenue))
      : 1;

  // Known channels that might not have data
  const knownChannels = [
    "facebook",
    "google",
    "tiktok",
    "organic",
    "email",
    "direct",
    "referral",
    "zalo",
  ];
  const activeChannels = new Set(channelRows.map((r) => r.source));
  const emptyChannels = knownChannels.filter((ch) => !activeChannels.has(ch));

  return (
    <div>
      <TopBar
        title="Kenh Marketing"
        subtitle="Phan tich hieu suat theo tung kenh marketing"
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header with date filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers size={20} className="text-[#D4A843]" />
              Channel Analytics
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              So sanh hieu suat cac kenh marketing trong giai doan{" "}
              <span className="text-white font-medium">{dateFrom}</span> -{" "}
              <span className="text-white font-medium">{dateTo}</span>
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
              Loc
            </button>
          </form>
        </div>

        {/* ============================================================ */}
        {/* Section A: Summary Cards                                       */}
        {/* ============================================================ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Kenh dang hoat dong",
              value: String(totalChannels),
              icon: Layers,
              color: "#3b82f6",
            },
            {
              label: "Kenh tot nhat",
              value: bestChannel
                ? getSourceLabel(bestChannel.source)
                : "—",
              subtext: bestChannel
                ? `CV: ${bestChannel.conversionRate.toFixed(1)}%`
                : "",
              icon: TrendingUp,
              color: bestChannel
                ? getSourceColor(bestChannel.source)
                : "#22c55e",
            },
            {
              label: "Kenh can cai thien",
              value: worstChannel
                ? getSourceLabel(worstChannel.source)
                : "—",
              subtext: worstChannel
                ? `CV: ${worstChannel.conversionRate.toFixed(1)}%`
                : "",
              icon: TrendingDown,
              color: worstChannel
                ? getSourceColor(worstChannel.source)
                : "#ef4444",
            },
            {
              label: "Ty le CV tong",
              value: overallConversion.toFixed(1) + "%",
              subtext: `${totalCustomers}/${totalContacts}`,
              icon: ArrowUpRight,
              color: "#22c55e",
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
              {stat.subtext && (
                <div className="text-xs text-gray-500 mt-1">
                  {stat.subtext}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ============================================================ */}
        {/* Section B: Channel Comparison Table                             */}
        {/* ============================================================ */}
        <div className="card-dark overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-[#D4A843]" />
              <h3 className="font-semibold text-white text-sm">
                So sanh kenh marketing
              </h3>
            </div>
            <span className="text-xs text-gray-500">
              {channelRows.length} kenh
            </span>
          </div>

          {channelRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                    {[
                      "Kenh",
                      "Contacts",
                      "Leads",
                      "Customers",
                      "Ty le CV",
                      "Doanh thu",
                      "DT TB/khach",
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
                  {channelRows.map((row, idx) => (
                    <tr
                      key={row.source}
                      className="transition-colors hover:bg-white/[0.02]"
                      style={{
                        borderBottom:
                          idx < channelRows.length - 1
                            ? "1px solid #2a2a2a"
                            : "none",
                      }}
                    >
                      {/* Channel name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-sm shrink-0"
                            style={{
                              background: getSourceColor(row.source),
                              border:
                                row.source === "tiktok"
                                  ? "1px solid #333"
                                  : "none",
                            }}
                          />
                          <span className="text-white font-medium">
                            {getSourceLabel(row.source)}
                          </span>
                        </div>
                      </td>

                      {/* Contacts with progress bar */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold w-8">
                            {row.contacts}
                          </span>
                          <div className="flex-1 max-w-[80px]">
                            <div
                              className="h-1.5 rounded-full overflow-hidden"
                              style={{ background: "#1a1a1a" }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${(row.contacts / maxContacts) * 100}%`,
                                  background: getSourceColor(row.source),
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Leads */}
                      <td className="px-4 py-3">
                        <span className="text-blue-400 font-semibold">
                          {row.leads}
                        </span>
                      </td>

                      {/* Customers */}
                      <td className="px-4 py-3">
                        <span className="text-green-400 font-semibold">
                          {row.customers}
                        </span>
                      </td>

                      {/* Conversion rate */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            background:
                              row.conversionRate >= 10
                                ? "rgba(34,197,94,0.1)"
                                : row.conversionRate >= 5
                                  ? "rgba(245,158,11,0.1)"
                                  : "rgba(239,68,68,0.1)",
                            color:
                              row.conversionRate >= 10
                                ? "#22c55e"
                                : row.conversionRate >= 5
                                  ? "#f59e0b"
                                  : "#ef4444",
                          }}
                        >
                          {row.conversionRate.toFixed(1)}%
                        </span>
                      </td>

                      {/* Revenue */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[#D4A843] font-semibold">
                            {formatVND(row.revenue)}
                          </span>
                          <div className="flex-1 max-w-[60px]">
                            <div
                              className="h-1.5 rounded-full overflow-hidden"
                              style={{ background: "#1a1a1a" }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${maxRevenue > 0 ? (row.revenue / maxRevenue) * 100 : 0}%`,
                                  background: "#D4A843",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Average revenue per customer */}
                      <td className="px-4 py-3">
                        <span className="text-gray-300 font-medium text-xs">
                          {formatVND(row.avgRevenuePerCustomer)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Footer totals row */}
                <tfoot>
                  <tr
                    style={{
                      borderTop: "2px solid #2a2a2a",
                      background: "rgba(212,168,67,0.03)",
                    }}
                  >
                    <td className="px-4 py-3">
                      <span className="text-gray-400 font-semibold text-xs uppercase">
                        Tong
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white font-bold">
                        {totalContacts}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-blue-400 font-bold">
                        {channelRows.reduce((s, r) => s + r.leads, 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-green-400 font-bold">
                        {totalCustomers}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{
                          background: "rgba(34,197,94,0.1)",
                          color: "#22c55e",
                        }}
                      >
                        {overallConversion.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[#D4A843] font-bold">
                        {formatVND(
                          channelRows.reduce((s, r) => s + r.revenue, 0)
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-400 text-xs">-</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Layers size={32} className="mb-3 text-gray-600" />
              <p className="text-sm font-medium">
                Chua co du lieu kenh marketing
              </p>
              <p className="text-xs mt-1">
                Dam bao UTM parameters duoc gan vao cac link quang cao
              </p>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* Section C: Channel Detail Cards (Top 5)                        */}
        {/* ============================================================ */}
        {top5Details.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Megaphone size={16} className="text-[#D4A843]" />
              <h3 className="font-semibold text-white text-sm">
                Chi tiet top {top5Details.length} kenh
              </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {top5Details.map((detail) => {
                const trendDiff =
                  detail.previousPeriodContacts > 0
                    ? ((detail.contacts - detail.previousPeriodContacts) /
                        detail.previousPeriodContacts) *
                      100
                    : null;

                return (
                  <div
                    key={detail.source}
                    className="card-dark p-5 space-y-4"
                    style={{
                      borderLeft: `3px solid ${getSourceColor(detail.source)}`,
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{
                            background: getSourceColor(detail.source),
                            border:
                              detail.source === "tiktok"
                                ? "1px solid #333"
                                : "none",
                          }}
                        />
                        <span className="text-white font-semibold text-sm">
                          {getSourceLabel(detail.source)}
                        </span>
                      </div>

                      {/* Trend indicator */}
                      {trendDiff !== null && (
                        <div
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            background:
                              trendDiff >= 0
                                ? "rgba(34,197,94,0.1)"
                                : "rgba(239,68,68,0.1)",
                            color: trendDiff >= 0 ? "#22c55e" : "#ef4444",
                          }}
                        >
                          {trendDiff >= 0 ? (
                            <ArrowUpRight size={12} />
                          ) : (
                            <ArrowDownRight size={12} />
                          )}
                          {Math.abs(trendDiff).toFixed(0)}%
                        </div>
                      )}
                      {trendDiff === null && (
                        <span className="text-xs text-gray-600">Moi</span>
                      )}
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <div className="text-xs text-gray-500">Contacts</div>
                        <div className="text-lg font-bold text-white">
                          {detail.contacts}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Customers</div>
                        <div className="text-lg font-bold text-green-400">
                          {detail.customers}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Doanh thu</div>
                        <div className="text-sm font-bold text-[#D4A843] mt-0.5">
                          {formatVND(detail.revenue)}
                        </div>
                      </div>
                    </div>

                    {/* Medium breakdown */}
                    {detail.mediums.length > 0 && (
                      <div>
                        <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          Theo medium
                        </div>
                        <div className="space-y-1.5">
                          {detail.mediums.map((m) => (
                            <div
                              key={m.medium}
                              className="flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-1.5">
                                <Hash size={10} className="text-gray-600" />
                                <span className="text-gray-300">
                                  {m.medium}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">
                                  {m.count}
                                </span>
                                <span className="text-green-400 text-[11px]">
                                  {m.customers} cust.
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top campaigns */}
                    {detail.campaigns.length > 0 && (
                      <div>
                        <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          Top campaigns
                        </div>
                        <div className="space-y-1.5">
                          {detail.campaigns.map((camp) => (
                            <div
                              key={camp.campaign}
                              className="flex items-center justify-between text-xs"
                            >
                              <span
                                className="text-gray-300 truncate max-w-[140px]"
                                title={camp.campaign}
                              >
                                {camp.campaign}
                              </span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-white font-medium">
                                  {camp.count}
                                </span>
                                <span className="text-[#D4A843] text-[11px]">
                                  {formatVND(camp.revenue)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Previous period comparison */}
                    {detail.previousPeriodContacts > 0 && (
                      <div className="pt-2 border-t border-[#2a2a2a]">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">
                            Ky truoc
                          </span>
                          <span className="text-gray-400">
                            {detail.previousPeriodContacts} contacts
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* Section D: Channels with no data (suggestions)                 */}
        {/* ============================================================ */}
        {emptyChannels.length > 0 && (
          <div className="card-dark p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={16} className="text-gray-500" />
              <h3 className="font-semibold text-white text-sm">
                Kenh chua co du lieu
              </h3>
              <span className="text-xs text-gray-500 ml-auto">
                {emptyChannels.length} kenh
              </span>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              Cac kenh sau chua ghi nhan contact nao trong giai doan nay. Hay
              trien khai UTM tracking de theo doi hieu suat.
            </p>

            <div className="flex flex-wrap gap-2">
              {emptyChannels.map((ch) => (
                <div
                  key={ch}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                  style={{
                    background: "#151515",
                    border: "1px solid #2a2a2a",
                  }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{
                      background: getSourceColor(ch),
                      border: ch === "tiktok" ? "1px solid #333" : "none",
                      opacity: 0.5,
                    }}
                  />
                  <span className="text-gray-400">
                    {getSourceLabel(ch)}
                  </span>
                  <span className="text-gray-600">|</span>
                  <span className="text-gray-600 text-[11px]">
                    ?utm_source={ch}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer note */}
        <div className="text-center text-xs text-gray-500 py-4">
          Du lieu kenh dua tren UTM parameters (utm_source) tu crm_contacts va
          paid orders. Giai doan: {dateFrom} - {dateTo}.
        </div>
      </div>
    </div>
  );
}
