import TopBar from "@/components/layout/TopBar";
import { TrendingUp, ShoppingCart, Users, DollarSign, Mail, BarChart2, ArrowUpRight } from "lucide-react";

const stats = [
  { label: "Doanh thu", value: "12.500.000 ₫", icon: DollarSign, color: "#f59e0b", change: "+17.6%" },
  { label: "Đơn hàng", value: "28", sub: "21 đã thanh toán", icon: ShoppingCart, color: "#a855f7", change: "+11.1%" },
  { label: "Khách hàng", value: "22", icon: Users, color: "#22c55e", change: "+33.3%" },
  { label: "TB/đơn hàng", value: "580.000 ₫", icon: TrendingUp, color: "#3b82f6", change: "+5.2%" },
];

const recentOrders = [
  { name: "Nguyễn Minh Tuấn", product: "Digital Snacks", amount: "499.000 ₫", status: "paid", time: "2h trước" },
  { name: "Trần Thu Hương", product: "Quyền Đồng Hành", amount: "999.000 ₫", status: "paid", time: "5h trước" },
  { name: "Lê Quang Dũng", product: "Marketing 0→1", amount: "0 ₫", status: "free", time: "1 ngày trước" },
  { name: "Phạm Lan Anh", product: "Digital Snacks", amount: "499.000 ₫", status: "pending", time: "1 ngày trước" },
  { name: "Vũ Đức Thịnh", product: "Quyền Đồng Hành", amount: "999.000 ₫", status: "cancelled", time: "2 ngày trước" },
];

const emailStats = { sent: 105, opened: 88, clicked: 28, openRate: 84 };

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  paid:      { label: "Đã TT",     color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  pending:   { label: "Chờ XL",    color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  free:      { label: "Miễn phí",  color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  cancelled: { label: "Đã huỷ",   color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
};

// Simple bar chart data
const chartData = [
  { day: "3/5", value: 180000 }, { day: "4/5", value: 450000 },
  { day: "5/5", value: 560000 }, { day: "6/5", value: 490000 },
  { day: "7/5", value: 620000 }, { day: "8/5", value: 680000 },
  { day: "9/5", value: 150000 },
];
const maxVal = Math.max(...chartData.map(d => d.value));

export default function CRMPage() {
  return (
    <div>
      <TopBar title="CRM & Doanh số" subtitle="Quản lý kinh doanh của bạn" />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Xin chào, Đăng Khương! 👋</h2>
            <p className="text-gray-400 text-sm">Đây là tổng quan kinh doanh của bạn</p>
          </div>
          <div className="flex gap-2">
            {["Hôm nay", "7 ngày", "30 ngày"].map((p, i) => (
              <button key={p} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${i === 1 ? "bg-[#22c55e] text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Demo Banner */}
        <div className="flex items-center gap-3 p-3 rounded-xl text-sm"
          style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <span className="text-[#22c55e]">⭐</span>
          <div>
            <strong className="text-white">Đây là dữ liệu mẫu</strong>
            <span className="text-gray-400 ml-2">— Dashboard đang hiển thị demo để bạn hình dung cách hoạt động.</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{s.label}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: s.color + "20" }}>
                  <s.icon size={15} style={{ color: s.color }} />
                </div>
              </div>
              <div className="text-xl font-bold text-white">{s.value}</div>
              {s.sub && <div className="text-xs text-gray-500 mt-0.5">{s.sub}</div>}
              <div className="flex items-center gap-1 mt-1 text-xs text-[#22c55e]">
                <ArrowUpRight size={11} /> {s.change}
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Revenue Chart */}
          <div className="card-dark p-5 md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-white text-sm">Biến động doanh thu</h3>
                <div className="text-xl font-bold text-white mt-1">3.019.778 ₫</div>
                <div className="text-xs text-[#22c55e] flex items-center gap-1">
                  <ArrowUpRight size={11} /> +17.6% so với tuần trước
                </div>
              </div>
              <span className="badge-green">Demo</span>
            </div>
            {/* Bar Chart */}
            <div className="flex items-end gap-1.5 h-32 mt-4">
              {chartData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t transition-all"
                    style={{ height: `${(d.value / maxVal) * 100}%`, background: "#22c55e", minHeight: 4 }} />
                  <span className="text-[9px] text-gray-600">{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Order Status Donut */}
          <div className="card-dark p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white text-sm">Trạng thái đơn hàng</h3>
              <span className="badge-green">Demo</span>
            </div>
            {/* Simple visual */}
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 rounded-full flex items-center justify-center font-bold text-white"
                style={{ background: "conic-gradient(#22c55e 0% 75%, #f59e0b 75% 89%, #ef4444 89% 100%)" }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: "#1a1a1a" }}>75%</div>
              </div>
            </div>
            {[
              { label: "Đã thanh toán", count: 21, color: "#22c55e" },
              { label: "Chờ xử lý", count: 4, color: "#f59e0b" },
              { label: "Đã huỷ", count: 3, color: "#ef4444" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                  <span className="text-xs text-gray-400">{item.label}</span>
                </div>
                <span className="text-xs font-semibold text-white">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card-dark">
          <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
            <h3 className="font-semibold text-white">Đơn hàng gần đây</h3>
            <button className="text-xs text-[#22c55e] hover:underline flex items-center gap-1">
              Xem tất cả <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-[#2a2a2a]">
            {recentOrders.map((order, i) => {
              const st = statusConfig[order.status];
              return (
                <div key={i} className="flex items-center gap-4 p-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: "linear-gradient(135deg,#3b82f6,#1d4ed8)" }}>
                    {order.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{order.name}</p>
                    <p className="text-xs text-gray-500">{order.product} • {order.time}</p>
                  </div>
                  <div className="text-sm font-semibold text-white">{order.amount}</div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Email Stats */}
        <div className="card-dark p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-[#22c55e]" />
              <h3 className="font-semibold text-white">Email Analytics</h3>
            </div>
            <span className="badge-green">Demo</span>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Đã gửi", value: emailStats.sent, icon: "📧" },
              { label: "Lượt mở", value: emailStats.opened, icon: "👁️" },
              { label: "Lượt click", value: emailStats.clicked, icon: "🖱️" },
              { label: "Tỷ lệ mở", value: `${emailStats.openRate}%`, icon: "📈" },
            ].map((s, i) => (
              <div key={i} className="text-center p-3 rounded-xl" style={{ background: "#111" }}>
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="text-xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Start */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Bắt đầu nhanh</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: "📦", label: "Thêm sản phẩm", desc: "Tạo sản phẩm số mới" },
              { icon: "👥", label: "Thêm khách hàng", desc: "Quản lý khách hàng" },
              { icon: "💳", label: "Cài đặt thanh toán", desc: "Thiết lập Sepay/Stripe" },
            ].map((item, i) => (
              <button key={i} className="card-dark p-4 text-left hover:bg-[#222] transition-all">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-sm font-semibold text-white">{item.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
