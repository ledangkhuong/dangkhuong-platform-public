import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import Image from "next/image";
import UserAvatar from "@/components/admin/UserAvatar";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { siteConfig } from "@/lib/site-config";
import {
  BookOpen, FolderOpen, FileText, Bell,
  Users, ArrowRight, TrendingUp, Star, Zap, PlayCircle
} from "lucide-react";
import LearningJourney from "@/components/profile/LearningJourney";

const quickCards = [
  { href: "/courses", icon: BookOpen, color: "#D4A843", bg: "rgba(212,168,67,0.1)", label: "Khoá học của tôi", desc: "Xem và học các khoá học" },
  { href: "/resources", icon: FolderOpen, color: "#3b82f6", bg: "rgba(59,130,246,0.1)", label: "Tài nguyên", desc: "Templates, tài liệu hỗ trợ" },
  { href: "/community", icon: Users, color: "#a855f7", bg: "rgba(168,85,247,0.1)", label: "Cộng đồng", desc: "Kết nối & học hỏi cùng nhau" },
];

/* Mobile-only quick access — compact, action-oriented */
const mobileQuickAccess = [
  { href: "/courses", icon: BookOpen, color: "#D4A843", bg: "rgba(212,168,67,0.1)", label: "Khoá học của tôi" },
  { href: "/notifications", icon: Bell, color: "#ef4444", bg: "rgba(239,68,68,0.1)", label: "Thông báo" },
  { href: "/community", icon: Users, color: "#a855f7", bg: "rgba(168,85,247,0.1)", label: "Cộng đồng" },
];

function tierLabel(tier: string) {
  if (tier === "vip") return "VIP";
  if (tier === "member") return "Member";
  return "Free";
}

