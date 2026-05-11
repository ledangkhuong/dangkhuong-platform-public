import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  MousePointerClick, ShoppingCart, Wallet,
  TrendingUp, Link2, Banknote, Users, Clock,
} from "lucide-react";
import { registerAsAffiliate, updateAffiliateBankInfo, requestPayout, changeRefCode } from "@/lib/actions/affiliate";
import CopyRefLink from "@/components/affiliate/CopyRefLink";
import ChangeRefCodeForm from "@/components/affiliate/ChangeRefCodeForm";

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AffiliateDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    registered?: string; error?: string; saved?: string; payout_requested?: string; code_changed?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check if user is an affiliate
  const admin = await createAdminClient();
  const { data: affiliate } = await admin
    .from("affiliates")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Fetch conversions if affiliate
  let conversions: Array<{
    id: string; order_amount: number; commission_amount: number;
    commission_rate: number; status: string; created_at: string;
    products: { name: string } | null;
  }> = [];
  let payouts: Array<{
    id: string; amount: number; status: string; created_at: string;
  }> = [];
  let referredCustomers: Array<{ full_name: string | null; created_at: string }> = [];
  let pendingOrders: Array<{ full_name: string | null; order_code: string; created_at: string }> = [];

  if (affiliate) {
    const { data: convData } = await admin
      .from("affiliate_conversions")
      .select("*, products:product_id(name)")
      .eq("affiliate_id", affiliate.id)
      .order("created_at", { ascending: false })
      .limit(20);
    conversions = convData || [];

    const { data: payoutData } = await admin
      .from("affiliate_payouts")
      .select("*")
      .eq("affiliate_id", affiliate.id)
      .order("created_at", { ascending: false })
      .limit(10);
    payouts = payoutData || [];

    // Fetch customers who registered via this affiliate's ref code (from affiliate_clicks → user registered)
    // We look at orders with this ref_code to find unique customers (name only)
    const { data: customerData } = await admin
      .from("orders")
      .select("profiles:user_id(full_name), created_at")
      .eq("ref_code", affiliate.ref_code)
      .order("created_at", { ascending: false })
      .limit(50);
    if (customerData) {
      const seen = new Set<string>();
      for (const row of customerData as unknown as Array<{ profiles: { full_name: string | null } | null; created_at: string }>) {
        const name = row.profiles?.full_name || "Ẩn danh";
        if (!seen.has(name)) {
          seen.add(name);
          referredCustomers.push({ full_name: name, created_at: row.created_at });
        }
      }
    }

    // Fetch pending orders (only name + order_code)
    const { data: pendingData } = await admin
      .from("orders")
      .select("order_code, profiles:user_id(full_name), created_at")
      .eq("ref_code", affiliate.ref_code)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(20);
    if (pendingData) {
      pendingOrders = (pendingData as unknown as Array<{ order_code: string; profiles: { full_name: string | null } | null; created_at: string }>).map(row => ({
        full_name: row.profiles?.full_name || "Ẩn danh",
        order_code: row.order_code,
        created_at: row.created_at,
      }));
    }
  }

  const available = affiliate ? (affiliate.total_earned || 0) - (affiliate.total_paid || 0) : 0;
  const conversionRate = affiliate && affiliate.total_clicks > 0
    ? ((affiliate.total_conversions / affiliate.total_clicks) * 100).toFixed(1)
    : "0";

  const origin = "https://dangkhuong.com";

  return (
    <>
      <TopBar title="Affiliate" />
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">

        {/* Notifications */}
        {params.registered === "1" && (
          <div className="p-3 rounded-lg text-sm text-green-400 border border-green-400/20" style={{ background: "rgba(34,197,94,0.08)" }}>
            Chúc mừng! Bạn đã đăng ký thành công. Hãy chia sẻ link giới thiệu bên dưới!
          </div>
        )}
        {params.saved === "1" && (
          <div className="p-3 rounded-lg text-sm text-green-400 border border-green-400/20" style={{ background: "rgba(34,197,94,0.08)" }}>
            Đã cập nhật thông tin ngân hàng.
          </div>
        )}
        {params.payout_requested === "1" && (
          <div className="p-3 rounded-lg text-sm text-green-400 border border-green-400/20" style={{ background: "rgba(34,197,94,0.08)" }}>
            Yêu cầu rút tiền đã được gửi. Admin sẽ xử lý trong 1-3 ngày làm việc.
          </div>
        )}
        {params.error === "min_payout" && (
          <div className="p-3 rounded-lg text-sm text-red-400 border border-red-400/20" style={{ background: "rgba(239,68,68,0.08)" }}>
            Số dư chưa đủ 200,000đ để rút. Tiếp tục chia sẻ link giới thiệu!
          </div>
        )}
        {params.error === "no_bank" && (
          <div className="p-3 rounded-lg text-sm text-red-400 border border-red-400/20" style={{ background: "rgba(239,68,68,0.08)" }}>
            Vui lòng cập nhật thông tin ngân hàng trước khi yêu cầu rút tiền.
          </div>
        )}
        {params.error === "invalid_code" && (
          <div className="p-3 rounded-lg text-sm text-red-400 border border-red-400/20" style={{ background: "rgba(239,68,68,0.08)" }}>
            Mã giới thiệu không hợp lệ. Yêu cầu: 4-20 ký tự, chỉ chữ và số (A-Z, 0-9).
          </div>
        )}
        {params.error === "code_taken" && (
          <div className="p-3 rounded-lg text-sm text-red-400 border border-red-400/20" style={{ background: "rgba(239,68,68,0.08)" }}>
            Mã giới thiệu này đã được sử dụng. Vui lòng chọn mã khác.
          </div>
        )}
        {params.code_changed === "1" && (
          <div className="p-3 rounded-lg text-sm text-green-400 border border-green-400/20" style={{ background: "rgba(34,197,94,0.08)" }}>
            Đã thay đổi mã giới thiệu thành công!
          </div>
        )}

        {/* Not yet an affiliate → Registration form */}
        {!affiliate ? (
          <div className="card-dark p-6 sm:p-8 max-w-lg mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 text-2xl" style={{ background: "rgba(34,197,94,0.1)" }}>
                <Link2 size={28} className="text-[#22c55e]" />
              </div>
              <h2 className="text-xl font-bold text-white">Tham gia chương trình Affiliate</h2>
              <p className="text-gray-400 text-sm mt-2">
                Giới thiệu khoá học cho bạn bè và nhận <span className="text-[#22c55e] font-semibold">20% hoa hồng</span> mỗi đơn hàng.
              </p>
            </div>

            <div className="space-y-3 mb-6 text-sm text-gray-300">
              <div className="flex items-start gap-3">
                <MousePointerClick size={18} className="text-[#22c55e] mt-0.5 shrink-0" />
                <span>Nhận link giới thiệu gắn vào bất kỳ trang nào (blog, landing page, khoá học)</span>
              </div>
              <div className="flex items-start gap-3">
                <ShoppingCart size={18} className="text-[#22c55e] mt-0.5 shrink-0" />
                <span>Cookie tracking 90 ngày — khách mua sau vẫn tính hoa hồng</span>
              </div>
              <div className="flex items-start gap-3">
                <Wallet size={18} className="text-[#22c55e] mt-0.5 shrink-0" />
                <span>Rút tiền qua chuyển khoản ngân hàng, tối thiểu 200,000đ</span>
              </div>
            </div>

            <form action={registerAsAffiliate} className="space-y-4">
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Thông tin nhận tiền (tuỳ chọn, có thể thêm sau)</div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Ngân hàng</label>
                <input name="bank_name" placeholder="VD: Vietcombank" className="input-dark w-full" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Số tài khoản</label>
                <input name="bank_account" placeholder="Số tài khoản ngân hàng" className="input-dark w-full" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Tên chủ tài khoản</label>
                <input name="bank_holder" placeholder="Tên in trên thẻ ngân hàng" className="input-dark w-full" />
              </div>
              <button type="submit" className="btn-green w-full justify-center py-2.5 mt-2">
                Đăng ký làm Affiliate
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Affiliate Dashboard */}

            {/* Referral Link */}
            <div className="card-dark p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Link2 size={16} className="text-[#22c55e]" />
                  Link giới thiệu của bạn
                </h3>
                <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>
                  {affiliate.ref_code}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={`${origin}?ref=${affiliate.ref_code}`}
                  className="input-dark flex-1 text-sm"
                />
                <CopyRefLink text={`${origin}?ref=${affiliate.ref_code}`} />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Gắn <code className="text-[#22c55e]">?ref={affiliate.ref_code}</code> vào bất kỳ URL nào trên dangkhuong.com
              </p>
              {/* Change ref code */}
              <ChangeRefCodeForm currentCode={affiliate.ref_code} />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={MousePointerClick} label="Clicks" value={affiliate.total_clicks?.toLocaleString("vi-VN") || "0"} color="#3b82f6" />
              <StatCard icon={ShoppingCart} label="Đơn hàng" value={affiliate.total_conversions?.toString() || "0"} color="#a855f7" />
              <StatCard icon={TrendingUp} label="Tỷ lệ chuyển đổi" value={`${conversionRate}%`} color="#f59e0b" />
              <StatCard icon={Wallet} label="Khả dụng" value={formatCurrency(available)} color="#22c55e" />
            </div>

            {/* Earnings summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="card-dark p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">Tổng hoa hồng</div>
                <div className="text-lg font-bold text-white">{formatCurrency(affiliate.total_earned || 0)}</div>
              </div>
              <div className="card-dark p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">Đã thanh toán</div>
                <div className="text-lg font-bold text-[#22c55e]">{formatCurrency(affiliate.total_paid || 0)}</div>
              </div>
              <div className="card-dark p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">Tỷ lệ hoa hồng</div>
                <div className="text-lg font-bold text-[#f59e0b]">{affiliate.commission_rate}%</div>
              </div>
            </div>

            {/* Payout request */}
            {available >= 200000 && affiliate.bank_account && (
              <div className="card-dark p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">Số dư khả dụng: <span className="text-[#22c55e]">{formatCurrency(available)}</span></div>
                  <div className="text-xs text-gray-500">Chuyển về {affiliate.bank_name} - {affiliate.bank_account}</div>
                </div>
                <form action={requestPayout}>
                  <button type="submit" className="btn-green text-sm py-2 px-4">
                    <Banknote size={16} className="mr-1.5" /> Yêu cầu rút tiền
                  </button>
                </form>
              </div>
            )}

            {/* Recent conversions */}
            <div className="card-dark p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <ShoppingCart size={16} className="text-[#a855f7]" />
                Đơn hàng gần đây
              </h3>
              {conversions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">Chưa có đơn hàng nào qua link giới thiệu.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 text-xs border-b border-[#1f1f1f]">
                        <th className="pb-2 font-medium">Sản phẩm</th>
                        <th className="pb-2 font-medium">Giá trị đơn</th>
                        <th className="pb-2 font-medium">Hoa hồng</th>
                        <th className="pb-2 font-medium">Trạng thái</th>
                        <th className="pb-2 font-medium">Thời gian</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conversions.map((c) => (
                        <tr key={c.id} className="border-b border-[#1a1a1a]">
                          <td className="py-2.5 text-gray-300">{(c.products as { name: string } | null)?.name || "—"}</td>
                          <td className="py-2.5 text-white">{formatCurrency(c.order_amount)}</td>
                          <td className="py-2.5 text-[#22c55e] font-medium">{formatCurrency(c.commission_amount)}</td>
                          <td className="py-2.5">
                            <StatusBadge status={c.status} />
                          </td>
                          <td className="py-2.5 text-gray-500 text-xs">{formatDate(c.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pending orders */}
            {pendingOrders.length > 0 && (
              <div className="card-dark p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Clock size={16} className="text-[#f59e0b]" />
                  Đơn hàng chờ xử lý ({pendingOrders.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 text-xs border-b border-[#1f1f1f]">
                        <th className="pb-2 font-medium">Khách hàng</th>
                        <th className="pb-2 font-medium">Mã đơn</th>
                        <th className="pb-2 font-medium">Thời gian</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingOrders.map((o, i) => (
                        <tr key={i} className="border-b border-[#1a1a1a]">
                          <td className="py-2.5 text-gray-300">{o.full_name}</td>
                          <td className="py-2.5">
                            <code className="text-xs text-[#f59e0b] bg-[#f59e0b]/10 px-1.5 py-0.5 rounded">DK{o.order_code}</code>
                          </td>
                          <td className="py-2.5 text-gray-500 text-xs">{formatDate(o.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Referred customers */}
            {referredCustomers.length > 0 && (
              <div className="card-dark p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Users size={16} className="text-[#3b82f6]" />
                  Khách hàng đã giới thiệu ({referredCustomers.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 text-xs border-b border-[#1f1f1f]">
                        <th className="pb-2 font-medium">Tên</th>
                        <th className="pb-2 font-medium">Ngày</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referredCustomers.map((c, i) => (
                        <tr key={i} className="border-b border-[#1a1a1a]">
                          <td className="py-2.5 text-gray-300">{c.full_name}</td>
                          <td className="py-2.5 text-gray-500 text-xs">{formatDate(c.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Bank info update */}
            <div className="card-dark p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Banknote size={16} className="text-[#f59e0b]" />
                Thông tin nhận tiền
              </h3>
              <form action={updateAffiliateBankInfo} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Ngân hàng</label>
                  <input name="bank_name" defaultValue={affiliate.bank_name || ""} placeholder="VD: Vietcombank" className="input-dark w-full" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Số tài khoản</label>
                  <input name="bank_account" defaultValue={affiliate.bank_account || ""} className="input-dark w-full" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tên chủ TK</label>
                  <input name="bank_holder" defaultValue={affiliate.bank_holder || ""} className="input-dark w-full" />
                </div>
                <div className="sm:col-span-3">
                  <button type="submit" className="btn-green text-sm py-2 px-4">Cập nhật</button>
                </div>
              </form>
            </div>

            {/* Payouts history */}
            {payouts.length > 0 && (
              <div className="card-dark p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Wallet size={16} className="text-[#22c55e]" />
                  Lịch sử rút tiền
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 text-xs border-b border-[#1f1f1f]">
                        <th className="pb-2 font-medium">Số tiền</th>
                        <th className="pb-2 font-medium">Trạng thái</th>
                        <th className="pb-2 font-medium">Ngày yêu cầu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map((p) => (
                        <tr key={p.id} className="border-b border-[#1a1a1a]">
                          <td className="py-2.5 text-white font-medium">{formatCurrency(p.amount)}</td>
                          <td className="py-2.5"><PayoutStatusBadge status={p.status} /></td>
                          <td className="py-2.5 text-gray-500 text-xs">{formatDate(p.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color: string;
}) {
  return (
    <div className="card-dark p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} style={{ color }} />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: "rgba(234,179,8,0.1)", color: "#eab308", label: "Chờ duyệt" },
    approved: { bg: "rgba(34,197,94,0.1)", color: "#22c55e", label: "Đã duyệt" },
    paid: { bg: "rgba(59,130,246,0.1)", color: "#3b82f6", label: "Đã trả" },
    rejected: { bg: "rgba(239,68,68,0.1)", color: "#ef4444", label: "Từ chối" },
  };
  const c = config[status] || config.pending;
  return (
    <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

function PayoutStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: "rgba(234,179,8,0.1)", color: "#eab308", label: "Đang chờ" },
    processing: { bg: "rgba(59,130,246,0.1)", color: "#3b82f6", label: "Đang xử lý" },
    completed: { bg: "rgba(34,197,94,0.1)", color: "#22c55e", label: "Hoàn tất" },
    failed: { bg: "rgba(239,68,68,0.1)", color: "#ef4444", label: "Thất bại" },
  };
  const c = config[status] || config.pending;
  return (
    <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}
