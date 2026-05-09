import TopBar from "@/components/layout/TopBar";
import { Mail, Users, Send, Eye, MousePointer, TrendingUp, Plus, Play, Pause, CheckCircle, Clock, Zap } from "lucide-react";

const stats = [
  { label: "Tổng subscribers", value: "1,248", change: "+48 tuần này", icon: Users, color: "#22c55e" },
  { label: "Email đã gửi", value: "24,600", change: "tháng này", icon: Send, color: "#3b82f6" },
  { label: "Open rate TB", value: "67.4%", change: "+5.2% vs tháng trước", icon: Eye, color: "#f59e0b" },
  { label: "Click rate TB", value: "21.8%", change: "industry avg: 3.5%", icon: MousePointer, color: "#8b5cf6" },
];

const campaigns = [
  {
    id: 1,
    name: "Chào mừng thành viên mới",
    type: "automation",
    status: "active",
    sent: 1248,
    opened: 841,
    clicked: 274,
    date: "Tự động",
  },
  {
    id: 2,
    name: "Newsletter tuần 18 — Case Study Thực Tế",
    type: "broadcast",
    status: "sent",
    sent: 1200,
    opened: 806,
    clicked: 241,
    date: "05/05/2025",
  },
  {
    id: 3,
    name: "Upsell — Khoá Quyền Đồng Hành",
    type: "broadcast",
    status: "sent",
    sent: 980,
    opened: 661,
    clicked: 198,
    date: "01/05/2025",
  },
  {
    id: 4,
    name: "Sequence: 5 ngày Personal Brand",
    type: "automation",
    status: "active",
    sent: 640,
    opened: 502,
    clicked: 188,
    date: "Tự động",
  },
  {
    id: 5,
    name: "Re-engagement — Thành viên im lặng",
    type: "broadcast",
    status: "draft",
    sent: 0,
    opened: 0,
    clicked: 0,
    date: "Chưa gửi",
  },
];

const automations = [
  { name: "Welcome Sequence (5 emails)", trigger: "Đăng ký mới", active: true, subscribers: 1248 },
  { name: "After Purchase Flow", trigger: "Mua thành công", active: true, subscribers: 312 },
  { name: "Lesson Complete Nudge", trigger: "Hoàn thành bài học", active: true, subscribers: 847 },
  { name: "7-Day Inactive Re-engage", trigger: "Không đăng nhập 7 ngày", active: false, subscribers: 203 },
];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Đang chạy", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  sent: { label: "Đã gửi", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  draft: { label: "Bản nháp", color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
};

