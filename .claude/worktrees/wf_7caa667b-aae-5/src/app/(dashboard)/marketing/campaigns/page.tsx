import { createClient, createAdminClient } from "@/lib/supabase/server";
import TopBar from "@/components/layout/TopBar";
import {
  Target,
  TrendingUp,
  DollarSign,
  BarChart2,
  Users,
  AlertTriangle,
  Megaphone,
  Award,
} from "lucide-react";
import { redirect } from "next/navigation";

/* ---------- Types ---------- */

interface CampaignRow {
  campaign: string;
  source: string;
  medium: string;
  contacts: number;
  customers: number;
  conversionRate: number;
  revenue: number;
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

function conversionColor(rate: number): {
  text: string;
  bg: string;
} {
  if (rate >= 10) return { text: "#22c55e", bg: "rgba(34,197,94,0.1)" };
  if (rate >= 5) return { text: "#f59e0b", bg: "rgba(245,158,11,0.1)" };
  return { text: "#ef4444", bg: "rgba(239,68,68,0.1)" };
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
};

function getSourceColor(source: string): string {
  return SOURCE_COLORS[source.toLowerCase()] ?? "#6b7280";
}

const NULL_CAMPAIGN_LABEL = "Trực tiếp / Không có chiến dịch";

/* ---------- Page ---------- */

export default async function CampaignPerformancePage({
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

  // Default date range: last 30 days
  const defaultFrom = new Date(Date.now() - 30 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  const defaultTo = new Date().toISOString().slice(0, 10);
  const dateFrom = params.from || defaultFrom;
  const dateTo = params.to || defaultTo;

  // Data queries via admin client
  const adminClient = await createAdminClient();

  // Fetch contacts with UTM data
  const { data: contactsData } = await adminClient
    .from("crm_contacts")
    .select(
      "id, utm_source, utm_medium, utm_campaign, journey_stage, lifetime_value, created_at",
    )
    .gte("created_at", dateFrom)
    .lte("created_at", dateTo + "T23:59:59");

  // Fetch paid orders with UTM data in the same date range
  const { data: ordersData } = await adminClient
    .from("orders")
    .select(
      "id, utm_source, utm_medium, utm_campaign, amount, customer_email, status, paid_at",
    )
    .eq("status", "paid")
    .gte("paid_at", dateFrom)
    .lte("paid_at", dateTo + "T23:59:59");

  const allContacts = contactsData ?? [];
  const allOrders = ordersData ?? [];

  const isCustomer = (s: string | null | undefined) =>
    s === "customer" || s === "advocate";

  // Aggregate by campaign
  // We use crm_contacts for contacts/customers counts and orders for revenue
  const campaignMap = new Map<
    string,
    {
      campaign: string;
      sources: Set<string>;
      mediums: Set<string>;
      contacts: number;
      customers: number;
      revenue: number;
    }
  >();

  // Process contacts
  for (const c of allContacts) {
    const camp = (c.utm_campaign as string | null) ?? "";
    const key = camp || "__null__";

    if (!campaignMap.has(key)) {
      campaignMap.set(key, {
        campaign: camp || NULL_CAMPAIGN_LABEL,
        sources: new Set(),
        mediums: new Set(),
        contacts: 0,
        customers: 0,
        revenue: 0,
      });
    }
    const row = campaignMap.get(key)!;
    row.contacts += 1;
    if (isCustomer(c.journey_stage)) {
      row.customers += 1;
    }
    if (c.utm_source) row.sources.add(c.utm_source as string);
    if (c.utm_medium) row.mediums.add(c.utm_medium as string);
    // Use lifetime_value as base revenue
    row.revenue += Number(c.lifetime_value) || 0;
  }

  // Supplement with orders revenue (for campaigns that may have
  // orders not yet reflected in lifetime_value)
  const orderRevenueByCampaign = new Map<string, number>();
  for (const o of allOrders) {
    const camp = (o.utm_campaign as string | null) ?? "";
    const key = camp || "__null__";
    orderRevenueByCampaign.set(
      key,
      (orderRevenueByCampaign.get(key) ?? 0) + (Number(o.amount) || 0),
    );
  }

  // Use the higher of contacts-based revenue or orders-based revenue
  for (const [key, orderRev] of orderRevenueByCampaign) {
    if (campaignMap.has(key)) {
      const row = campaignMap.get(key)!;
      if (orderRev > row.revenue) {
        row.revenue = orderRev;
      }
    } else {
      // Campaign exists in orders but not in contacts
      const camp =
        key === "__null__" ? NULL_CAMPAIGN_LABEL : key;
      campaignMap.set(key, {
        campaign: camp,
        sources: new Set(),
        mediums: new Set(),
        contacts: 0,
        customers: 0,
        revenue: orderRev,
      });
    }
  }

  // Convert to sorted array
  const campaignRows: CampaignRow[] = Array.from(campaignMap.values())
    .map((r) => ({
      campaign: r.campaign,
      source: Array.from(r.sources).join(", ") || "-",
      medium: Array.from(r.mediums).join(", ") || "-",
      contacts: r.contacts,
      customers: r.customers,
      conversionRate: pctNum(r.customers, r.contacts),
      revenue: r.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Summary stats
  const totalCampaigns = campaignRows.length;
  const activeCampaigns = campaignRows.filter((r) => r.contacts > 0).length;
  const bestByRevenue =
    campaignRows.length > 0 ? campaignRows[0] : null;
  const bestByConversion =
    campaignRows
      .filter((r) => r.contacts >= 3) // Minimum contacts for meaningful rate
      .sort((a, b) => b.conversionRate - a.conversionRate)[0] ?? null;

  // Top 3 campaigns for spotlight
  const top3 = campaignRows.filter((r) => r.revenue > 0).slice(0, 3);
  const maxTop3Revenue = top3.length > 0 ? top3[0].revenue : 1;

  // Campaigns with contacts but 0 customers
  const zeroConversionCampaigns = campaignRows.filter(
    (r) => r.contacts > 0 && r.customers === 0,
  );

  // Max values for table bars
  const maxRevenue =
    campaignRows.length > 0
      ? Math.max(...campaignRows.map((r) => r.revenue))
      : 1;

  return (
    <div>
      <TopBar
        title="Chiến Dịch Marketing"
        subtitle="Đo lường hiệu quả từng chiến dịch"
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header with date filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Megaphone size={20} className="text-[#D4A843]" />
              Hiệu quả chiến dịch
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Phân tích chi tiết hiệu suất từng chiến dịch marketing
            </p>
          </div>
          <form method="GET" className="flex items-center gap-2">
            <input
              type="date"
              name="from"
              defaultValue={dateFrom}
              className="input-dark px-3 py-1.5 text-xs"
            />
            <span className="text-gray-500 text-xs">-&gt;</span>
            <input
              type="date"
              name="to"
              defaultValue={dateTo}
              className="input-dark px-3 py-1.5 text-xs"
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

        {/* A. Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Tổng chiến dịch",
              value: String(totalCampaigns),
              icon: BarChart2,
              color: "#3b82f6",
            },
            {
              label: "Chiến dịch hoạt động",
              value: String(activeCampaigns),
              icon: Target,
              color: "#22c55e",
            },
            {
              label: "Tốt nhất (doanh thu)",
              value: bestByRevenue
                ? bestByRevenue.campaign.length > 20
                  ? bestByRevenue.campaign.slice(0, 20) + "..."
                  : bestByRevenue.campaign
                : "-",
              icon: DollarSign,
              color: "#D4A843",
            },
            {
              label: "Tốt nhất (CV%)",
              value: bestByConversion
                ? bestByConversion.campaign.length > 20
                  ? bestByConversion.campaign.slice(0, 20) + "..."
                  : bestByConversion.campaign
                : "-",
              icon: TrendingUp,
              color: "#a855f7",
            },
          ].map((stat, i) => (
            <div key={i} className="card-dark p-4">
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
                  stat.label.includes("doanh thu") && bestByRevenue
                    ? bestByRevenue.campaign
                    : stat.label.includes("CV") && bestByConversion
                      ? bestByConversion.campaign
                      : undefined
                }
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* C. Top 3 Campaigns Spotlight */}
        {top3.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Award size={16} className="text-[#D4A843]" />
              <h3 className="font-semibold text-white text-sm">
                Top 3 chiến dịch nổi bật
              </h3>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {top3.map((campaign, idx) => {
                const relativeWidth =
                  maxTop3Revenue > 0
                    ? (campaign.revenue / maxTop3Revenue) * 100
                    : 0;
                const rankColors = ["#D4A843", "#9ca3af", "#b87333"];
                const rankColor = rankColors[idx] ?? "#6b7280";

                return (
                  <div key={campaign.campaign} className="card-dark p-5 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{
                              background: rankColor + "20",
                              color: rankColor,
                            }}
                          >
                            {idx + 1}
                          </div>
                          <h4
                            className="text-white font-semibold text-sm truncate"
                            title={campaign.campaign}
                          >
                            {campaign.campaign}
                          </h4>
                        </div>
                        {/* Source badge */}
                        {campaign.source !== "-" && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {campaign.source.split(", ").map((src) => (
                              <span
                                key={src}
                                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium capitalize"
                                style={{
                                  background: getSourceColor(src) + "18",
                                  color: getSourceColor(src),
                                }}
                              >
                                {src}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold text-white">
                          {campaign.contacts}
                        </p>
                        <p className="text-[10px] text-gray-500">Contacts</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-green-400">
                          {campaign.customers}
                        </p>
                        <p className="text-[10px] text-gray-500">Khách hàng</p>
                      </div>
                      <div>
                        <p
                          className="text-lg font-bold"
                          style={{
                            color: conversionColor(campaign.conversionRate).text,
                          }}
                        >
                          {campaign.conversionRate.toFixed(1)}%
                        </p>
                        <p className="text-[10px] text-gray-500">CV%</p>
                      </div>
                    </div>

                    {/* Revenue + relative bar */}
                    <div className="space-y-1.5 pt-2 border-t border-[#2a2a2a]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Doanh thu</span>
                        <span className="text-sm font-bold text-[#D4A843]">
                          {formatVND(campaign.revenue)}
                        </span>
                      </div>
                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{ background: "#1a1a1a" }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${relativeWidth}%`,
                            background: rankColor,
                            minWidth: relativeWidth > 0 ? "4px" : "0",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* B. Campaign Performance Table */}
        <div className="card-dark overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-[#D4A843]" />
              <h3 className="font-semibold text-white text-sm">
                Bảng hiệu quả chiến dịch
              </h3>
            </div>
            <span className="text-xs text-gray-500">
              {campaignRows.length} chiến dịch
            </span>
          </div>

          {campaignRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                    {[
                      "Chiến dịch",
                      "Nguồn",
                      "Medium",
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
                  {campaignRows.map((row, idx) => {
                    const cvColor = conversionColor(row.conversionRate);
                    const isNullCampaign =
                      row.campaign === NULL_CAMPAIGN_LABEL;

                    return (
                      <tr
                        key={row.campaign}
                        className="transition-colors hover:bg-white/[0.02]"
                        style={{
                          borderBottom:
                            idx < campaignRows.length - 1
                              ? "1px solid #2a2a2a"
                              : "none",
                        }}
                      >
                        {/* Campaign name */}
                        <td className="px-4 py-3 max-w-[240px]">
                          <div className="flex items-center gap-2">
                            <Megaphone
                              size={12}
                              className={
                                isNullCampaign
                                  ? "text-gray-600 shrink-0"
                                  : "text-gray-400 shrink-0"
                              }
                            />
                            <span
                              className={`font-medium truncate ${
                                isNullCampaign
                                  ? "text-gray-500 italic"
                                  : "text-white"
                              }`}
                              title={row.campaign}
                            >
                              {isNullCampaign
                                ? "(không có campaign)"
                                : row.campaign}
                            </span>
                          </div>
                        </td>

                        {/* Source */}
                        <td className="px-4 py-3">
                          {row.source !== "-" ? (
                            <div className="flex flex-wrap gap-1">
                              {row.source.split(", ").map((src) => (
                                <span
                                  key={src}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize"
                                  style={{
                                    background: getSourceColor(src) + "18",
                                    color: getSourceColor(src),
                                  }}
                                >
                                  {src}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-600 text-xs">-</span>
                          )}
                        </td>

                        {/* Medium */}
                        <td className="px-4 py-3">
                          {row.medium !== "-" ? (
                            <span className="text-gray-400 text-xs">
                              {row.medium}
                            </span>
                          ) : (
                            <span className="text-gray-600 text-xs">-</span>
                          )}
                        </td>

                        {/* Contacts */}
                        <td className="px-4 py-3">
                          <span className="text-white font-semibold">
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
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              background: cvColor.bg,
                              color: cvColor.text,
                            }}
                          >
                            {row.contacts > 0
                              ? row.conversionRate.toFixed(1) + "%"
                              : "-"}
                          </span>
                        </td>

                        {/* Revenue */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[#D4A843] font-semibold whitespace-nowrap">
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Users size={32} className="mb-3 opacity-50" />
              <p className="text-sm">Chưa có dữ liệu chiến dịch</p>
              <p className="text-xs text-gray-700 mt-1">
                Dữ liệu sẽ xuất hiện khi có contacts với UTM tracking
              </p>
            </div>
          )}
        </div>

        {/* D. Zero-Conversion Campaigns */}
        {zeroConversionCampaigns.length > 0 && (
          <div className="card-dark overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-[#f59e0b]" />
                <h3 className="font-semibold text-white text-sm">
                  Chiến dịch không chuyển đổi
                </h3>
              </div>
              <span className="text-xs text-gray-500">
                {zeroConversionCampaigns.length} chiến dịch
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                    {["Chiến dịch", "Nguồn", "Contacts", "Trạng thái"].map(
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
                  {zeroConversionCampaigns.map((row, idx) => (
                    <tr
                      key={row.campaign}
                      className="transition-colors hover:bg-white/[0.02]"
                      style={{
                        borderBottom:
                          idx < zeroConversionCampaigns.length - 1
                            ? "1px solid #2a2a2a"
                            : "none",
                      }}
                    >
                      <td className="px-4 py-3">
                        <span
                          className="text-white font-medium text-sm truncate block max-w-[240px]"
                          title={row.campaign}
                        >
                          {row.campaign === NULL_CAMPAIGN_LABEL
                            ? "(không có campaign)"
                            : row.campaign}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.source !== "-" ? (
                          <div className="flex flex-wrap gap-1">
                            {row.source.split(", ").map((src) => (
                              <span
                                key={src}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize"
                                style={{
                                  background: getSourceColor(src) + "18",
                                  color: getSourceColor(src),
                                }}
                              >
                                {src}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-600 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white font-semibold">
                          {row.contacts}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{
                            background: "rgba(239,68,68,0.1)",
                            color: "#ef4444",
                          }}
                        >
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: "#ef4444" }}
                          />
                          0 chuyển đổi
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t border-[#2a2a2a]">
              <p className="text-xs text-gray-500">
                Những chiến dịch này có contacts nhưng chưa tạo ra khách hàng nào.
                Cần xem xét tối ưu hoá landing page hoặc định hướng lại chiến dịch.
              </p>
            </div>
          </div>
        )}

        {/* Footer note */}
        <div className="text-center text-xs text-gray-500 py-4">
          Dữ liệu dựa trên UTM parameters từ crm_contacts và orders.
          {dateFrom && dateTo && (
            <span>
              {" "}
              Từ {dateFrom} đến {dateTo}.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
