import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import { Users, BookOpen, ShoppingCart, FileText, Mail, TrendingUp, Plus, Settings, ArrowRight, AlertCircle } from "lucide-react";

const adminCards = [
  {
    href: "/admin/courses",
    icon: BookOpen,
    title: "Quản lý khoá học",
    desc: "Thêm/sửa khoá học, chương, bài học và tài nguyên",
    count: "3 khoá học",
    color: "#22c55e",
    actions: ["Thêm khoá học", "Xem danh sách"],
  },
  {
    href: "/admin/users",
    icon: Users,
    title: "Quản lý học viên",
    desc: "Xem danh sách, phân quyền và theo dõi tiến độ học viên",
    count: "1,248 học viên",
    color: "#3b82f6",
    actions: ["Thêm thủ công", "Xuất Excel"],
  },
  {
    href: "/admin/orders",
    icon: ShoppingCart,
    title: "Quản lý đơn hàng",
    desc: "Theo dõi thanh toán, xác nhận thủ công, xuất hoá đơn",
    count: "312 đơn hàng",
    color: "#f59e0b",
    actions: ["Xem tất cả", "Xác nhận thủ công"],
  },
  {
    href: "/admin/blog",
    icon: FileText,
    title: "Quản lý Blog",
    desc: "Viết, chỉnh sửa và xuất bản bài viết blog",
    count: "24 bài viết",
    color: "#8b5cf6",
    actions: ["Viết bài mới", "Xem danh sách"],
  },
  {
    href: "/admin/email",
    icon: Mail,
    title: "Quản lý Email",
    desc: "Tạo template, quản lý automation và subscribers",
    count: "1,248 subscribers",
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

const recentActivity = [
  { type: "order", text: "Đơn hàng mới: Nguyễn Văn A — Quyền Đồng Hành", time: "2 phút trước", status: "success" },
  { type: "user", text: "Học viên mới đăng ký: Trần Thị B", time: "15 phút trước", status: "info" },
  { type: "comment", text: "Bình luận mới trong cộng đồng cần duyệt", time: "1 tiếng trước", status: "warning" },
  { type: "order", text: "Đơn hàng mới: Lê Văn C — Digital Product Starter", time: "3 tiếng trước", status: "success" },
  { type: "system", text: "Webhook Sepay hoạt động bình thường", time: "Hôm nay 08:00", status: "success" },
];

const quickStats = [
  { label: "Doanh thu hôm nay", value: "2,450,000₫", change: "+12%" },
  { label: "Đơn hàng chờ xử lý", value: "3", change: "cần xem" },
  { label: "Học viên mới hôm nay", value: "8", change: "+8%" },
  { label: "Email open rate (7d)", value: "68.2%", change: "↑ 5.1%" },
];

const statusColor: Record<string, string> = {
  success: "#22c55e",
  info: "#3b82f6",
  warning: "#f59e0b",
};

export default function AdminPage() {
  return (
    <div>
      <TopBar title="Admin Panel" subtitle="Quản lý toàn bộ nền tảng dangkhuong.com" />

      <div className="p-6 max-w-6xl mx-auto space-y-6">

        {/* Warning banner */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <AlertCircle size={15} className="text-[#f59e0b] shrink-0" />
          <span className="text-[#f59e0b] font-medium">Khu vực Admin</span>
          <span className="text-gray-400">— Chỉ dành cho quản trị viên. Mọi thay đổi sẽ có hiệu lực ngay lập tức.</span>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickStats.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="text-xl font-bold text-white mb-0.5">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="text-[11px] text-[#22c55e] mt-1">{s.change}</div>
            </div>
          ))}
        </div>

        {/* Admin cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {adminCards.map((card) => (
            <div key={card.href} className="card-dark p-5 hover:bg-[#1f1f1f] transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: card.color + "18" }}>
                  <card.icon size={20} style={{ color: card.color }} />
                </div>
                <span className="text-xs text-gray-500 font-medium">{card.count}</span>
              </div>
              <h3 className="font-semibold text-white mb-1">{card.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">{card.desc}</p>
              <div className="flex gap-2 flex-wrap">
                {card.actions.map((action) => (
                  <button key={action}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                    style={{ background: card.color + "15", color: card.color, border: `1px solid ${card.color}25` }}>
                    {action.startsWith("Thêm") || action.startsWith("Viết") || action.startsWith("Tạo")
                      ? <Plus size={11} />
                      : <ArrowRight size={11} />}
                    {action}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Recent activity + Quick actions */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <h2 className="font-bold text-white mb-4">Hoạt động gần đây</h2>
            <div className="card-dark overflow-hidden">
              {recentActivity.map((a, i) => (
                <div key={i}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-[#1f1f1f] transition-colors"
                  style={{ borderBottom: i < recentActivity.length - 1 ? "1px solid #2a2a2a" : "none" }}>
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ background: statusColor[a.status] || "#6b7280" }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white">{a.text}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{a.time}</div>
                  </div>
                  {a.type === "comment" && (
                    <button className="text-xs font-medium px-2 py-1 rounded-lg shrink-0"
                      style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
                      Duyệt
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-bold text-white mb-4">Thao tác nhanh</h2>
            <div className="space-y-2">
              {[
                { label: "Thêm khoá học mới", icon: BookOpen, color: "#22c55e" },
                { label: "Xác nhận đơn thủ công", icon: ShoppingCart, color: "#f59e0b" },
                { label: "Gửi newsletter ngay", icon: Mail, color: "#3b82f6" },
                { label: "Thêm học viên thủ công", icon: Users, color: "#8b5cf6" },
                { label: "Cài đặt hệ thống", icon: Settings, color: "#6b7280" },
              ].map((item) => (
                <button key={item.label}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-colors card-dark hover:bg-[#1f1f1f]">
                  <item.icon size={16} style={{ color: item.color }} />
                  <span className="text-gray-300">{item.label}</span>
                  <ArrowRight size={14} className="ml-auto text-gray-600" />
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