export default function EmailPage() {
  return (
    <div>
      <TopBar title="Email Marketing" subtitle="Quản lý campaigns & automation" />

      <div className="p-6 max-w-6xl mx-auto space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: s.color + "20" }}>
                  <s.icon size={18} style={{ color: s.color }} />
                </div>
                <TrendingUp size={14} className="text-[#22c55e]" />
              </div>
              <div className="text-2xl font-bold text-white mb-0.5">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="text-[11px] text-[#22c55e] mt-1">{s.change}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6">

          {/* Campaigns */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white text-lg">Campaigns</h2>
              <button className="btn-green flex items-center gap-2 text-sm">
                <Plus size={15} /> Tạo campaign
              </button>
            </div>

            <div className="card-dark overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                    <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Tên campaign</th>
                    <th className="text-right text-xs text-gray-500 font-medium px-4 py-3">Gửi</th>
                    <th className="text-right text-xs text-gray-500 font-medium px-4 py-3">Mở</th>
                    <th className="text-right text-xs text-gray-500 font-medium px-4 py-3">Click</th>
                    <th className="text-right text-xs text-gray-500 font-medium px-4 py-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c, i) => {
                    const openRate = c.sent > 0 ? Math.round((c.opened / c.sent) * 100) : 0;
                    const clickRate = c.sent > 0 ? Math.round((c.clicked / c.sent) * 100) : 0;
                    const st = statusConfig[c.status];
                    return (
                      <tr key={c.id}
                        style={{ borderBottom: i < campaigns.length - 1 ? "1px solid #2a2a2a" : "none" }}
                        className="hover:bg-[#1f1f1f] transition-colors cursor-pointer">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {c.type === "automation"
                              ? <Zap size={13} className="text-[#f59e0b] shrink-0" />
                              : <Mail size={13} className="text-[#3b82f6] shrink-0" />}
                            <div>
                              <div className="text-white text-sm font-medium leading-tight">{c.name}</div>
                              <div className="text-[11px] text-gray-500 mt-0.5">{c.date}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300 text-sm">{c.sent > 0 ? c.sent.toLocaleString() : "—"}</td>
                        <td className="px-4 py-3 text-right">
                          {c.sent > 0 ? (
                            <span className="text-[#22c55e] font-medium">{openRate}%</span>
                          ) : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {c.sent > 0 ? (
                            <span className="text-[#3b82f6] font-medium">{clickRate}%</span>
                          ) : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs font-medium px-2 py-1 rounded-full"
                            style={{ background: st.bg, color: st.color }}>
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Subscriber growth chart placeholder */}
            <div className="card-dark p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Tăng trưởng subscribers</h3>
                <span className="text-xs text-gray-500 px-2 py-1 rounded" style={{ background: "#222" }}>30 ngày qua</span>
              </div>
              <div className="flex items-end gap-1 h-24">
                {[18, 24, 19, 32, 28, 35, 42, 38, 44, 39, 51, 48, 55, 52, 60,
                  58, 65, 70, 64, 72, 68, 75, 80, 78, 85, 82, 90, 88, 95, 92].map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm transition-all"
                    style={{ height: `${h}%`, background: i >= 25 ? "#22c55e" : "rgba(34,197,94,0.3)" }} />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-gray-600 mt-2">
                <span>01/04</span><span>15/04</span><span>30/04</span><span>Hôm nay</span>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">

            {/* Automations */}
            <div className="card-dark p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white text-sm">Automation Flows</h3>
                <button className="text-[#22c55e] text-xs font-medium">+ Thêm</button>
              </div>
              <div className="space-y-3">
                {automations.map((a) => (
                  <div key={a.name} className="flex items-start gap-3 p-3 rounded-lg"
                    style={{ background: "#222" }}>
                    <div className="mt-0.5">
                      {a.active
                        ? <Play size={14} className="text-[#22c55e]" />
                        : <Pause size={14} className="text-gray-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-medium leading-tight mb-1">{a.name}</div>
                      <div className="text-[11px] text-gray-500">Trigger: {a.trigger}</div>
                      <div className="text-[11px] text-gray-600 mt-0.5">{a.subscribers} subscribers</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Compose */}
            <div className="card-dark p-4">
              <h3 className="font-semibold text-white text-sm mb-3">Gửi broadcast nhanh</h3>
              <div className="space-y-2.5">
                <input
                  type="text"
                  placeholder="Tiêu đề email..."
                  className="input-dark w-full text-sm"
                />
                <textarea
                  placeholder="Nội dung email..."
                  rows={4}
                  className="input-dark w-full text-sm resize-none"
                />
                <div className="flex items-center gap-2">
                  <select className="input-dark flex-1 text-sm">
                    <option>Tất cả subscribers (1,248)</option>
                    <option>Đã mua hàng (312)</option>
                    <option>Chưa mua (936)</option>
                    <option>Thành viên VIP (89)</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 py-2 text-xs rounded-lg font-medium text-gray-400 transition-colors"
                    style={{ background: "#222", border: "1px solid #2a2a2a" }}>
                    <Clock size={12} className="inline mr-1" /> Lên lịch
                  </button>
                  <button className="btn-green flex-1 text-xs py-2 justify-center flex items-center gap-1">
                    <Send size={12} /> Gửi ngay
                  </button>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="card-dark p-4" style={{ borderColor: "rgba(34,197,94,0.2)" }}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={14} className="text-[#22c55e]" />
                <span className="text-xs font-semibold text-[#22c55e]">Best practices</span>
              </div>
              <ul className="text-xs text-gray-400 space-y-1.5">
                <li>• Gửi vào 7–9h sáng hoặc 7–9h tối</li>
                <li>• Subject line dưới 50 ký tự</li>
                <li>• CTA rõ ràng, 1 link chính mỗi email</li>
                <li>• Personalize với tên người nhận</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
