import TopBar from "@/components/layout/TopBar";
import { createClient } from "@/lib/supabase/server";
import { Trophy, Flame, Zap } from "lucide-react";

const LEVEL_TITLES: Record<number, string> = {
  1: "Người Mới",
  2: "Người Mới",
  3: "Học Viên",
  4: "Học Viên",
  5: "Người Học Chăm",
  6: "Học Viên Tích Cực",
  7: "Học Viên Tích Cực",
  8: "Học Viên VIP",
  9: "Học Giả",
  10: "Học Giả",
  11: "Chuyên Gia",
  12: "Chuyên Gia",
};

function levelTitle(level: number) {
  return LEVEL_TITLES[Math.min(level, 12)] ?? "Chuyên Gia";
}

function rankBadge(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  if (rank <= 5) return "⭐";
  if (rank <= 10) return "🔥";
  return "💪";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default async function LeaderboardPage() {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch top 20 users by XP
  const { data: leaders } = await supabase
    .from("profiles")
    .select("id, full_name, xp, level, tier, streak, avatar_url")
    .order("xp", { ascending: false })
    .limit(20);

  // Current user's profile
  const { data: myProfile } = user
    ? await supabase
        .from("profiles")
        .select("full_name, xp, level, tier, streak, avatar_url")
        .eq("id", user.id)
        .single()
    : { data: null };

  // Current user's rank (count users with more XP)
  const { count: higherCount } = user && myProfile
    ? await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gt("xp", myProfile.xp)
    : { count: 0 };

  const myRank = (higherCount ?? 0) + 1;
  const myXp = myProfile?.xp ?? 0;
  const myLevel = myProfile?.level ?? 1;
  const myStreak = myProfile?.streak ?? 0;
  const myName = myProfile?.full_name || user?.email?.split("@")[0] || "Bạn";
  const myAvatarUrl = myProfile?.avatar_url;

  const leadersList = leaders ?? [];

  // Top 3 for podium (need exactly 3)
  const top3 = leadersList.slice(0, 3);
  while (top3.length < 3) top3.push(null as unknown as typeof top3[0]);

  return (
    <div>
      <TopBar title="Bảng xếp hạng" subtitle="Top học viên tích cực nhất" />

      <div className="p-6 max-w-4xl mx-auto space-y-6">

        {/* My Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Trophy, label: "Xếp hạng", value: `#${myRank}`, color: "#f59e0b" },
            { icon: Zap, label: "XP của tôi", value: myXp.toLocaleString("vi-VN"), color: "#22c55e" },
            { icon: Flame, label: "Streak hiện tại", value: `${myStreak} ngày`, color: "#ef4444" },
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
        {top3.filter(Boolean).length >= 2 && (
          <div className="card-dark p-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Top 3</h3>
            <div className="flex items-end justify-center gap-4">
              {[top3[1], top3[0], top3[2]].map((l, i) => {
                if (!l) return <div key={i} className="w-24" />;
                const heights = [80, 110, 60];
                const colors = ["#9ca3af", "#f59e0b", "#cd7f32"];
                const positions = [2, 1, 3];
                const isMe = l.id === user?.id;
                return (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="text-2xl">{rankBadge(positions[i])}</div>
                    {l.avatar_url ? (
                      <img src={l.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ background: isMe ? "linear-gradient(135deg,#22c55e,#059669)" : `linear-gradient(135deg,${colors[i]},${colors[i]}88)` }}
                      >
                        {initials(l.full_name ?? "?")}
                      </div>
                    )}
                    <div className="text-xs font-medium text-white text-center">
                      {(l.full_name ?? "?").split(" ").slice(-1)[0]}
                      {isMe && <span className="ml-1 text-[#22c55e]">(bạn)</span>}
                    </div>
                    <div className="text-xs text-[#22c55e] font-bold">
                      {(l.xp ?? 0).toLocaleString("vi-VN")} XP
                    </div>
                    <div
                      className="w-20 rounded-t-lg flex items-end justify-center pb-2 text-xs font-bold text-white"
                      style={{
                        height: heights[i],
                        background: `linear-gradient(180deg,${colors[i]}33,${colors[i]}11)`,
                        border: `1px solid ${colors[i]}44`,
                      }}
                    >
                      #{positions[i]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Full Leaderboard Table */}
        <div className="card-dark">
          <div className="p-4 border-b border-[#2a2a2a]">
            <h3 className="text-sm font-semibold text-white">Xếp hạng toàn thời gian</h3>
          </div>
          <div className="divide-y divide-[#1f1f1f]">
            {leadersList.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">
                Chưa có dữ liệu xếp hạng. Bắt đầu học để tích XP!
              </div>
            )}
            {leadersList.map((l, idx) => {
              const rank = idx + 1;
              const isMe = l.id === user?.id;
              const name = l.full_name || "Thành viên";
              return (
                <div
                  key={l.id}
                  className={`flex items-center gap-4 p-4 transition-colors ${isMe ? "bg-[#22c55e]/5" : "hover:bg-white/2"}`}
                >
                  <div
                    className="w-6 text-center text-sm font-bold"
                    style={{ color: rank <= 3 ? "#f59e0b" : "#6b7280" }}
                  >
                    {rank}
                  </div>
                  <div className="text-lg w-6 text-center">{rankBadge(rank)}</div>
                  {l.avatar_url ? (
                    <img src={l.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{
                        background: isMe
                          ? "linear-gradient(135deg,#22c55e,#059669)"
                          : "linear-gradient(135deg,#3b82f6,#1d4ed8)",
                      }}
                    >
                      {initials(name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isMe ? "text-[#22c55e]" : "text-white"}`}>
                        {name}
                      </span>
                      {isMe && <span className="badge-green text-[10px]">Bạn</span>}
                      {l.tier === "vip" && <span className="badge-gold text-[10px]">VIP</span>}
                    </div>
                    <div className="text-xs text-gray-500">
                      {levelTitle(l.level ?? 1)} • Level {l.level ?? 1}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-orange-400">
                    <Flame size={12} /> {l.streak ?? 0} ngày
                  </div>
                  <div className="text-sm font-bold text-[#22c55e] w-24 text-right">
                    {(l.xp ?? 0).toLocaleString("vi-VN")} XP
                  </div>
                </div>
              );
            })}

            {/* Show current user if not in top 20 */}
            {myProfile && !leadersList.some((l) => l.id === user?.id) && (
              <>
                <div className="p-2 text-center text-xs text-gray-700">• • •</div>
                <div className="flex items-center gap-4 p-4 bg-[#22c55e]/5">
                  <div className="w-6 text-center text-sm font-bold text-gray-400">{myRank}</div>
                  <div className="text-lg w-6 text-center">{rankBadge(myRank)}</div>
                  {myAvatarUrl ? (
                    <img src={myAvatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: "linear-gradient(135deg,#22c55e,#059669)" }}
                    >
                      {initials(myName)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#22c55e]">{myName}</span>
                      <span className="badge-green text-[10px]">Bạn</span>
                    </div>
                    <div className="text-xs text-gray-500">{levelTitle(myLevel)} • Level {myLevel}</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-orange-400">
                    <Flame size={12} /> {myStreak} ngày
                  </div>
                  <div className="text-sm font-bold text-[#22c55e] w-24 text-right">
                    {myXp.toLocaleString("vi-VN")} XP
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
