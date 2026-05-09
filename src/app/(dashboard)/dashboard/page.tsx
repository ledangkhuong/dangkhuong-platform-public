import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import { BookOpen, FolderOpen, Rocket, Gift, ShoppingCart, Users, ArrowRight, TrendingUp, Clock, Star } from "lucide-react";

const quickCards = [
  { href: "/dashboard/courses", icon: BookOpen, color: "#22c55e", bg: "rgba(34,197,94,0.1)", label: "Khoá học của tôi", desc: "Xem và học các khoá học" },
  { href: "/dashboard/blog", icon: FolderOpen, color: "#3b82f6", bg: "rgba(59,130,246,0.1)", label: "Tài nguyên", desc: "Templates, tài liệu hỗ trợ" },
  { href: "/dashboard/courses/roadmap", icon: Rocket, color: "#a855f7", bg: "rgba(168,85,247,0.1)", label: "Lộ Trình 72H", desc: "Tạo roadmap ra mắt sản phẩm" },
  { href: "/dashboard/courses/offers", icon: Gift, color: "#ec4899", bg: "rgba(236,72,153,0.1)", label: "Offer Quick Win", desc: "Ý tưởng sản phẩm số dễ làm" },
  { href: "/dashboard/crm", icon: ShoppingCart, color: "#f59e0b", bg: "rgba(245,158,11,0.1)", label: "CRM", desc: "Quản lý khách hàng & đơn hàng" },
];

const recentActivities = [
  { user: "Minh Tuấn", action: "vừa hoàn thành bài học", target: "Xây dựng Lead Magnet", time: "2 phút trước", avatar: "MT" },
  { user: "Thu Hương", action: "đăng bình luận trong", target: "Cộng đồng Marketing", time: "15 phút trước", avatar: "TH" },
  { user: "Quang Dũng", action: "đăng ký khoá học", target: "Digital Snacks", time: "1 giờ trước", avatar: "QD" },
  { user: "Lan Anh", action: "hoàn thành chứng chỉ", target: "Marketing 0→1", time: "3 giờ trước", avatar: "LA" },
];

const stats = [
  { label: "Học viên", value: "1,247", change: "+12%", icon: Users, color: "#22c55e" },
  { label: "Khoá học hoàn thành", value: "89%", change: "+5%", icon: TrendingUp, color: "#3b82f6" },
  { label: "Giờ học", value: "3,840", change: "+18%", icon: Clock, color: "#a855f7" },
  { label: "Đánh giá TB", value: "4.9 ⭐", change: "+0.1", icon: Star, color: "#f59e0b" },
];

export default function DashboardPage() {
  return (
    <div>
      <TopBar
        title="Tổng quan"
        subtitle="Chào mừng bạn trở lại"
        notification={{ label: "Khoá học mới 🔥", text: "Digital Snacks — Kiếm tiền từ sản phẩm số" }}
      />

      <div className="p-6 max-w-6xl mx-auto space-y-8">

        {/* Welcome */}
        <div>
          <h2 className="text-2xl font-bold text-white">
            Xin chào, Đăng Khương! 👋
          </h2>
          <p className="text-gray-400 mt-1">Chào mừng bạn đến với hệ thống học tập. Bắt đầu từ đây.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="card-dark p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500 font-medium">{s.label}</span>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: s.color + "20" }}>
                  <s.icon size={14} style={{ color: s.color }} />
                </div>
              </div>
              <div className="text-xl font-bold text-white">{s.value}</div>
              <div className="text-xs mt-1" style={{ color: "#22c55e" }}>
                {s.change} so với tháng trước
              </div>
            </div>
          ))}
        </div>

        {/* Quick Access */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Truy cập nhanh</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {quickCards.map((card) => (
              <Link key={card.href} href={card.href}
                className="card-dark p-4 hover:bg-[#222] transition-all duration-150 group cursor-pointer">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: card.bg }}>
                  <card.icon size={18} style={{ color: card.color }} />
                </div>
                <div className="text-sm font-semibold text-white group-hover:text-white leading-tight mb-1">
                  {card.label}
                </div>
                <div className="text-xs text-gray-500 leading-snug">{card.desc}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Community + Activity */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Join Community */}
          <Link href="/dashboard/community"
            className="card-dark p-5 flex items-center justify-between hover:bg-[#222] transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(34,197,94,0.12)" }}>
                <Users size={20} style={{ color: "#22c55e" }} />
              </div>
              <div>
                <div className="font-semibold text-white">Tham gia Cộng đồng</div>
                <div className="text-sm text-gray-400">Kết nối, học hỏi và phát triển cùng nhau</div>
              </div>
            </div>
            <ArrowRight size={18} className="text-gray-500 group-hover:text-[#22c55e] transition-colors" />
          </Link>

          {/* Premium CTA */}
          <div className="card-dark p-5 border border-[#f59e0b]/20" style={{ background: "rgba(245,158,11,0.05)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Star size={16} className="text-[#f59e0b]" />
              <span className="font-semibold text-[#f59e0b]">Quyền Đồng Hành</span>
            </div>
            <p className="text-sm text-gray-400 mb-3">
              Mở khoá toàn bộ khoá học, hỏi đáp 1-1, zoom chữa bài và nhiều đặc quyền khác
            </p>
            <button className="btn-gold text-sm">
              <Star size={14} />
              Nâng cấp — 999K
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Hoạt động gần đây</h3>
            <Link href="/dashboard/community" className="text-xs text-[#22c55e] hover:underline flex items-center gap-1">
              Xem tất cả <ArrowRight size={12} />
            </Link>
          </div>
          <div className="card-dark divide-y divide-[#2a2a2a]">
            {recentActivities.map((act, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: "linear-gradient(135deg, #22c55e, #059669)" }}>
                  {act.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">
                    <span className="font-medium">{act.user}</span>
                    {" "}<span className="text-gray-400">{act.action}</span>
                    {" "}<span className="text-[#22c55e]">{act.target}</span>
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">{act.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
