import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  Users, BookOpen, ShoppingCart, FileText, Mail,
  TrendingUp, Plus, Settings, ArrowRight, AlertCircle, DollarSign
} from "lucide-react";
import AnalyticsDashboard from "@/components/admin/analytics/AnalyticsDashboardWrapper";

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

  const [
    { count: userCount },
    { count: orderCount },
    { count: pendingCount },
    { data: crmData },
    { count: blogCount },
    { count: subscriberCount },
    { data: recentUsers },
    { data: recentOrders },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("orders").select("id", { count: "exact", head: true }).eq("status", "paid"),
    admin.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("crm_overview").select("*").single(),
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
  ]);

  // Today's revenue
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data: todayOrders } = await admin
    .from("orders")
    .select("amount")
    .eq("status", "paid")
    .gte("paid_at", todayStart.toISOString());

  const todayRevenue = (todayOrders ?? []).reduce((s, o) => s + o.amount, 0);
  const totalRevenue = (crmData as { total_revenue?: number } | null)?.total_revenue ?? 0;

  const quickStats = [
    {
      label: "Doanh thu hôm nay",
      value: todayRevenue.toLocaleString("vi-VN") + "đ",
      change: "Hôm nay",
      color: "#D4A843",
    },
    {
      label: "Đơn hàng chờ xử lý",
      value: String(pendingCount ?? 0),
      change: "cần xem",
      color: "#f59e0b",
    },
    {
      label: "Tổng học viên",
      value: (userCount ?? 0).toLocaleString("vi-VN"),
      change: "tài khoản",
      color: "#3b82f6",
    },
    {
      label: "Tổng doanh thu",
      value: totalRevenue.toLocaleString("vi-VN") + "đ",
      change: "tất cả thời gian",
      color: "#a855f7",
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
      count: `${(orderCount ?? 0)} đơn đã thanh toán`,
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

        {/* Real stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickStats.map((s) => (
            <div key={s.label} className="card-dark p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={14} style={{ color: s.color }} />
                <span className="text-xs text-gray-500">{s.label}</span>
              </div>
              <div className="text-xl font-bold text-white">{s.value}</div>
              <div className="text-[11px] mt-1" style={{ color: s.color }}>{s.change}</div>
            </div>
          ))}
        </div>

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
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                  ) : (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                      style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}
                    >
                      {(u.full_name ?? "?").slice(0, 2).toUpperCase()}
                    </div>
                  )}
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
                    <div className="text-xs text-gray-600">{timeAgo(o.created_at)}</div>
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
      </div>
    </div>
  );
}