function tierColor(tier: string) {
  if (tier === "vip") return "#f59e0b";
  if (tier === "member") return "#a855f7";
  return "#D4A843";
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch authenticated user
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login
  if (!user) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }

  // Fetch profile (XP, level, tier, full_name)
  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name, xp, level, tier, streak").eq("id", user.id).single()
    : { data: null };

  // Fetch active promotions for banner
  const adminClient = await createAdminClient();
  const { data: promotionsData } = await adminClient
    .from("promotions")
    .select("label, text, link")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const activePromotions = promotionsData ?? [];
  const currentPromo = activePromotions.length > 0 ? activePromotions[0] : null;

  // Fetch enrollment count + platform stats in parallel
  const [
    { count: enrollCount },
    { count: totalStudents },
    { count: completedCourses },
    { count: postCount },
  ] = await Promise.all([
    user
      ? supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("user_id", user.id)
      : Promise.resolve({ count: 0 }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    user
      ? supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("completed", true)
      : Promise.resolve({ count: 0 }),
    user
      ? supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id)
      : Promise.resolve({ count: 0 }),
  ]);

  // Calculate completion rate
  const totalEnrolled = enrollCount ?? 0;
  const completionRate = totalEnrolled > 0
    ? Math.round(((completedCourses ?? 0) / totalEnrolled) * 100)
    : 0;

  // Fetch recent posts, enrolled courses, and lesson progress in parallel
  const [{ data: recentPosts }, { data: enrolledProducts }, { data: lessonProgressRows }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, content, created_at, profiles(full_name, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(4),
    user
      ? supabase
          .from("enrollments")
          .select("product_id, completed, products(title, slug, thumbnail, chapters(id, lessons(id)))")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from("lesson_progress")
          .select("product_id, completed")
          .eq("user_id", user.id)
          .eq("completed", true)
      : Promise.resolve({ data: null }),
  ]);

  // Calculate per-course progress for mobile view
  const myCourseProgress = (enrolledProducts ?? []).map((e) => {
    const product = e.products as unknown as { title: string; slug: string; thumbnail: string | null; chapters: { id: string; lessons: { id: string }[] }[] } | null;
    const totalLessons = product?.chapters?.reduce((s, ch) => s + (ch.lessons?.length ?? 0), 0) ?? 0;
    const completedForProduct = (lessonProgressRows ?? []).filter(
      (r) => r.product_id === e.product_id && r.completed
    ).length;
    const pct = totalLessons > 0 ? Math.round((completedForProduct / totalLessons) * 100) : 0;
    return {
      id: e.product_id,
      title: product?.title ?? "Khoá học",
      slug: product?.slug ?? "",
      thumbnail: product?.thumbnail ?? null,
      progress: pct,
      completed: e.completed,
      totalLessons,
      completedLessons: completedForProduct,
    };
  });

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

  const platformStats = [
    { label: "Học viên", value: (totalStudents ?? 0).toLocaleString("vi-VN"), icon: Users, color: "#D4A843" },
    { label: "Khoá học hoàn thành", value: `${completionRate}%`, icon: TrendingUp, color: "#3b82f6" },
    { label: "Bài viết", value: (postCount ?? 0).toLocaleString("vi-VN"), icon: FileText, color: "#f59e0b" },
  ];

  return (
    <div>
      <TopBar
        title="Tổng quan"
        subtitle={`Chào mừng bạn trở lại, ${displayName}`}
        promotions={activePromotions.map((p) => ({
          label: p.label,
          text: p.text,
          link: p.link ?? undefined,
        }))}
      />

      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 sm:space-y-8">

        {/* ═══════ MOBILE LAYOUT ═══════ */}
        <div className="block lg:hidden space-y-5">
          {/* Greeting */}
          <div>
            <h2 className="text-lg font-bold text-white">
              Chào {displayName}! 👋
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Tiếp tục hành trình học tập hôm nay
            </p>
          </div>

          {/* Mobile Quick Access */}
          <div className="grid grid-cols-3 gap-2.5">
            {mobileQuickAccess.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="card-dark p-3 flex flex-col items-center gap-2 hover:bg-[#1a1a1a] transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: item.bg }}
                >
                  <item.icon size={20} style={{ color: item.color }} />
                </div>
                <span className="text-[11px] text-gray-300 font-medium text-center leading-tight">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Mobile: My Courses Progress */}
          {myCourseProgress.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <BookOpen size={14} className="text-[#D4A843]" />
                  Khoá học của tôi
                </h3>
                <Link href="/courses" className="text-xs text-[#D4A843] flex items-center gap-1">
                  Xem tất cả <ArrowRight size={11} />
                </Link>
              </div>
              <div className="space-y-2.5">
                {myCourseProgress.map((c) => (
                  <Link
                    key={c.id}
                    href={`/courses/${c.slug}`}
                    className="card-dark p-3 flex items-center gap-3 hover:bg-[#1a1a1a] transition-colors"
                  >
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-lg bg-[#222] overflow-hidden shrink-0">
                      {c.thumbnail ? (
                        <Image src={c.thumbnail} alt={c.title} width={48} height={48} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen size={18} className="text-gray-600" />
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 rounded-full bg-[#2a2a2a] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${c.progress}%`,
                              background: c.progress === 100 ? "#22c55e" : "#D4A843",
                            }}
                          />
                        </div>
                        <span className="text-[11px] text-gray-400 shrink-0">{c.progress}%</span>
                      </div>
                    </div>
                    {/* Play icon */}
                    <PlayCircle size={20} className="text-gray-500 shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Mobile: Learning Journey */}
          <div className="card-dark p-4">
            <LearningJourney />
          </div>

          {/* Mobile: Zalo CTA */}
          <a
            href={siteConfig.socials.zalo}
            target="_blank"
            rel="noopener noreferrer"
            className="card-dark p-4 border border-[#D4A843]/20 hover:bg-[#222] transition-all block"
            style={{ background: "rgba(212,168,67,0.05)" }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Star size={14} className="text-[#D4A843]" />
              <span className="text-sm font-semibold text-[#D4A843]">Cần hỗ trợ?</span>
            </div>
            <p className="text-xs text-gray-400 mb-2">Tư vấn khoá học phù hợp nhu cầu của bạn</p>
            <span className="btn-green text-xs inline-flex items-center gap-1.5">
              Liên hệ tư vấn
            </span>
          </a>
        </div>

        {/* ═══════ DESKTOP LAYOUT ═══════ */}
        <div className="hidden lg:block space-y-6">
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
                  <BookOpen size={14} className="text-[#D4A843]" />
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
                  <div className="text-xs text-gray-400 mb-0.5">Cấp độ của bạn</div>
                  <div className="text-2xl font-bold text-white">Level {level}</div>
                </div>
                <div
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: tierColor(tier) + "20", color: tierColor(tier) }}
                >
                  {tierLabel(tier)}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                <span>{xp} XP</span>
                <span>{xpForNextLevel} XP</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${xpProgress}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Cần thêm {Math.max(0, xpForNextLevel - xp)} XP để lên Level {level + 1}
              </p>
            </div>
          </div>

          {/* Platform Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {platformStats.map((s, i) => (
              <div key={i} className="card-dark p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-400 font-medium">{s.label}</span>
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: s.color + "20" }}
                  >
                    <s.icon size={14} style={{ color: s.color }} />
                  </div>
                </div>
                <div className="text-xl font-bold text-white">{s.value}</div>
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
                  <div className="text-xs text-gray-400 leading-snug">{card.desc}</div>
                </Link>
              ))}
            </div>
          </div>

          {/* Course consultation CTA */}
          <a
            href={siteConfig.socials.zalo}
            target="_blank"
            rel="noopener noreferrer"
            className="card-dark p-5 border border-[#D4A843]/20 hover:bg-[#222] transition-all block"
            style={{ background: "rgba(212,168,67,0.05)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Star size={16} className="text-[#D4A843]" />
              <span className="font-semibold text-[#D4A843]">Cần hỗ trợ?</span>
            </div>
            <p className="text-sm text-gray-400 mb-3">
              Liên hệ để được tư vấn khoá học phù hợp với nhu cầu và mục tiêu của bạn.
            </p>
            <span className="btn-green text-sm inline-flex items-center gap-1.5">
              <Users size={14} />
              Tư vấn khoá học phù hợp nhu cầu
            </span>
          </a>

          {/* Recent Community Activity */}
          {recentPosts && recentPosts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  Hoạt động cộng đồng
                </h3>
                <Link
                  href="/community"
                  className="text-xs text-[#D4A843] hover:underline flex items-center gap-1"
                >
                  Xem tất cả <ArrowRight size={12} />
                </Link>
              </div>
              <div className="card-dark divide-y divide-[#2a2a2a]">
                {recentPosts.map((post) => {
                  const profileData = post.profiles as { full_name?: string; avatar_url?: string } | null;
                  const author = profileData?.full_name ?? "Thành viên";
                  const avatarUrl = profileData?.avatar_url;
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
                      <UserAvatar
                        src={avatarUrl}
                        initials={initials || "?"}
                        size={32}
                        gradient="linear-gradient(135deg, #D4A843, #059669)"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">
                          <span className="font-medium">{author}</span>
                          <span className="text-gray-400"> đã đăng: </span>
                          <span className="text-gray-300">{preview}</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{ago}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Learning Journey */}
          <div className="card-dark p-5">
            <LearningJourney />
          </div>
        </div>
      </div>
    </div>
  );
}
