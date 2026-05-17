import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  PlayCircle,
  CheckCircle,
  Lock,
  BookOpen,
  Clock,
  Award,
  ClipboardCheck,
} from "lucide-react";
import LessonActions from "@/components/courses/LessonActions";
import LessonQA from "@/components/courses/LessonQA";
import VideoPlayer from "@/components/courses/VideoPlayer";
import CourseMobileLayout from "@/components/courses/CourseMobileLayout";
import CoursePublicView from "@/components/courses/CoursePublicView";
import LessonQuiz from "@/components/courses/LessonQuiz";

// force-dynamic: this page is personalized (auth state, enrollment, progress)
export const dynamic = "force-dynamic";

/* ─── Types ─── */

type Lesson = {
  id: string;
  title: string;
  youtube_id: string | null;
  duration_sec: number;
  content: string | null;
  sort_order: number;
  is_free: boolean;
  unlock_after_days?: number;
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

/* ─── Metadata ─── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("title, description, thumbnail")
    .eq("slug", slug)
    .single();

  if (!product) return { title: "Khoá học không tồn tại" };
  return {
    title: `${product.title} — Lê Đăng Khương Academy`,
    description: product.description ?? undefined,
    alternates: {
      canonical: `/courses/${slug}`,
    },
    openGraph: {
      title: `${product.title} — Lê Đăng Khương Academy`,
      description: product.description ?? undefined,
      images: product.thumbnail ? [product.thumbnail] : undefined,
    },
  };
}

/* ─── Page ─── */

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { slug } = await params;
  const { lesson: lessonId } = await searchParams;

  const supabase = await createClient();

  // Auth (optional — page works for both authed & unauthed)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch product (use admin client to bypass RLS)
  const adminDb = await createAdminClient();
  const { data: product } = await adminDb
    .from("products")
    .select("id, slug, title, description, description_html, price, sale_price, thumbnail, type, tier_required")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!product) notFound();

  // Fetch chapters + lessons (use admin client to bypass RLS on chapters/lessons tables)
  const { data: chaptersRaw } = await adminDb
    .from("chapters")
    .select(
      `
      id, title, sort_order,
      lessons(id, title, youtube_id, duration_sec, content, sort_order, is_free, unlock_after_days)
    `
    )
    .eq("product_id", product.id)
    .order("sort_order");

  const chapters: Chapter[] = (chaptersRaw ?? []).map((ch) => ({
    id: ch.id,
    title: ch.title,
    sort_order: ch.sort_order,
    lessons: [...(ch.lessons as Lesson[])].sort(
      (a, b) => a.sort_order - b.sort_order
    ),
  }));

  // ── JSON-LD Structured Data (schema.org/Course) ──
  const totalLessons = chapters.reduce((sum, ch) => sum + ch.lessons.length, 0);
  const totalDuration = chapters.reduce(
    (sum, ch) => sum + ch.lessons.reduce((s, l) => s + (l.duration_sec || 0), 0),
    0
  );
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: product.title,
    description: product.description || undefined,
    provider: {
      "@type": "Organization",
      name: "Lê Đăng Khương Academy",
      url: "https://dangkhuong.com",
    },
    url: `https://dangkhuong.com/courses/${product.slug}`,
    image: product.thumbnail || undefined,
    numberOfCredits: totalLessons,
    timeRequired: totalDuration > 0 ? `PT${Math.ceil(totalDuration / 60)}M` : undefined,
    inLanguage: "vi",
    offers: {
      "@type": "Offer",
      price: product.sale_price ?? product.price ?? 0,
      priceCurrency: "VND",
      availability: "https://schema.org/InStock",
      url: `https://dangkhuong.com/courses/${product.slug}`,
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: totalDuration > 0 ? `PT${Math.ceil(totalDuration / 60)}M` : undefined,
    },
  };

  /* ═══ PUBLIC / UNAUTHENTICATED ═══ */
  if (!user) {
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
        <CoursePublicView
        product={{
          id: product.id,
          slug: product.slug,
          title: product.title,
          description: product.description,
          description_html: product.description_html ?? null,
          price: product.price,
          sale_price: product.sale_price,
          thumbnail: product.thumbnail,
          type: product.type,
        }}
        chapters={chapters.map((ch) => ({
          ...ch,
          lessons: ch.lessons.map((l) => ({
            id: l.id,
            title: l.title,
            youtube_id: l.youtube_id,
            duration_sec: l.duration_sec,
            is_free: l.is_free,
            sort_order: l.sort_order,
          })),
        }))}
        isAuthenticated={false}
      />
      </>
    );
  }

  /* ═══ AUTHENTICATED ═══ */

  // Check enrollment (use admin client to bypass RLS)
  const { data: enrollment } = await adminDb
    .from("enrollments")
    .select("id, created_at")
    .eq("user_id", user.id)
    .eq("product_id", product.id)
    .maybeSingle();

  // Profile role
  const { data: profile } = await adminDb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const hasAccess =
    profile?.role === "admin" || !!enrollment || product.price === 0;
  const enrolledAt = enrollment?.created_at ?? undefined;

  /* ═══ AUTHENTICATED BUT NOT ENROLLED (paid course) ═══ */
  if (!hasAccess) {
    return (
      <div>
        <TopBar title={product.title} subtitle="Khoá học" />
        <CoursePublicView
          product={{
            id: product.id,
            slug: product.slug,
            title: product.title,
            description: product.description,
            description_html: product.description_html ?? null,
            price: product.price,
            sale_price: product.sale_price,
            thumbnail: product.thumbnail,
            type: product.type,
          }}
          chapters={chapters.map((ch) => ({
            ...ch,
            lessons: ch.lessons.map((l) => ({
              id: l.id,
              title: l.title,
              youtube_id: l.youtube_id,
              duration_sec: l.duration_sec,
              is_free: l.is_free,
              sort_order: l.sort_order,
              })),
          }))}
          isAuthenticated={true}
          productId={product.id}
          enrolledAt={enrolledAt}
        />
      </div>
    );
  }

  /* ═══ AUTHENTICATED + HAS ACCESS → FULL LEARNING EXPERIENCE ═══ */

  const allLessons = chapters.flatMap((ch) => ch.lessons);
  const totalLessonsAuth = allLessons.length;

  // Fetch user progress (admin client to bypass RLS)
  const { data: progressRows } = await adminDb
    .from("lesson_progress")
    .select("lesson_id, completed, watch_sec, note")
    .eq("user_id", user.id)
    .eq("product_id", product.id);

  const progressMap = new Map(
    (progressRows ?? []).map((p) => [p.lesson_id, p])
  );
  const completedCount = [...progressMap.values()].filter(
    (p) => p.completed
  ).length;
  const progressPct =
    totalLessonsAuth > 0
      ? Math.round((completedCount / totalLessonsAuth) * 100)
      : 0;

  // ── Sequential lesson locking ──
  // A lesson is sequentially unlocked if:
  //   1. It is the very first lesson in the course, OR
  //   2. ALL lessons that come before it (within the same chapter by sort_order,
  //      and all lessons in all previous chapters) are completed.
  const sequentiallyUnlockedSet = new Set<string>();
  let allPreviousCompleted = true;
  for (const ch of chapters) {
    for (const lesson of ch.lessons) {
      if (allPreviousCompleted) {
        sequentiallyUnlockedSet.add(lesson.id);
      }
      if (!progressMap.get(lesson.id)?.completed) {
        allPreviousCompleted = false;
      }
    }
  }

  // Drip lock helper (unlock_after_days from enrollment date)
  const isDripLocked = (lesson: Lesson): boolean => {
    if (
      !enrolledAt ||
      !lesson.unlock_after_days ||
      lesson.unlock_after_days === 0
    )
      return false;
    const enrollDate = new Date(enrolledAt);
    const unlockDate = new Date(
      enrollDate.getTime() + lesson.unlock_after_days * 24 * 60 * 60 * 1000
    );
    return new Date() < unlockDate;
  };

  // Combined lock: lesson must pass BOTH sequential AND drip checks
  const isLessonLocked = (lesson: Lesson): boolean => {
    return !sequentiallyUnlockedSet.has(lesson.id) || isDripLocked(lesson);
  };

  // Find the first uncompleted & unlocked lesson (for "go to next" button)
  const nextUncompletedLesson = allLessons.find(
    (l) =>
      !progressMap.get(l.id)?.completed &&
      sequentiallyUnlockedSet.has(l.id) &&
      !isDripLocked(l)
  );

  // Determine current lesson
  const currentLesson =
    (lessonId && allLessons.find((l) => l.id === lessonId)) ||
    allLessons.find((l) => !progressMap.get(l.id)?.completed) ||
    allLessons[0];

  const currentChapter = chapters.find((ch) =>
    ch.lessons.some((l) => l.id === currentLesson?.id)
  );

  const currentProgress = currentLesson
    ? progressMap.get(currentLesson.id)
    : null;
  // ─── Sidebar content ─────────────────────
  const sidebarContent = (
    <>
      <div className="p-4 border-b border-[#2a2a2a] hidden lg:block">
        <h3 className="font-semibold text-white text-sm">
          Nội dung khoá học
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {chapters.length} chương &bull; {totalLessonsAuth} bài học
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
        const allCompleted =
          chapterCompleted === chapterLessons.length &&
          chapterLessons.length > 0;

        return (
          <div key={chapter.id} className="border-b border-[#1f1f1f]">
            <div className="flex items-center justify-between p-3 bg-[#0d0d0d]">
              <div className="flex items-center gap-2">
                {allCompleted && (
                  <CheckCircle
                    size={12}
                    className="text-[#22c55e] shrink-0"
                  />
                )}
                <span className="text-xs font-semibold text-gray-300">
                  {chapter.title}
                </span>
              </div>
              <span className="text-[10px] text-gray-600">
                {chapterCompleted}/{chapterLessons.length}
              </span>
            </div>

            {chapterLessons.map((lesson) => {
              const prog = progressMap.get(lesson.id);
              const isActive = lesson.id === currentLesson?.id;
              const isDone = prog?.completed ?? false;
              const locked = isLessonLocked(lesson);
              const isAccessible = (hasAccess || lesson.is_free) && !locked;

              return (
                <a
                  key={lesson.id}
                  href={
                    isAccessible
                      ? `/courses/${slug}?lesson=${lesson.id}`
                      : undefined
                  }
                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors
                    ${isAccessible ? "cursor-pointer" : "cursor-not-allowed opacity-60"}
                    ${isActive && !locked ? "bg-[#D4A843]/10" : isAccessible ? "hover:bg-white/3" : ""}`}
                >
                  {locked ? (
                    <Lock size={14} className="text-gray-600 shrink-0" />
                  ) : isDone ? (
                    <CheckCircle
                      size={14}
                      className="text-[#22c55e] shrink-0"
                    />
                  ) : (
                    <PlayCircle
                      size={14}
                      className={`shrink-0 ${isActive ? "text-[#D4A843]" : "text-gray-600"}`}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs leading-snug ${
                        locked
                          ? "text-gray-600"
                          : isActive
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
                      style={{
                        background: "rgba(34,197,94,0.1)",
                        color: "#22c55e",
                      }}
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

      {totalLessonsAuth > 0 && (
        <div className="p-4">
          {progressPct === 100 ? (
            <a
              href={`/certificate/${slug}`}
              className="block rounded-lg p-3 text-center transition-all hover:scale-[1.02]"
              style={{
                background: "rgba(212,168,67,0.1)",
                border: "1px solid rgba(212,168,67,0.3)",
              }}
            >
              <Award size={22} className="text-[#D4A843] mx-auto mb-1.5" />
              <p className="text-xs font-bold text-[#D4A843] mb-0.5">
                Xem chứng chỉ hoàn thành
              </p>
              <p className="text-[10px] text-gray-500">
                Nhấn để xem và tải về chứng chỉ của bạn
              </p>
            </a>
          ) : (
            <div
              className="rounded-lg p-3 text-center"
              style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
              }}
            >
              <Award
                size={20}
                className="text-[#f59e0b] mx-auto mb-1.5"
              />
              <p className="text-xs font-medium text-[#f59e0b] mb-0.5">
                Chứng chỉ hoàn thành
              </p>
              <p className="text-[10px] text-gray-500">
                {`Hoàn thành 100% để nhận chứng chỉ (đang ở ${progressPct}%)`}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );

  // ─── Check if current lesson is locked ──
  const currentLessonLocked = currentLesson ? isLessonLocked(currentLesson) : false;

  // ─── Main content ─────────────────────
  const mainContent = (
    <>
      {/* Locked lesson message */}
      {currentLesson && currentLessonLocked && (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div
            className="rounded-2xl p-8 max-w-md w-full"
            style={{
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.2)",
            }}
          >
            <div className="text-4xl mb-4">&#x1F512;</div>
            <h3 className="text-lg font-bold text-white mb-2">
              Bài học chưa được mở khoá
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              Vui lòng hoàn thành bài học trước đó để mở khoá bài này
            </p>
            {nextUncompletedLesson && (
              <a
                href={`/courses/${slug}?lesson=${nextUncompletedLesson.id}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-black transition-all hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(135deg, #D4A843, #B8922E)",
                }}
              >
                <PlayCircle size={16} />
                Đến bài tiếp theo
              </a>
            )}
          </div>
        </div>
      )}

      {/* Video player */}
      {(hasAccess || currentLesson?.is_free) && currentLesson && !currentLessonLocked && (
        <>
          <div className="mb-4 sm:mb-5">
            {currentLesson.youtube_id ? (
              <VideoPlayer
                youtubeId={currentLesson.youtube_id}
                title={currentLesson.title}
                lessonId={currentLesson.id}
                productId={product.id}
                initialCompleted={currentProgress?.completed ?? false}
              />
            ) : (
              <div
                className="rounded-xl overflow-hidden bg-black aspect-video relative"
                style={{ border: "1px solid #2a2a2a" }}
              >
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4"
                  style={{
                    background:
                      "linear-gradient(135deg, #111 0%, #1a1a1a 100%)",
                  }}
                >
                  <PlayCircle
                    size={48}
                    className="text-[#D4A843] opacity-80 sm:w-16 sm:h-16"
                  />
                  <p className="text-gray-400 text-xs sm:text-sm text-center">
                    {currentLesson.title}
                  </p>
                  {currentChapter && (
                    <p className="text-gray-600 text-xs text-center">
                      {currentChapter.title}
                      {currentLesson.duration_sec
                        ? ` • ${formatDuration(currentLesson.duration_sec)}`
                        : ""}
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
            <h2 className="text-lg sm:text-xl font-bold text-white mb-2">
              {currentLesson.title}
            </h2>
            <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500 flex-wrap">
              {currentLesson.duration_sec > 0 && (
                <span className="flex items-center gap-1">
                  <Clock size={13} />{" "}
                  {formatDuration(currentLesson.duration_sec)}
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
                {currentLesson.content
                  .split(/(https?:\/\/[^\s]+)/g)
                  .map((part, i) =>
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
          {totalLessonsAuth > 0 && (
            <div className="card-dark p-4 mb-4 sm:mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">
                  Tiến độ khoá học
                </span>
                <span className="text-sm font-bold text-[#22c55e]">
                  {progressPct}%
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Hoàn thành {completedCount}/{totalLessonsAuth} bài học
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

          {/* Quiz */}
          <div className="mb-4 sm:mb-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
              <ClipboardCheck size={16} className="text-[#D4A843]" />
              Bài kiểm tra
            </h3>
            <LessonQuiz lessonId={currentLesson.id} />
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
        lessonCount={totalLessonsAuth}
        chapterCount={chapters.length}
      />
    </div>
  );
}
