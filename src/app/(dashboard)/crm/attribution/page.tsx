import { createClient, createAdminClient } from "@/lib/supabase/server";
import TopBar from "@/components/layout/TopBar";
import {
  Target,
  Globe,
  TrendingUp,
  DollarSign,
  Users,
  BarChart2,
  ExternalLink,
} from "lucide-react";
import { redirect } from "next/navigation";

/* ---------- Types ---------- */

interface SourceRow {
  utm_source: string;
  count: number;
  customers: number;
  revenue: number;
  stages: Record<string, number>;
}

interface CampaignRow {
  utm_campaign: string;
  utm_source: string | null;
  utm_medium: string | null;
  count: number;
  customers: number;
  revenue: number;
}

/* ---------- Helpers ---------- */

function formatVND(amount: number): string {
  if (!amount) return "0đ";
  return amount.toLocaleString("vi-VN") + "đ";
}

function pct(n: number, d: number): string {
  if (d === 0) return "0%";
  return (n / d * 100).toFixed(1) + "%";
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
};

const STAGE_COLORS: Record<string, { label: string; color: string }> = {
  visitor: { label: "Visitor", color: "#6b7280" },
  lead: { label: "Lead", color: "#3b82f6" },
  contacted: { label: "Contacted", color: "#f59e0b" },
  qualified: { label: "Qualified", color: "#a855f7" },
  negotiation: { label: "Negotiation", color: "#f97316" },
  customer: { label: "Customer", color: "#22c55e" },
  advocate: { label: "Advocate", color: "#D4A843" },
};

function getSourceColor(source: string): string {
  return SOURCE_COLORS[source.toLowerCase()] ?? "#6b7280";
}

/* ---------- Page ---------- */

