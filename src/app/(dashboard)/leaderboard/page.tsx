import TopBar from "@/components/layout/TopBar";
import { Trophy, Flame, Star, Zap } from "lucide-react";

const leaders = [
  { rank: 1, name: "Nguyễn Minh Tuấn", avatar: "MT", xp: 8420, level: 12, streak: 28, badge: "🥇", title: "Chuyên Gia" },
  { rank: 2, name: "Trần Thu Hương", avatar: "TH", xp: 7210, level: 11, streak: 21, badge: "🥈", title: "Học Giả" },
  { rank: 3, name: "Lê Quang Dũng", avatar: "QD", xp: 6980, level: 10, streak: 15, badge: "🥉", title: "Học Giả" },
  { rank: 4, name: "Phạm Lan Anh", avatar: "LA", xp: 5560, level: 9, streak: 12, badge: "⭐", title: "Học Viên VIP" },
  { rank: 5, name: "Vũ Đức Thịnh", avatar: "VT", xp: 4830, level: 8, streak: 9, badge: "🔥", title: "Học Viên VIP" },
  { rank: 6, name: "Bùi Thanh Liêm", avatar: "BL", xp: 3920, level: 7, streak: 7, badge: "💪", title: "Học Viên Tích Cực" },
  { rank: 7, name: "Đỗ Minh Châu", avatar: "MC", xp: 2840, level: 6, streak: 5, badge: "✨", title: "Học Viên Tích Cực" },
  { rank: 8, name: "Ngô Thị Hoa", avatar: "NH", xp: 1960, level: 5, streak: 3, badge: "🌱", title: "Người Mới" },
  { rank: 9, name: "Bạn", avatar: "BN", xp: 890, level: 5, streak: 2, badge: "🌱", title: "Người Học Chăm", isMe: true },
];

const badges = [
  { emoji: "🔥", name: "Streak 7 ngày", desc: "Học 7 ngày liên tiếp", earned: false },
  { emoji: "📚", name: "5 khoá hoàn thành", desc: "Hoàn thành 5 khoá học", earned: false },
  { emoji: "💬", name: "Người Kết Nối", desc: "50 bình luận trong cộng đồng", earned: true },
  { emoji: "⭐", name: "Học Viên VIP", desc: "Đạt 5,000 XP", earned: false },
];

export default function LeaderboardPage() {
  return (
    <div>
      <TopBar title="Bảng xếp hạng" subtitle="Top học viên tích cực nhất" />
      <div className="p-6 max-w-4xl mx-auto space-y-6">

        {/* My Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Trophy, label: "Xếp hạng", value: "#9", color: "#f59e0b" },
            { icon: Zap, label: "XP của tôi", value: "890", color: "#22c55e" },
            { icon: Flame, label: "Streak hiện tại", value: "2 ngày", color: "#ef4444" },
          ].map((s, i) => (
            <div key={i} className="card-dark p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.color + "20" }}>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
              <div>
                <div className="text-xs text-gray-500">{s.label}</div>
                <div className="text-xl font-bold text-white">{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Top 3 Podium */}
        <div className="card-dark p-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Top 3 Tuần Này</h3>
          <div className="flex items-end justify-center gap-4">
            {[leaders[1], leaders[0], leaders[2]].map((l, i) => {
              const heights = [80, 110, 60];
              const colors = ["#9ca3af", "#f59e0b", "#cd7f32"];
              return (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="text-2xl">{l.badge}</div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: `linear-gradient(135deg,${colors[i]},${colors[i]}88)` }}>{l.avatar}</div>
                  <div className="text-xs font-medium text-white text-center">{l.name.split(" ").slice(-1)[0]}</div>
                  <div className="text-xs text-[#22c55e] font-bold">{l.xp.toLocaleString()} XP</div>
                  <div className="w-20 rounded-t-lg flex items-end justify-center pb-2 text-xs font-bold text-white"
                    style={{ height: heights[i], background: `linear-gradient(180deg,${colors[i]}33,${colors[i]}11)`, border: `1px solid ${colors[i]}44` }}>
                    #{[2,1,3][i]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Full Table */}
        <div className="card-dark">
          <div className="p-4 border-b border-[#2a2a2a]">
            <div className="flex gap-2">
              {["Tuần này", "Tháng này", "Tất cả"].map((p, i) => (
                <button key={p} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${i === 0 ? "bg-[#22c55e] text-white" : "text-gray-400 hover:text-white"}`}>{p}</button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-[#1f1f1f]">
            {leaders.map((l) => (
              <div key={l.rank} className={`flex items-center gap-4 p-4 transition-colors ${l.isMe ? "bg-[#22c55e]/5" : "hover:bg-white/2"}`}>
                <div className="w-6 text-center text-sm font-bold" style={{ color: l.rank <= 3 ? "#f59e0b" : "#6b7280" }}>{l.rank}</div>
                <div className="text-lg">{l.badge}</div>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: l.isMe ? "linear-gradient(135deg,#22c55e,#059669)" : "linear-gradient(135deg,#3b82f6,#1d4ed8)" }}>
                  {l.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${l.isMe ? "text-[#22c55e]" : "text-white"}`}>{l.name}</span>
                    {l.isMe && <span className="badge-green text-[10px]">Bạn</span>}
                  </div>
                  <div className="text-xs text-gray-500">{l.title} • Level {l.level}</div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-orange-400">
                  <Flame size={12} /> {l.streak} ngày
                </div>
                <div className="text-sm font-bold text-[#22c55e] w-20 text-right">{l.xp.toLocaleString()} XP</div>
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Huy hiệu của bạn</h3>
          <div className="grid grid-cols-4 gap-3">
            {badges.map((b, i) => (
              <div key={i} className={`card-dark p-4 text-center ${!b.earned ? "opacity-40" : ""}`}>
                <div className="text-3xl mb-2">{b.emoji}</div>
                <div className="text-xs font-semibold text-white mb-1">{b.name}</div>
                <div className="text-[10px] text-gray-500">{b.desc}</div>
                {b.earned && <div className="mt-2"><span className="badge-green text-[10px]">Đã đạt</span></div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
