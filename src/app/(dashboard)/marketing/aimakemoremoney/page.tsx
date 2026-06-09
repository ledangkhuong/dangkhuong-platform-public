import TopBar from "@/components/layout/TopBar";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Megaphone,
  Users,
  CreditCard,
  Crown,
  Rocket,
  ExternalLink,
  Wrench,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

/* ─── Config ─────────────────────────────────────────────────────── */

const VIP_PRODUCT_ID = "85f21e60-7f21-4f9f-a43d-6a76612bb6c6";
const VVIP_PRODUCT_ID = "d20cf733-0d4c-44fa-8c4a-26ba140614dc";

const VIP_PRICE = 99_000;
const VVIP_PRICE = 499_000;

const SOURCE_COLORS: Record<string, string> = {
  facebook: "#1877F2",
  google: "#EA4335",
  tiktok: "#010101",
  email: "#D4A843",
  zalo: "#0068FF",
  organic: "#22c55e",
  direct: "#6b7280",
  referral: "#a855f7",
  sms: "#ec4899",
};

function sourceColor(s: string | null): string {
  if (!s) return SOURCE_COLORS.direct;
  return SOURCE_COLORS[s.toLowerCase()] ?? "#9ca3af";
}

function formatVND(n: number): string {
  if (!n) return "0đ";
  return n.toLocaleString("vi-VN") + "đ";
}

function pct(n: number, d: number): string {
  if (!d) return "0%";
  return ((n / d) * 100).toFixed(1) + "%";
}

/* ─── Types ──────────────────────────────────────────────────────── */

type Tier = "free" | "vip" | "vvip";

interface Attendee {
  id: string;
  email: string;
  full_name: string;
  tier: Tier;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  created_at: string;
}

interface PaidRow {
  product_id: string;
  email: string | null;
  amount: number;
}

interface ChannelRow {
  source: string;
  medium: string | null;
  campaign: string | null;
  total: number;
  free: number;
  vip: number;
  vvip: number;
  revenue: number;
  paidCount: number;
  conversionToPaid: number;
}

/* ─── Page ───────────────────────────────────────────────────────── */