export default async function AttributionPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;

  // Auth check
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
    redirect("/");
  }

  // Data queries via admin client
  const adminClient = await createAdminClient();

  // Fetch all contacts with UTM data
  let query = adminClient
    .from("crm_contacts")
    .select("id, utm_source, utm_medium, utm_campaign, journey_stage, lifetime_value, created_at")
    .not("utm_source", "is", null);

  // Date filters
  if (params.from) {
    query = query.gte("created_at", params.from);
  }
  if (params.to) {
    query = query.lte("created_at", params.to + "T23:59:59");
  }

  const { data: contacts } = await query;
  const allContacts = contacts ?? [];

  // Aggregate by source
  const sourceMap = new Map<string, SourceRow>();
  for (const c of allContacts) {
    const src = (c.utm_source as string).toLowerCase();
    if (!sourceMap.has(src)) {
      sourceMap.set(src, { utm_source: src, count: 0, customers: 0, revenue: 0, stages: {} });
    }
    const row = sourceMap.get(src)!;
    row.count += 1;
    if (c.journey_stage === "customer" || c.journey_stage === "advocate") {
      row.customers += 1;
    }
    row.revenue += Number(c.lifetime_value) || 0;
    const stage = c.journey_stage || "lead";
    row.stages[stage] = (row.stages[stage] || 0) + 1;
  }
  const sourceRows = Array.from(sourceMap.values()).sort((a, b) => b.count - a.count);

  // Aggregate by campaign
  const campaignMap = new Map<string, CampaignRow>();
  for (const c of allContacts) {
    const camp = c.utm_campaign as string | null;
    if (!camp) continue;
    if (!campaignMap.has(camp)) {
      campaignMap.set(camp, {
        utm_campaign: camp,
        utm_source: c.utm_source as string | null,
        utm_medium: c.utm_medium as string | null,
        count: 0,
        customers: 0,
        revenue: 0,
      });
    }
    const row = campaignMap.get(camp)!;
    row.count += 1;
    if (c.journey_stage === "customer" || c.journey_stage === "advocate") {
      row.customers += 1;
    }
    row.revenue += Number(c.lifetime_value) || 0;
  }
  const campaignRows = Array.from(campaignMap.values()).sort((a, b) => b.revenue - a.revenue);

  // Summary stats
  const totalTracked = allContacts.length;
  const topSource = sourceRows.length > 0 ? sourceRows[0].utm_source : "—";
  const totalCustomers = sourceRows.reduce((sum, r) => sum + r.customers, 0);
  const overallConversionRate = totalTracked > 0 ? (totalCustomers / totalTracked * 100).toFixed(1) : "0";
  const totalRevenue = sourceRows.reduce((sum, r) => sum + r.revenue, 0);

  // Max values for progress bars
  const maxSourceCount = sourceRows.length > 0 ? Math.max(...sourceRows.map((r) => r.count)) : 1;
  const maxCampaignRevenue = campaignRows.length > 0 ? Math.max(...campaignRows.map((r) => r.revenue)) : 1;

  // Source distribution (percentage)
  const sourceDistribution = sourceRows.map((r) => ({
    ...r,
    percentage: totalTracked > 0 ? (r.count / totalTracked * 100) : 0,
  }));

  return (
    <div>
      <TopBar title="Marketing Attribution" subtitle="Nguồn gốc khách hàng & hiệu quả chiến dịch" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header with date filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Target size={20} className="text-[#D4A843]" />
              Marketing Attribution
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Phân tích nguồn gốc khách hàng từ UTM tracking
            </p>
          </div>
          <form method="GET" className="flex items-center gap-2">
            <input
              type="date"
              name="from"
              defaultValue={params.from || ""}
              className="input-dark px-3 py-1.5 text-xs"
            />
            <span className="text-gray-500 text-xs">→</span>
            <input
              type="date"
              name="to"
              defaultValue={params.to || ""}
              className="input-dark px-3 py-1.5 text-xs"
            />
            <button type="submit" className="btn-green px-3 py-1.5 text-xs font-medium rounded-lg">
              Lọc
            </button>
          </form>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Contacts tracked",
              value: String(totalTracked),
              icon: Users,
              color: "#3b82f6",
            },
            {
              label: "Top source",
              value: topSource.charAt(0).toUpperCase() + topSource.slice(1),
              icon: Globe,
              color: getSourceColor(topSource),
            },
            {
              label: "Conversion rate",
              value: overallConversionRate + "%",
              icon: TrendingUp,
              color: "#22c55e",
            },
            {
              label: "Attributed revenue",
              value: formatVND(totalRevenue),
              icon: DollarSign,
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
              <div className="text-xl font-bold text-white">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Source Distribution - Visual Bar Chart */}
        <div className="card-dark p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={16} className="text-[#D4A843]" />
            <h3 className="font-semibold text-white text-sm">Phân bố nguồn khách hàng</h3>
            <span className="text-xs text-gray-500 ml-auto">{totalTracked} contacts</span>
          </div>

          {sourceDistribution.length > 0 ? (
            <div className="space-y-3">
              {sourceDistribution.map((src) => (
                <div key={src.utm_source} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{ background: getSourceColor(src.utm_source) }}
                      />
                      <span className="text-white font-medium capitalize">
                        {src.utm_source}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-xs">{src.count} contacts</span>
                      <span className="text-white font-semibold text-xs w-12 text-right">
                        {src.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${src.percentage}%`,
                        background: getSourceColor(src.utm_source),
                        minWidth: src.percentage > 0 ? "4px" : "0",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
              Chưa có dữ liệu UTM tracking
            </div>
          )}
        </div>

        {/* Source Breakdown Table */}
        <div className="card-dark overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-[#D4A843]" />
              <h3 className="font-semibold text-white text-sm">Chi tiết theo nguồn</h3>
            </div>
            <span className="text-xs text-gray-500">{sourceRows.length} sources</span>
          </div>

          {sourceRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                    {["Nguồn", "Contacts", "Customers", "Conversion", "Revenue", ""].map((col) => (
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
                  {sourceRows.map((row, idx) => (
                    <tr
                      key={row.utm_source}
                      className="transition-colors hover:bg-white/[0.02]"
                      style={{
                        borderBottom: idx < sourceRows.length - 1 ? "1px solid #2a2a2a" : "none",
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-sm shrink-0"
                            style={{ background: getSourceColor(row.utm_source) }}
                          />
                          <span className="text-white font-medium capitalize">
                            {row.utm_source}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold">{row.count}</span>
                          <div className="flex-1 max-w-[80px]">
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${(row.count / maxSourceCount) * 100}%`,
                                  background: getSourceColor(row.utm_source),
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-green-400 font-semibold">{row.customers}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            background: "rgba(34,197,94,0.1)",
                            color: "#22c55e",
                          }}
                        >
                          {pct(row.customers, row.count)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[#D4A843] font-semibold">
                          {formatVND(row.revenue)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex-1 max-w-[60px]">
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${totalRevenue > 0 ? (row.revenue / totalRevenue) * 100 : 0}%`,
                                background: "#D4A843",
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
              Chưa có dữ liệu nguồn khách hàng
            </div>
          )}
        </div>

        {/* Campaign Performance Table */}
        <div className="card-dark overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-[#D4A843]" />
              <h3 className="font-semibold text-white text-sm">Hiệu quả chiến dịch</h3>
            </div>
            <span className="text-xs text-gray-500">{campaignRows.length} campaigns</span>
          </div>

          {campaignRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                    {["Campaign", "Source / Medium", "Contacts", "Conversions", "Revenue"].map((col) => (
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
                  {campaignRows.map((row, idx) => (
                    <tr
                      key={row.utm_campaign}
                      className="transition-colors hover:bg-white/[0.02]"
                      style={{
                        borderBottom: idx < campaignRows.length - 1 ? "1px solid #2a2a2a" : "none",
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ExternalLink size={12} className="text-gray-500 shrink-0" />
                          <span className="text-white font-medium">{row.utm_campaign}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {row.utm_source && (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize"
                              style={{
                                background: getSourceColor(row.utm_source) + "18",
                                color: getSourceColor(row.utm_source),
                              }}
                            >
                              {row.utm_source}
                            </span>
                          )}
                          {row.utm_medium && (
                            <span className="text-xs text-gray-500">
                              / {row.utm_medium}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white font-semibold">{row.count}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-green-400 font-semibold">{row.customers}</span>
                          <span className="text-xs text-gray-500">
                            ({pct(row.customers, row.count)})
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[#D4A843] font-semibold">
                            {formatVND(row.revenue)}
                          </span>
                          <div className="flex-1 max-w-[60px]">
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${(row.revenue / maxCampaignRevenue) * 100}%`,
                                  background: "#D4A843",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
              Chưa có dữ liệu campaign
            </div>
          )}
        </div>

        {/* Contact Status by Source - Stacked Segments */}
        <div className="card-dark p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-[#D4A843]" />
            <h3 className="font-semibold text-white text-sm">Journey Stage theo nguồn</h3>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-4">
            {Object.entries(STAGE_COLORS).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: cfg.color }} />
                <span className="text-xs text-gray-400">{cfg.label}</span>
              </div>
            ))}
          </div>

          {sourceRows.length > 0 ? (
            <div className="space-y-4">
              {sourceRows.map((row) => {
                const total = row.count;
                return (
                  <div key={row.utm_source} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm"
                          style={{ background: getSourceColor(row.utm_source) }}
                        />
                        <span className="text-sm text-white font-medium capitalize">
                          {row.utm_source}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{total} contacts</span>
                    </div>
                    <div className="h-4 rounded-full overflow-hidden flex" style={{ background: "#1a1a1a" }}>
                      {Object.entries(STAGE_COLORS).map(([stage, cfg]) => {
                        const stageCount = row.stages[stage] || 0;
                        if (stageCount === 0) return null;
                        const widthPct = (stageCount / total) * 100;
                        return (
                          <div
                            key={stage}
                            className="h-full transition-all relative group"
                            style={{
                              width: `${widthPct}%`,
                              background: cfg.color,
                              minWidth: "2px",
                            }}
                            title={`${cfg.label}: ${stageCount} (${widthPct.toFixed(1)}%)`}
                          />
                        );
                      })}
                    </div>
                    {/* Stage counts below bar */}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      {Object.entries(STAGE_COLORS).map(([stage, cfg]) => {
                        const stageCount = row.stages[stage] || 0;
                        if (stageCount === 0) return null;
                        return (
                          <span key={stage} className="text-[11px]" style={{ color: cfg.color }}>
                            {cfg.label}: {stageCount}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
              Chưa có dữ liệu
            </div>
          )}
        </div>

        {/* Footer note */}
        <div className="text-center text-xs text-gray-500 py-4">
          Dữ liệu attribution dựa trên UTM parameters thu thập từ crm_contacts.
          Chỉ hiển thị contacts có utm_source.
        </div>
      </div>
    </div>
  );
}
