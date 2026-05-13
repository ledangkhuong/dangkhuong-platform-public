import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import { createClient } from "@/lib/supabase/server";
import { PlayCircle, CheckCircle, Lock, BookOpen, Clock, Award } from "lucide-react";
import LessonActions from "@/components/courses/LessonActions";
import LessonQA from "@/components/courses/LessonQA";
import VideoPlayer from "@/components/courses/VideoPlayer";
import CourseMobileLayout from "@/components/courses/CourseMobileLayout";

type Lesson = {
  id: string;
  title: string;
  youtube_id: string | null;
  duration_sec: number;
  content: string | null;
  sort_order: number;
  is_free: boolean;
};

type Chapter = {
  id: string;
  title: string;
  sort_order: number;
  lessons: Lesson[];
};

function formatDuration(sec: number) {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("title, description")
    .eq("slug", id)
    .single();

  if (!product) return { title: "Khoá học không tồn tại" };
  return {
    title: `${product.title} — Đăng Khương Academy`,
    description: product.description ?? undefined,
  };
}

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { id: slug } = await params;
  const { lesson: lessonId } = await searchParams;

  const supabase = await createClient();

  // Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch product
  const { data: product } = await supabase
    .from("products")
    .select("id, slug, title, description, price, tier_required")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!product) notFound();

  // Check access: enrolled or free
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", product.id)
    .maybeSingle();

  // Fetch user profile role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const hasAccess = profile?.role === "admin" || !!enrollment || product.price === 0;

  // Fetch chapters + lessons
  const { data: chaptersRaw } = await supabase
    .from("chapters")
    .select(`
      id, title, sort_order,
      lessons(id, title, youtube_id, duration_sec, content, sort_order, is_free)
    `)
    .eq("product_id", product.id)
    .order("sort_order");

  const chapters: Chapter[] = (chaptersRaw ?? []).map((ch) => ({
    id: ch.id,
    title: ch.title,
    sort_order: ch.sort_order,
    lessons: [...(ch.lessons as Lesson[])].sort((a, b) => a.sort_order - b.sort_order),
  }));

  // Flatten all lessons
  const allLessons = chapters.flatMap((ch) => ch.lessons);
  const totalLessons = allLessons.length;

  // Fetch user progress
  const { data: progressRows } = await supabase
    .from("lesson_progress")
    .select("lesson_id, completed, watch_sec, note")
    .eq("user_id", user.id)
    .eq("product_id", product.id);

  const progressMap = new Map(
    (progressRows ?? []).map((p) => [p.lesson_id, p])
  );
  const completedCount = [...progressMap.values()].filter((p) => p.completed).length;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Determine current lesson
  const currentLesson =
    (lessonId && allLessons.find((l) => l.id === lessonId)) ||
    allLessons.find((l) => !progressMap.get(l.id)?.completed) ||
    allLessons[0];

  // Find the chapter the current lesson belongs to
  const currentChapter = chapters.find((ch) =>
    ch.lessons.some((l) => l.id === currentLesson?.id)
  );

  const currentProgress = currentLesson ? progressMap.get(currentLesson.id) : null;
  const canAccessCurrentLesson = hasAccess || currentLesson?.is_free;

  // ─── Sidebar content (reused for desktop & mobile) ─────────────────────
  const sidebarContent = (
    <>
      {/* Header shown only on desktop (mobile has its own in CourseMobileLayout) */}
      <div className="p-4 border-b border-[#2a2a2a] hidden lg:block">
        <h3 className="font-semibold text-white text-sm">Nội dung khoá học</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {chapters.length} chương &bull; {totalLessons} bài học
        </p>
      </div>

      {chapters.length === 0 && (
        <div className="p-6 text-center text-gray-500 text-sm">
          Nội dung đang được cập nhật...
        </div>
      )}

      {chapters.map((chapter) => {
        const chapterLessons = chapter.lessons;
        const chapterCompleted = chapterLessons.filter(
          (l) => progressMap.get(l.id)?.completed
        ).length;
        const allCompleted = chapterCompleted === chapterLessons.length && chapterLessons.length > 0;

        return (
          <div key={chapter.id} className="border-b border-[#1f1f1f]">
            <div className="flex items-center justify-between p-3 bg-[#0d0d0d]">
              <div className="flex items-center gap-2">
                {allCompleted && <CheckCircle size={12} className="text-[#22c55e] shrink-0" />}
                <span className="text-xs font-semibold text-gray-300">{chapter.title}</span>
              </div>
              <span className="text-[10px] text-gray-600">
                {chapterCompleted}/{chapterLessons.length}
              </span>
            </div>

            {chapterLessons.map((lesson) => {
              const prog = progressMap.get(lesson.id);
              const isActive = lesson.id === currentLesson?.id;
              const isDone = prog?.completed ?? false;
              const isAccessible = hasAccess || lesson.is_free;

              return (
                <a
                  key={lesson.id}
                  href={isAccessible ? `/courses/${slug}?lesson=${lesson.id}` : undefined}
                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors
                    ${isAccessible ? "cursor-pointer" : "cursor-not-allowed opacity-60"}
                    ${isActive ? "bg-[#D4A843]/10" : "hover:bg-white/3"}`}
                >
                  {!isAccessible ? (
                    <Lock size={14} className="text-[#f59e0b] shrink-0" />
                  ) : isDone ? (
                    <CheckCircle size={14} className="text-[#22c55e] shrink-0" />
                  ) : (
                    <PlayCircle
                      size={14}
                      className={`shrink-0 ${isActive ? "text-[#D4A843]" : "text-gray-600"}`}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs leading-snug ${
                        isActive
                          ? "text-[#D4A843] font-medium"
                          : isDone
                          ? "text-gray-500 line-through"
                          : "text-gray-300"
                      }`}
                    >
                      {lesson.title}
                    </p>
                    {lesson.duration_sec > 0 && (
                      <span className="text-[10px] text-gray-600">
                        {formatDuration(lesson.duration_sec)}
                      </span>
                    )}
                  </div>
                  {lesson.is_free && !hasAccess && (
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0"
                      style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}
                    >
                      Free
                    </span>
                  )}
                </a>
              );
            })}
          </div>
        );
      })}

      {totalLessons > 0 && (
        <div className="p-4">
          <div
            className="rounded-lg p-3 text-center"
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.2)",
            }}
          >
            <Award size={20} className="text-[#f59e0b] mx-auto mb-1.5" />
            <p className="text-xs font-medium text-[#f59e0b] mb-0.5">Chứng chỉ hoàn thành</p>
            <p className="text-[10px] text-gray-500">
              {progressPct === 100
                ? "Bạn đã hoàn thành khoá học!"
                : `Hoàn thành 100% để nhận chứng chỉ (đang ở ${progressPct}%)`}
            </p>
          </div>
        </div>
      )}
    </>
  );

  // ─── Main content ─────────────────────────────────────────────────────
  const mainContent = (
    <>
      {/* Access blocked */}
      {!hasAccess && !currentLesson?.is_free && (
        <div
          className="rounded-xl p-6 sm:p-8 text-center mb-5"
          style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)" }}
        >
          <div className="text-3xl sm:text-4xl mb-3">🔐</div>
          <h2 className="text-lg sm:text-xl font-bold text-white mb-2">Khoá học này yêu cầu đăng ký</h2>
          <p className="text-sm text-gray-400 mb-4">
            Mua khoá học hoặc nâng cấp Quyền Đồng Hành để truy cập toàn bộ nội dung.
          </p>
          <button className="btn-gold">
            <Lock size={14} />
            Mua khoá học — {product.price.toLocaleString("vi-VN")}đ
          </button>
        </div>
      )}

      {/* Video player */}
      {(hasAccess || currentLesson?.is_free) && currentLesson && (
        <>
          <div className="mb-4 sm:mb-5">
            {currentLesson.youtube_id ? (
              <VideoPlayer
                youtubeId={currentLesson.youtube_id}
                title={currentLesson.title}
              />
            ) : (
              <div
                className="rounded-xl overflow-hidden bg-black aspect-video relative"
                style={{ border: "1px solid #2a2a2a" }}
              >
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4"
                  style={{ background: "linear-gradient(135deg, #111 0%, #1a1a1a 100%)" }}
                >
                  <PlayCircle size={48} className="text-[#D4A843] opacity-80 sm:w-16 sm:h-16" />
                  <p className="text-gray-400 text-xs sm:text-sm text-center">{currentLesson.title}</p>
                  {currentChapter && (
                    <p className="text-gray-600 text-xs text-center">
                      {currentChapter.title}
                      {currentLesson.duration_sec ? ` • ${formatDuration(currentLesson.duration_sec)}` : ""}
                    </p>
                  )}
                  <p className="text-gray-700 text-xs mt-2">
                    Video chưa được cập nhật
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Lesson info */}
          <div className="mb-4 sm:mb-5">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-2">{currentLesson.title}</h2>
            <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500 flex-wrap">
              {currentLesson.duration_sec > 0 && (
                <span className="flex items-center gap-1">
                  <Clock size={13} /> {formatDuration(currentLesson.duration_sec)}
                </span>
              )}
              {currentChapter && (
                <span className="flex items-center gap-1">
                  <BookOpen size={13} /> {currentChapter.title}
                </span>
              )}
            </div>
          </div>

          {/* Lesson content */}
          {currentLesson.content && (
            <div className="card-dark p-4 sm:p-5 mb-4 sm:mb-5 prose prose-invert prose-sm max-w-none">
              <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                {currentLesson.content.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                  /^https?:\/\//.test(part) ? (
                    <a
                      key={i}
                      href={part}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#D4A843] underline underline-offset-2 hover:text-[#B8922E] break-all transition-colors"
                    >
                      {part}
                    </a>
                  ) : (
                    <span key={i}>{part}</span>
                  )
                )}
              </div>
            </div>
          )}

          {/* Progress card */}
          {totalLessons > 0 && (
            <div className="card-dark p-4 mb-4 sm:mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">Tiến độ khoá học</span>
                <span className="text-sm font-bold text-[#22c55e]">{progressPct}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Hoàn thành {completedCount}/{totalLessons} bài học
              </p>
            </div>
          )}

          {/* Mark complete */}
          <div className="mb-4 sm:mb-5">
            <LessonActions
              lessonId={currentLesson.id}
              productId={product.id}
              initialCompleted={currentProgress?.completed ?? false}
            />
          </div>

          {/* Q&A */}
          <LessonQA
            productId={product.id}
            lessonId={currentLesson.id}
            lessonTitle={currentLesson.title}
          />
        </>
      )}
    </>
  );

  return (
    <div>
      <TopBar title={product.title} subtitle="Khoá học" />

      <CourseMobileLayout
        mainContent={mainContent}
        sidebarContent={sidebarContent}
        lessonCount={totalLessons}
        chapterCount={chapters.length}
      />
    </div>
  );
}
