import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  BookOpen, FolderOpen,
  Users, ArrowRight, TrendingUp, Clock, Star, Zap
} from "lucide-react";

const quickCards = [
  { href: "/courses", icon: BookOpen, color: "#22c55e", bg: "rgba(34,197,94,0.1)", label: "Khoá học của tôi", desc: "Xem và học các khoá học" },
  { href: "/blog", icon: FolderOpen, color: "#3b82f6", bg: "rgba(59,130,246,0.1)", label: "Tài nguyên", desc: "Templates, tài liệu hỗ trợ" },
  { href: "/community", icon: Users, color: "#a855f7", bg: "rgba(168,85,247,0.1)", label: "Cộng đồng", desc: "Kết nối & học hỏi cùng nhau" },
];

const platformStats = [
  { label: "Học viên", value: "1,247", change: "+12%", icon: Users, color: "#22c55e" },
  { label: "Khoá học hoàn thành", value: "89%", change: "+5%", icon: TrendingUp, color: "#3b82f6" },
  { label: "Giờ học", value: "3,840", change: "+18%", icon: Clock, color: "#a855f7" },
  { label: "Đánh giá TB", value: "4.9 ⭐", change: "+0.1", icon: Star, color: "#f59e0b" },
];

function tierLabel(tier: string) {
  if (tier === "vip") return "VIP";
  if (tier === "member") return "Member";
  return "Free";
}

function tierColor(tier: string) {
  if (tier === "vip") return "#f59e0b";
  if (tier === "member") return "#a855f7";
  return "#22c55e";
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch authenticated user
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch profile (XP, level, tier, full_name)
  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name, xp, level, tier, streak").eq("id", user.id).single()
    : { data: null };

  // Fetch enrollment count
  const { count: enrollCount } = user
    ? await supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("user_id", user.id)
    : { count: 0 };

  // Fetch recent community posts
  const { data: recentPosts } = await supabase
    .from("posts")
    .select("id, content, created_at, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(4);

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "bạn";
  const xp = profile?.xp ?? 0;
  const level = profile?.level ?? 1;
  const tier = profile?.tier ?? "free";
  const streak = profile?.streak ?? 0;
  const courses = enrollCount ?? 0;

  // XP progress to next level
  const xpForCurrentLevel = (level - 1) * 200;
  const xpForNextLevel = level * 200;
  const xpProgress = Math.min(100, Math.round(((xp - xpForCurrentLevel) / 200) * 100));

  return (
    <div>
      <TopBar
        title="Tổng quan"
        subtitle={`Chào mừng bạn trở lại, ${displayName}`}
        notification={{ label: "Khoá học mới 🔥", text: "Digital Snacks — Kiếm tiền từ sản phẩm số" }}
      />

      <div className="p-6 max-w-6xl mx-auto space-y-8">

        {/* Welcome + User Stats */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Welcome card */}
          <div className="card-dark p-5">
            <h2 className="text-xl font-bold text-white mb-1">
              Xin chào, {displayName}! 👋
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Tiếp tục hành trình học tập của bạn hôm nay.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-gray-300">
                <BookOpen size={14} className="text-[#22c55e]" />
                <span>{courses} khoá đăng ký</span>
              </span>
              <span className="flex items-center gap-1.5 text-gray-300">
                <Zap size={14} className="text-[#f59e0b]" />
                <span>{streak} ngày liên tiếp</span>
              </span>
            </div>
          </div>

          {/* XP / Level card */}
          <div className="card-dark p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Cấp độ của bạn</div>
                <div className="text-2xl font-bold text-white">Level {level}</div>
              </div>
              <div
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: tierColor(tier) + "20", color: tierColor(tier) }}
              >
                {tierLabel(tier)}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>{xp} XP</span>
              <span>{xpForNextLevel} XP</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${xpProgress}%` }} />
            </div>
            <p className="text-xs text-gray-600 mt-1.5">
              Cần thêm {Math.max(0, xpForNextLevel - xp)} XP để lên Level {level + 1}
            </p>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {platformStats.map((s, i) => (
            <div key={i} className="card-dark p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500 font-medium">{s.label}</span>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: s.color + "20" }}
                >
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
          <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
            Truy cập nhanh
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {quickCards.map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className="card-dark p-4 hover:bg-[#222] transition-all duration-150 group cursor-pointer"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: card.bg }}
                >
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

        {/* Community + Premium */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Community */}
          <Link
            href="/community"
            className="card-dark p-5 flex items-center justify-between hover:bg-[#222] transition-all group"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(34,197,94,0.12)" }}
              >
                <Users size={20} style={{ color: "#22c55e" }} />
              </div>
              <div>
                <div className="font-semibold text-white">Tham gia Cộng đồng</div>
                <div className="text-sm text-gray-400">Kết nối, học hỏi và phát triển cùng nhau</div>
              </div>
            </div>
            <ArrowRight
              size={18}
              className="text-gray-500 group-hover:text-[#22c55e] transition-colors"
            />
          </Link>

          {/* Course consultation CTA */}
          <a
            href="https://zalo.me/0782276727"
            target="_blank"
            rel="noopener noreferrer"
            className="card-dark p-5 border border-[#22c55e]/20 hover:bg-[#222] transition-all"
            style={{ background: "rgba(34,197,94,0.05)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Star size={16} className="text-[#22c55e]" />
              <span className="font-semibold text-[#22c55e]">Cần hỗ trợ?</span>
            </div>
            <p className="text-sm text-gray-400 mb-3">
              Liên hệ để được tư vấn khoá học phù hợp với nhu cầu và mục tiêu của bạn.
            </p>
            <span className="btn-green text-sm inline-flex items-center gap-1.5">
              <Users size={14} />
              Tư vấn khoá học phù hợp nhu cầu
            </span>
          </a>
        </div>

        {/* Recent Community Activity */}
        {recentPosts && recentPosts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Hoạt động cộng đồng
              </h3>
              <Link
                href="/community"
                className="text-xs text-[#22c55e] hover:underline flex items-center gap-1"
              >
                Xem tất cả <ArrowRight size={12} />
              </Link>
            </div>
            <div className="card-dark divide-y divide-[#2a2a2a]">
              {recentPosts.map((post) => {
                const author = (post.profiles as { full_name?: string } | null)?.full_name ?? "Thành viên";
                const initials = author.split(" ").map((w: string) => w[0]).slice(-2).join("").toUpperCase();
                const preview = post.content.length > 80
                  ? post.content.slice(0, 80) + "…"
                  : post.content;
                const ago = (() => {
                  const diff = Date.now() - new Date(post.created_at).getTime();
                  const mins = Math.floor(diff / 60000);
                  if (mins < 60) return `${mins} phút trước`;
                  const hrs = Math.floor(mins / 60);
                  if (hrs < 24) return `${hrs} giờ trước`;
                  return `${Math.floor(hrs / 24)} ngày trước`;
                })();
                return (
                  <div key={post.id} className="flex items-center gap-3 p-4">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: "linear-gradient(135deg, #22c55e, #059669)" }}
                    >
                      {initials || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">
                        <span className="font-medium">{author}</span>
                        <span className="text-gray-400"> đã đăng: </span>
                        <span className="text-gray-300">{preview}</span>
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">{ago}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