export default async function AimmDashboardPage() {
  // Auth: admin / manager / marketing only
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
  const allowed = ["admin", "manager", "marketing"];
  if (!profile || !allowed.includes(profile.role)) redirect("/dashboard");

  const admin = await createAdminClient();

  /* ── Pull all attendees ── */
  const { data: rawAttendees } = await admin
    .from("aimm_attendees")
    .select(
      "id, email, full_name, tier, utm_source, utm_medium, utm_campaign, referrer, created_at"
    )
    .order("created_at", { ascending: false });
  const attendees: Attendee[] = (rawAttendees ?? []) as Attendee[];

  /* ── Pull paid orders for the 3 AIMM products ── */
  const { data: paidOrders } = await admin
    .from("orders")
    .select("product_id, email, amount")
    .in("product_id", [VIP_PRODUCT_ID, VVIP_PRODUCT_ID])
    .eq("status", "paid");
  const paid: PaidRow[] = (paidOrders ?? []) as PaidRow[];

  const paidEmailByProduct = new Map<string, Set<string>>();
  paidEmailByProduct.set(VIP_PRODUCT_ID, new Set());
  paidEmailByProduct.set(VVIP_PRODUCT_ID, new Set());
  let vipPaidTotal = 0;
  let vvipPaidTotal = 0;
  for (const o of paid) {
    if (!o.email) continue;
    const e = o.email.toLowerCase();
    paidEmailByProduct.get(o.product_id)?.add(e);
    if (o.product_id === VIP_PRODUCT_ID) vipPaidTotal += o.amount ?? VIP_PRICE;
    else if (o.product_id === VVIP_PRODUCT_ID) vvipPaidTotal += o.amount ?? VVIP_PRICE;
  }

  /* ── Aggregate counts ── */
  const totalAttendees = attendees.length;
  const freeCount = attendees.filter((a) => a.tier === "free").length;
  const vipEnrolled = attendees.filter((a) => a.tier === "vip").length;
  const vvipEnrolled = attendees.filter((a) => a.tier === "vvip").length;

  const vipPaidEmails = paidEmailByProduct.get(VIP_PRODUCT_ID) ?? new Set();
  const vvipPaidEmails = paidEmailByProduct.get(VVIP_PRODUCT_ID) ?? new Set();
  const totalRevenue = vipPaidTotal + vvipPaidTotal;
  const totalPaidCount = vipPaidEmails.size + vvipPaidEmails.size;

  /* ── Group by UTM source ── */
  const sourceMap = new Map<string, ChannelRow>();
  for (const a of attendees) {
    const src = (a.utm_source || "direct").toLowerCase();
    let row = sourceMap.get(src);
    if (!row) {
      row = {
        source: src,
        medium: null,
        campaign: null,
        total: 0,
        free: 0,
        vip: 0,
        vvip: 0,
        revenue: 0,
        paidCount: 0,
        conversionToPaid: 0,
      };
      sourceMap.set(src, row);
    }
    row.total++;
    if (a.tier === "free") row.free++;
    else if (a.tier === "vip") row.vip++;
    else row.vvip++;

    const email = a.email.toLowerCase();
    if (vipPaidEmails.has(email)) {
      row.paidCount++;
      row.revenue += VIP_PRICE;
    }
    if (vvipPaidEmails.has(email)) {
      row.paidCount++;
      row.revenue += VVIP_PRICE;
    }
  }
  for (const row of sourceMap.values()) {
    row.conversionToPaid = row.total ? (row.paidCount / row.total) * 100 : 0;
  }
  const channelRows = Array.from(sourceMap.values()).sort(
    (a, b) => b.revenue - a.revenue || b.total - a.total
  );

  /* ── Group by campaign ── */
  const campaignMap = new Map<string, ChannelRow>();
  for (const a of attendees) {
    const camp = a.utm_campaign?.trim() || "(không có campaign)";
    const key = `${a.utm_source || "direct"}//${camp}`;
    let row = campaignMap.get(key);
    if (!row) {
      row = {
        source: a.utm_source || "direct",
        medium: a.utm_medium,
        campaign: camp,
        total: 0,
        free: 0,
        vip: 0,
        vvip: 0,
        revenue: 0,
        paidCount: 0,
        conversionToPaid: 0,
      };
      campaignMap.set(key, row);
    }
    row.total++;
    if (a.tier === "free") row.free++;
    else if (a.tier === "vip") row.vip++;
    else row.vvip++;

    const email = a.email.toLowerCase();
    if (vipPaidEmails.has(email)) {
      row.paidCount++;
      row.revenue += VIP_PRICE;
    }
    if (vvipPaidEmails.has(email)) {
      row.paidCount++;
      row.revenue += VVIP_PRICE;
    }
  }
  for (const row of campaignMap.values()) {
    row.conversionToPaid = row.total ? (row.paidCount / row.total) * 100 : 0;
  }
  const campaignRows = Array.from(campaignMap.values())
    .sort((a, b) => b.revenue - a.revenue || b.total - a.total)
    .slice(0, 20);

  /* ── Quick UTM template suggestions ── */
  const utmTemplates = [
    {
      label: "Facebook Ads",
      url: "https://dangkhuong.com/aimakemoremoney?utm_source=facebook&utm_medium=cpc&utm_campaign=aimm_jun26&utm_content=ads",
      color: "#1877F2",
    },
    {
      label: "Google Ads",
      url: "https://dangkhuong.com/aimakemoremoney?utm_source=google&utm_medium=cpc&utm_campaign=aimm_jun26&utm_content=search",
      color: "#EA4335",
    },
    {
      label: "Email broadcast",
      url: "https://dangkhuong.com/aimakemoremoney?utm_source=email&utm_medium=email&utm_campaign=aimm_jun26&utm_content=customer_blast",
      color: "#D4A843",
    },
    {
      label: "Zalo OA / nhóm",
      url: "https://dangkhuong.com/aimakemoremoney?utm_source=zalo&utm_medium=oa&utm_campaign=aimm_jun26",
      color: "#0068FF",
    },
    {
      label: "TikTok Ads",
      url: "https://dangkhuong.com/aimakemoremoney?utm_source=tiktok&utm_medium=cpc&utm_campaign=aimm_jun26",
      color: "#010101",
    },
    {
      label: "Facebook organic post",
      url: "https://dangkhuong.com/aimakemoremoney?utm_source=facebook&utm_medium=organic&utm_campaign=aimm_jun26&utm_content=post",
      color: "#1877F2",
    },
  ];

  /* ─── Render ───────────────────────────────────────────────────── */
  return (
    <div>
      <TopBar
        title="AI Make More Money & Freedom — Dashboard"
        subtitle="Đo lường nguồn data, doanh số theo từng kênh quảng cáo cho event 12-14/06"
      />

      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        {/* KPI overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            icon={Users}
            label="Tổng đăng ký"
            value={totalAttendees.toLocaleString("vi-VN")}
            sub={`${freeCount} Free · ${vipEnrolled} VIP · ${vvipEnrolled} VVIP`}
            color="#3b82f6"
          />
          <StatCard
            icon={CreditCard}
            label="Đã thanh toán"
            value={totalPaidCount.toLocaleString("vi-VN")}
            sub={`${vipPaidEmails.size} VIP · ${vvipPaidEmails.size} VVIP`}
            color="#22c55e"
          />
          <StatCard
            icon={Crown}
            label="Doanh thu"
            value={formatVND(totalRevenue)}
            sub={`VIP ${formatVND(vipPaidTotal)} · VVIP ${formatVND(vvipPaidTotal)}`}
            color="#D4A843"
          />
          <StatCard
            icon={Rocket}
            label="Conversion → trả phí"
            value={pct(totalPaidCount, totalAttendees)}
            sub={`${totalPaidCount} / ${totalAttendees} đăng ký`}
            color="#a855f7"
          />
        </div>

        {/* UTM templates — ready to copy */}
        <div className="card-dark p-4 sm:p-5">
          <div className="flex items-start gap-3 mb-4">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgba(212,168,67,0.1)" }}
            >
              <Sparkles size={18} className="text-[#D4A843]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-white">
                Link UTM sẵn dùng — copy + dán cho từng kênh
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Dùng các link này thay vì link gốc <code className="text-[#D4A843]">dangkhuong.com/aimakemoremoney</code>{" "}
                để hệ thống tự gắn nguồn vào mỗi khách. Sửa{" "}
                <code>utm_campaign</code> mỗi đợt chạy (vd:{" "}
                <code>aimm_jul26</code>) để tách riêng.
              </p>
            </div>
            <Link
              href="/marketing/utm-builder"
              className="text-xs text-gray-400 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5 shrink-0"
            >
              <Wrench size={12} /> UTM Builder
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {utmTemplates.map((t) => (
              <div
                key={t.label}
                className="rounded-lg p-3 flex items-start gap-3"
                style={{
                  background: "#0d0d0d",
                  border: `1px solid ${t.color}25`,
                }}
              >
                <div
                  className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                  style={{ background: t.color }}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs font-bold uppercase tracking-wide mb-1"
                    style={{ color: t.color }}
                  >
                    {t.label}
                  </div>
                  <code className="block text-[11px] text-gray-300 break-all leading-relaxed">
                    {t.url}
                  </code>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-gray-500 mt-4 leading-relaxed">
            💡 <strong className="text-gray-300">Mẹo</strong>: dùng cùng <code className="text-[#D4A843]">utm_campaign</code> cho 1 đợt sale
            để gom kết quả. <code>utm_source</code> = nền tảng (facebook/google/zalo…). <code>utm_medium</code> = loại traffic (cpc/organic/email…).
            <code>utm_content</code> = phân biệt creative / list / link cụ thể trong cùng campaign.
          </p>
        </div>

        {/* Channel breakdown */}
        <div className="card-dark overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Megaphone size={16} className="text-[#D4A843]" /> Hiệu suất theo kênh
              (<code className="text-[#D4A843]">utm_source</code>)
            </h2>
            <span className="text-xs text-gray-500">
              {channelRows.length} kênh
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead className="text-xs text-gray-400 uppercase tracking-wider">
                <tr className="border-b border-[#2a2a2a]">
                  <th className="text-left p-3 font-semibold">Kênh</th>
                  <th className="text-right p-3 font-semibold">Đăng ký</th>
                  <th className="text-right p-3 font-semibold">Free</th>
                  <th className="text-right p-3 font-semibold">VIP enroll</th>
                  <th className="text-right p-3 font-semibold">VVIP enroll</th>
                  <th className="text-right p-3 font-semibold">Đã TT</th>
                  <th className="text-right p-3 font-semibold">CR → TT</th>
                  <th className="text-right p-3 font-semibold">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {channelRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-8 text-center text-sm text-gray-500"
                    >
                      Chưa có dữ liệu. Đăng ký đầu tiên có UTM sẽ hiện ngay tại đây.
                    </td>
                  </tr>
                ) : (
                  channelRows.map((r) => (
                    <tr
                      key={r.source}
                      className="border-b border-[#1a1a1a] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ background: sourceColor(r.source) }}
                          />
                          <span className="font-semibold text-white">
                            {r.source}
                          </span>
                        </div>
                      </td>
                      <td className="text-right p-3 font-mono tabular-nums text-white">
                        {r.total}
                      </td>
                      <td className="text-right p-3 font-mono tabular-nums text-gray-400">
                        {r.free}
                      </td>
                      <td className="text-right p-3 font-mono tabular-nums text-[#D4A843]">
                        {r.vip}
                      </td>
                      <td className="text-right p-3 font-mono tabular-nums text-[#22c55e]">
                        {r.vvip}
                      </td>
                      <td className="text-right p-3 font-mono tabular-nums text-green-400">
                        {r.paidCount}
                      </td>
                      <td className="text-right p-3">
                        <span
                          className="inline-block px-2 py-0.5 rounded-md text-xs font-semibold"
                          style={{
                            background:
                              r.conversionToPaid >= 10
                                ? "rgba(34,197,94,0.1)"
                                : r.conversionToPaid >= 5
                                  ? "rgba(245,158,11,0.1)"
                                  : "rgba(239,68,68,0.1)",
                            color:
                              r.conversionToPaid >= 10
                                ? "#22c55e"
                                : r.conversionToPaid >= 5
                                  ? "#f59e0b"
                                  : "#ef4444",
                          }}
                        >
                          {r.conversionToPaid.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-right p-3 font-mono tabular-nums font-bold text-[#D4A843]">
                        {formatVND(r.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Campaign breakdown */}
        <div className="card-dark overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Megaphone size={16} className="text-[#D4A843]" /> Top campaign
              (<code className="text-[#D4A843]">utm_campaign</code>)
            </h2>
            <span className="text-xs text-gray-500">
              Top {campaignRows.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead className="text-xs text-gray-400 uppercase tracking-wider">
                <tr className="border-b border-[#2a2a2a]">
                  <th className="text-left p-3 font-semibold">Campaign</th>
                  <th className="text-left p-3 font-semibold">Source</th>
                  <th className="text-left p-3 font-semibold">Medium</th>
                  <th className="text-right p-3 font-semibold">Đăng ký</th>
                  <th className="text-right p-3 font-semibold">Đã TT</th>
                  <th className="text-right p-3 font-semibold">CR</th>
                  <th className="text-right p-3 font-semibold">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {campaignRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-sm text-gray-500"
                    >
                      Chưa có campaign nào. Đăng ký đầu tiên có{" "}
                      <code>utm_campaign</code> sẽ hiện ngay.
                    </td>
                  </tr>
                ) : (
                  campaignRows.map((r, i) => (
                    <tr
                      key={i}
                      className="border-b border-[#1a1a1a] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="p-3 text-white font-medium truncate max-w-xs">
                        {r.campaign}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ background: sourceColor(r.source) }}
                          />
                          <span className="text-gray-300">{r.source}</span>
                        </div>
                      </td>
                      <td className="p-3 text-gray-400">{r.medium || "—"}</td>
                      <td className="text-right p-3 font-mono tabular-nums text-white">
                        {r.total}
                      </td>
                      <td className="text-right p-3 font-mono tabular-nums text-green-400">
                        {r.paidCount}
                      </td>
                      <td className="text-right p-3 font-mono tabular-nums text-gray-300">
                        {r.conversionToPaid.toFixed(1)}%
                      </td>
                      <td className="text-right p-3 font-mono tabular-nums font-bold text-[#D4A843]">
                        {formatVND(r.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cross-links */}
        <div className="card-dark p-4 sm:p-5">
          <h3 className="text-sm font-bold text-white mb-3">
            Đào sâu thêm
          </h3>
          <div className="flex flex-wrap gap-2">
            <CrossLink
              href="/marketing/attribution"
              label="UTM Attribution tổng (cả site)"
            />
            <CrossLink
              href="/marketing/campaigns"
              label="So sánh tất cả campaign"
            />
            <CrossLink
              href="/marketing/channels"
              label="Hiệu suất 9 kênh marketing"
            />
            <CrossLink
              href="/marketing/utm-builder"
              label="Tạo link UTM tuỳ chỉnh"
            />
            <CrossLink
              href="/aimakemoremoney"
              label="Mở landing page"
              external
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── UI helpers ────────────────────────────────────────────────── */

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="card-dark p-4">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15` }}
        >
          <Icon size={14} style={{ color }} />
        </div>
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <div className="text-2xl font-extrabold text-white leading-none">
        {value}
      </div>
      <div className="text-[11px] text-gray-500 mt-1.5 leading-tight">
        {sub}
      </div>
    </div>
  );
}

function CrossLink({
  href,
  label,
  external,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
    >
      {label}
      <ExternalLink size={11} />
    </Link>
  );
}
