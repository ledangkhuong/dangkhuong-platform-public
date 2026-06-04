import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getRevenueSplit } from "@/lib/orders-revenue";
import { vnDayKey, vnDayStartUtc } from "@/lib/vn-time";
import {
  Users, BookOpen, ShoppingCart, FileText, Mail,
  TrendingUp, Plus, Settings, ArrowRight, AlertCircle, DollarSign, Gift
} from "lucide-react";
import AnalyticsDashboard from "@/components/admin/analytics/AnalyticsDashboardWrapper";
import OrderStatsWidget from "@/components/admin/orders/OrderStatsWidget";
import UserAvatar from "@/components/admin/UserAvatar";

export default async function AdminPage() {
  const supabase = await createClient();

  // Auth + admin check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!["admin", "manager"].includes(profile?.role ?? "")) redirect("/dashboard");

  // Use admin client for stats (bypasses RLS to see all data)
  const admin = await createAdminClient();

  // Today's window starts at VN midnight (00:00 Asia/Ho_Chi_Minh) so the
  // "Doanh thu hôm nay" card matches the calendar day a VN admin sees on the
  // wall — early-morning (00:00–07:00 VN) sales count toward today, not
  // yesterday (which server-local/UTC midnight would do on Vercel).
  const todayStartIso = vnDayStartUtc(vnDayKey(Date.now())).toISOString();

  const [
    { count: userCount },
    { count: blogCount },
    { count: subscriberCount },
    { data: recentUsers },
    { data: recentOrders },
    todaySplit,
    lifetimeSplit,
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("blog_posts").select("id", { count: "exact", head: true }),
    admin.from("subscribers").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin
      .from("profiles")
      .select("full_name, avatar_url, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("orders")
      .select("order_code, amount, status, customer_name, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    // Today's split (paid_at ≥ midnight) — drives the "Doanh thu hôm nay" pair.
    getRevenueSplit(admin, todayStartIso),
    // Lifetime split — replaces the previous `crm_overview.total_revenue`,
    // which still SUMs across every paid row (incl. external grants).
    getRevenueSplit(admin),
  ]);

  // Platform cash-in (headline). External is tracked separately as a sibling
  // mini-stat / dedicated card so it can't quietly inflate the cash KPI.
  const todayRevenue = todaySplit.platformAmount;
  const todayExternalRevenue = todaySplit.externalAmount;
  const todayExternalCount = todaySplit.externalCount;
  const todayPlatformOrderCount = todaySplit.platformCount;
  const totalRevenue = lifetimeSplit.platformAmount;
  const totalExternalRevenue = lifetimeSplit.externalAmount;
  const totalExternalCount = lifetimeSplit.externalCount;
  // The "Quản lý đơn hàng" admin card shows the paid-order count alongside
  // platform revenue elsewhere — keep it platform-only for consistency.
  const orderCount = lifetimeSplit.platformCount;

  // Quick stats. Two revenue cards (today + lifetime) carry an external
  // mini-stat below the main number — the cash-in figure on the big line, the
  // grant-only figure on the sub-line, so the two streams never blend.
  const quickStats: Array<{
    label: string;
    value: string;
    change: string;
    color: string;
    icon: typeof DollarSign;
    subValue?: string;
    subLabel?: string;
  }> = [
    {
      label: "Doanh thu hôm nay",
      value: todayRevenue.toLocaleString("vi-VN") + "đ",
      change: "Hôm nay (nền tảng)",
      color: "#D4A843",
      icon: DollarSign,
      subValue: todayExternalRevenue.toLocaleString("vi-VN") + "đ",
      subLabel: `+ ${todayExternalCount} cấp ngoài`,
    },
    {
      label: "Đơn hàng hôm nay",
      value: String(todayPlatformOrderCount),
      change: "Hôm nay (nền tảng)",
      color: "#f59e0b",
      icon: ShoppingCart,
    },
    {
      label: "Tổng học viên",
      value: (userCount ?? 0).toLocaleString("vi-VN"),
      change: "tài khoản",
      color: "#3b82f6",
      icon: Users,
    },
    {
      label: "Tổng doanh thu",
      value: totalRevenue.toLocaleString("vi-VN") + "đ",
      change: "tất cả thời gian (nền tảng)",
      color: "#a855f7",
      icon: DollarSign,
      subValue: totalExternalRevenue.toLocaleString("vi-VN") + "đ",
      subLabel: `+ ${totalExternalCount} cấp ngoài`,
    },
    {
      label: "Doanh thu cấp khóa ngoài",
      value: totalExternalRevenue.toLocaleString("vi-VN") + "đ",
      change: `${totalExternalCount} đơn cấp khóa`,
      color: "#22c55e",
      icon: Gift,
    },
  ];

  const adminCards = [
    {
      href: "/admin/courses",
      icon: BookOpen,
      title: "Quản lý khoá học",
      desc: "Thêm/sửa khoá học, chương, bài học và tài nguyên",
      count: "Khoá học",
      color: "#D4A843",
      actions: ["Thêm khoá học", "Xem danh sách"],
    },
    {
      href: "/admin/users",
      icon: Users,
      title: "Quản lý học viên",
      desc: "Xem danh sách, phân quyền và theo dõi tiến độ học viên",
      count: `${(userCount ?? 0).toLocaleString("vi-VN")} học viên`,
      color: "#3b82f6",
      actions: ["Thêm thủ công", "Xuất Excel"],
    },
    {
      href: "/admin/orders",
      icon: ShoppingCart,
      title: "Quản lý đơn hàng",
      desc: "Theo dõi thanh toán, xác nhận thủ công, xuất hoá đơn",
      count: `${orderCount} đơn đã thanh toán (nền tảng)`,
      color: "#f59e0b",
      actions: ["Xem tất cả", "Xác nhận thủ công"],
    },
    {
      href: "/admin/blog",
      icon: FileText,
      title: "Quản lý Blog",
      desc: "Viết, chỉnh sửa và xuất bản bài viết blog",
      count: `${blogCount ?? 0} bài viết`,
      color: "#8b5cf6",
      actions: ["Viết bài mới", "Xem danh sách"],
    },
    {
      href: "/email",
      icon: Mail,
      title: "Quản lý Email",
      desc: "Tạo template, quản lý automation và subscribers",
      count: `${(subscriberCount ?? 0).toLocaleString("vi-VN")} subscribers`,
      color: "#ec4899",
      actions: ["Tạo campaign", "Quản lý list"],
    },
    {
      href: "/crm",
      icon: TrendingUp,
      title: "CRM & Analytics",
      desc: "Doanh thu, chuyển đổi, phễu bán hàng và báo cáo tổng thể",
      count: "Xem dashboard →",
      color: "#14b8a6",
      actions: ["Mở CRM"],
    },
  ];

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} phút trước`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} giờ trước`;
    return `${Math.floor(hrs / 24)} ngày trước`;
  }

  return (
    <div>
      <TopBar title="Admin Panel" subtitle="Quản lý toàn bộ nền tảng dangkhuong.com" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Warning banner */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <AlertCircle size={15} className="text-[#f59e0b] shrink-0" />
          <span className="text-[#f59e0b] font-medium">Khu vực Admin</span>
          <span className="text-gray-400">
            — Xin chào {profile?.full_name ?? user.email}. Mọi thay đổi có hiệu lực ngay lập tức.
          </span>
        </div>

        {/* Real stats. 5-up at lg+ (incl. dedicated "Cấp khóa ngoài"); falls
            back to 2-up on phones so each card keeps a readable width. */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {quickStats.map((s) => (
            <div key={s.label} className="card-dark p-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon size={14} style={{ color: s.color }} />
                <span className="text-xs text-gray-500">{s.label}</span>
              </div>
              <div className="text-xl font-bold text-white">{s.value}</div>
              <div className="text-[11px] mt-1" style={{ color: s.color }}>{s.change}</div>
              {s.subValue && (
                <div className="mt-2 pt-2 border-t border-[#2a2a2a] flex items-center gap-1.5">
                  <Gift size={10} className="text-[#22c55e] shrink-0" />
                  <span className="text-[11px] text-gray-400 truncate">
                    {s.subValue}
                  </span>
                  <span className="text-[10px] text-gray-600 ml-auto shrink-0">
                    {s.subLabel}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Physical orders widget (Week 7) — đặt ngay sau quick stats để
            staff nhìn thấy ngay tình trạng giao nhận trước Analytics. */}
        <OrderStatsWidget />

        {/* Analytics Dashboard */}
        <AnalyticsDashboard />

        {/* Admin cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {adminCards.map((card) => (
            <div key={card.href} className="card-dark p-5 hover:bg-[#1f1f1f] transition-all">
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: card.color + "18" }}
                >
                  <card.icon size={20} style={{ color: card.color }} />
                </div>
                <span className="text-xs text-gray-500 font-medium">{card.count}</span>
              </div>
              <h3 className="font-semibold text-white mb-1">{card.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">{card.desc}</p>
              <div className="flex gap-2 flex-wrap">
                {card.actions.map((action) => (
                  <Link
                    key={action}
                    href={card.href}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                    style={{
                      background: card.color + "15",
                      color: card.color,
                      border: `1px solid ${card.color}25`,
                    }}
                  >
                    {action.startsWith("Thêm") || action.startsWith("Viết") || action.startsWith("Tạo")
                      ? <Plus size={11} />
                      : <ArrowRight size={11} />}
                    {action}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Recent activity */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent users */}
          <div>
            <h2 className="font-bold text-white mb-3 text-sm">Học viên mới đăng ký</h2>
            <div className="card-dark divide-y divide-[#2a2a2a]">
              {(recentUsers ?? []).length === 0 && (
                <div className="p-4 text-sm text-gray-500">Chưa có học viên nào.</div>
              )}
              {(recentUsers ?? []).map((u, i) => (
                <div key={i} className="flex items-center gap-3 p-3 hover:bg-[#1a1a1a] transition-colors">
                  <UserAvatar
                    src={u.avatar_url}
                    initials={(u.full_name ?? "?").slice(0, 2).toUpperCase()}
                    role="student"
                    tier="free"
                    size={28}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{u.full_name ?? "Thành viên"}</div>
                  </div>
                  <div className="text-xs text-gray-500 shrink-0">{timeAgo(u.created_at)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent orders */}
          <div>
            <h2 className="font-bold text-white mb-3 text-sm">Đơn hàng gần đây</h2>
            <div className="card-dark divide-y divide-[#2a2a2a]">
              {(recentOrders ?? []).length === 0 && (
                <div className="p-4 text-sm text-gray-500">Chưa có đơn hàng nào.</div>
              )}
              {(recentOrders ?? []).map((o, i) => (
                <div key={i} className="flex items-center gap-3 p-3 hover:bg-[#1a1a1a] transition-colors">
                  <div
                    className="w-2 h-2 rounded-full shrink-0 mt-0.5"
                    style={{
                      background:
                        o.status === "paid"
                          ? "#D4A843"
                          : o.status === "pending"
                          ? "#f59e0b"
                          : "#6b7280",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">
                      {o.customer_name ?? o.order_code}
                    </div>
                    <div className="text-xs text-gray-500">{o.order_code}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-white">
                      {o.amount.toLocaleString("vi-VN")}đ
                    </div>
                    <div className="text-xs text-gray-500">{timeAgo(o.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="font-bold text-white mb-3 text-sm">Thao tác nhanh</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { label: "Thêm khoá học", icon: BookOpen, color: "#D4A843", href: "/admin/courses" },
              { label: "Xem đơn hàng", icon: ShoppingCart, color: "#f59e0b", href: "/admin/orders" },
              { label: "Gửi newsletter", icon: Mail, color: "#3b82f6", href: "/email" },
              { label: "Quản lý học viên", icon: Users, color: "#8b5cf6", href: "/admin/users" },
              { label: "Cài đặt", icon: Settings, color: "#6b7280", href: "/settings" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors card-dark hover:bg-[#1f1f1f]"
              >
                <item.icon size={15} style={{ color: item.color }} />
                <span className="text-gray-300">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* License watermark */}
        <div className="mt-6 text-center text-xs text-gray-600">
          {process.env.NEXT_PUBLIC_LICENSE_NAME && process.env.NEXT_PUBLIC_LICENSE_NAME !== "UNLICENSED"
            ? `Licensed to: ${process.env.NEXT_PUBLIC_LICENSE_NAME}`
            : "Unlicensed Copy"}
        </div>
      </div>
    </div>
  );
}
