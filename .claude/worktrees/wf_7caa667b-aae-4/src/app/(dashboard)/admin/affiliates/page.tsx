import TopBar from "@/components/layout/TopBar";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  Users, TrendingUp, Wallet, MousePointerClick,
  ShoppingCart, CheckCircle, Clock, Ban,
} from "lucide-react";
import EditCommissionForm from "@/components/affiliate/EditCommissionForm";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AffiliateRow {
  id: string;
  ref_code: string;
  status: string;
  commission_rate: number;
  total_clicks: number;
  total_conversions: number;
  total_earned: number;
  total_paid: number;
  created_at: string;
  profiles: { full_name: string | null } | null;
}

interface AffOrderRow {
  id: string;
  order_code: string;
  customer_name: string | null;
  amount: number;
  status: string;
  ref_code: string | null;
  created_at: string;
  products: { title: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return amount.toLocaleString("vi-VN") + "đ";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string; icon: React.ElementType }> = {
  active: { bg: "rgba(212,168,67,0.1)", color: "#D4A843", label: "Hoạt động", icon: CheckCircle },
  pending: { bg: "rgba(234,179,8,0.1)", color: "#eab308", label: "Chờ duyệt", icon: Clock },
  suspended: { bg: "rgba(239,68,68,0.1)", color: "#ef4444", label: "Tạm khoá", icon: Ban },
  rejected: { bg: "rgba(107,114,128,0.1)", color: "#6b7280", label: "Từ chối", icon: Ban },
};

const ORDER_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  paid: { bg: "rgba(34,197,94,0.1)", color: "#22c55e", label: "Đã thanh toán" },
  pending: { bg: "rgba(234,179,8,0.1)", color: "#eab308", label: "Chờ thanh toán" },
  cancelled: { bg: "rgba(239,68,68,0.1)", color: "#ef4444", label: "Đã huỷ" },
  refunded: { bg: "rgba(107,114,128,0.1)", color: "#6b7280", label: "Hoàn tiền" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminAffiliatesPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "manager"].includes(profile.role)) redirect("/dashboard");

  const admin = await createAdminClient();

  // Fetch all affiliates with profile info
  const { data: affiliates } = await admin
    .from("affiliates")
    .select("*, profiles:user_id(full_name)")
    .order("created_at", { ascending: false });

  const rows = (affiliates || []) as unknown as AffiliateRow[];

  // Stats
  const totalAffiliates = rows.length;
  const activeAffiliates = rows.filter(a => a.status === "active").length;
  const totalEarned = rows.reduce((sum, a) => sum + (a.total_earned || 0), 0);
  const totalPaid = rows.reduce((sum, a) => sum + (a.total_paid || 0), 0);
  const totalClicks = rows.reduce((sum, a) => sum + (a.total_clicks || 0), 0);
  const totalConversions = rows.reduce((sum, a) => sum + (a.total_conversions || 0), 0);

  // Pending payouts
  const { count: pendingPayouts } = await admin
    .from("affiliate_payouts")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  // Pending conversions
  const { count: pendingConversions } = await admin
    .from("affiliate_conversions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  // All ref codes from affiliates
  const allRefCodes = rows.map(r => r.ref_code).filter(Boolean);

  // Fetch orders that came via affiliate ref codes
  let affOrders: AffOrderRow[] = [];
  if (allRefCodes.length > 0) {
    const { data: orderData } = await admin
      .from("orders")
      .select("id, order_code, customer_name, amount, status, ref_code, created_at, products(title)")
      .in("ref_code", allRefCodes)
      .order("created_at", { ascending: false })
      .limit(50);
    affOrders = (orderData || []) as unknown as AffOrderRow[];
  }

  // Build ref_code → affiliate name map
  const refToName: Record<string, string> = {};
  for (const r of rows) {
    refToName[r.ref_code] = (r.profiles as { full_name: string | null } | null)?.full_name || "—";
  }

  const paidAffOrders = affOrders.filter(o => o.status === "paid");
  const pendingAffOrders = affOrders.filter(o => o.status === "pending");

  return (
    <>
      <TopBar title="Quản lý Affiliate" />
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

        {/* Notification */}
        {params.updated === "1" && (
          <div className="p-3 rounded-lg text-sm text-amber-400 border border-amber-400/20" style={{ background: "rgba(212,168,67,0.08)" }}>
            Đã cập nhật tỷ lệ hoa hồng thành công.
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Users} label="Tổng Affiliate" value={totalAffiliates.toString()} sub={`${activeAffiliates} hoạt động`} color="#3b82f6" />
          <StatCard icon={MousePointerClick} label="Tổng Clicks" value={totalClicks.toLocaleString("vi-VN")} sub={`${totalConversions} conversions`} color="#a855f7" />
          <StatCard icon={Wallet} label="Hoa hồng đã trả" value={formatCurrency(totalPaid)} sub={`Tổng: ${formatCurrency(totalEarned)}`} color="#D4A843" />
          <StatCard icon={Clock} label="Chờ xử lý" value={`${pendingConversions || 0} đơn`} sub={`${pendingPayouts || 0} yêu cầu rút`} color="#f59e0b" />
        </div>

        {/* Affiliates table */}
        <div className="card-dark p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Users size={16} className="text-[#3b82f6]" />
              Danh sách Affiliate ({totalAffiliates})
            </h3>
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Chưa có affiliate nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 text-xs border-b border-[#1f1f1f]">
                    <th className="pb-2 font-medium">Affiliate</th>
                    <th className="pb-2 font-medium">Mã</th>
                    <th className="pb-2 font-medium">Trạng thái</th>
                    <th className="pb-2 font-medium text-right">Clicks</th>
                    <th className="pb-2 font-medium text-right">Đơn</th>
                    <th className="pb-2 font-medium text-right">Hoa hồng</th>
                    <th className="pb-2 font-medium text-right">Đã trả</th>
                    <th className="pb-2 font-medium text-center">Tỷ lệ %</th>
                    <th className="pb-2 font-medium">Ngày ĐK</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((aff) => {
                    const statusCfg = STATUS_CONFIG[aff.status] || STATUS_CONFIG.pending;
                    const name = (aff.profiles as { full_name: string | null } | null)?.full_name || "—";
                    return (
                      <tr key={aff.id} className="border-b border-[#1a1a1a] hover:bg-[#111]">
                        <td className="py-2.5 text-white font-medium">{name}</td>
                        <td className="py-2.5">
                          <code className="text-xs text-[#D4A843] bg-[#D4A843]/10 px-1.5 py-0.5 rounded">{aff.ref_code}</code>
                        </td>
                        <td className="py-2.5">
                          <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: statusCfg.bg, color: statusCfg.color }}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-gray-300">{aff.total_clicks?.toLocaleString("vi-VN") || 0}</td>
                        <td className="py-2.5 text-right text-gray-300">{aff.total_conversions || 0}</td>
                        <td className="py-2.5 text-right text-[#D4A843] font-medium">{formatCurrency(aff.total_earned || 0)}</td>
                        <td className="py-2.5 text-right text-gray-400">{formatCurrency(aff.total_paid || 0)}</td>
                        <td className="py-2.5 text-center">
                          <EditCommissionForm affiliateId={aff.id} currentRate={aff.commission_rate} />
                        </td>
                        <td className="py-2.5 text-gray-500 text-xs">{formatDate(aff.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* Affiliate orders */}
        <div className="card-dark p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShoppingCart size={16} className="text-[#a855f7]" />
              Đơn hàng từ Affiliate ({affOrders.length})
            </h3>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-[#D4A843]">
                <CheckCircle size={12} /> {paidAffOrders.length} đã TT
              </span>
              <span className="flex items-center gap-1 text-[#eab308]">
                <Clock size={12} /> {pendingAffOrders.length} chờ TT
              </span>
            </div>
          </div>

          {affOrders.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Chưa có đơn hàng nào từ affiliate.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 text-xs border-b border-[#1f1f1f]">
                    <th className="pb-2 font-medium">Mã đơn</th>
                    <th className="pb-2 font-medium">Khách hàng</th>
                    <th className="pb-2 font-medium">Sản phẩm</th>
                    <th className="pb-2 font-medium text-right">Giá trị</th>
                    <th className="pb-2 font-medium">Trạng thái</th>
                    <th className="pb-2 font-medium">Affiliate</th>
                    <th className="pb-2 font-medium">Mã ref</th>
                    <th className="pb-2 font-medium">Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {affOrders.map((order) => {
                    const osCfg = ORDER_STATUS[order.status] || ORDER_STATUS.pending;
                    const affName = order.ref_code ? (refToName[order.ref_code] || "—") : "—";
                    return (
                      <tr key={order.id} className="border-b border-[#1a1a1a] hover:bg-[#111]">
                        <td className="py-2.5">
                          <code className="text-xs text-[#a855f7] bg-[#a855f7]/10 px-1.5 py-0.5 rounded">DK{order.order_code}</code>
                        </td>
                        <td className="py-2.5 text-white">{order.customer_name || "—"}</td>
                        <td className="py-2.5 text-gray-300 max-w-[200px] truncate">
                          {(order.products as { title: string } | null)?.title || "—"}
                        </td>
                        <td className="py-2.5 text-right text-white font-medium">{formatCurrency(order.amount)}</td>
                        <td className="py-2.5">
                          <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: osCfg.bg, color: osCfg.color }}>
                            {osCfg.label}
                          </span>
                        </td>
                        <td className="py-2.5 text-gray-300">{affName}</td>
                        <td className="py-2.5">
                          <code className="text-xs text-[#D4A843] bg-[#D4A843]/10 px-1.5 py-0.5 rounded">{order.ref_code}</code>
                        </td>
                        <td className="py-2.5 text-gray-500 text-xs">{formatDate(order.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="card-dark p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} style={{ color }} />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{sub}</div>
    </div>
  );
}
