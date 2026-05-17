import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  Users,
  BookCheck,
  Clock,
  GraduationCap,
} from "lucide-react";
import CourseStudentList from "@/components/admin/CourseStudentList";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LessonRow {
  id: string;
  title: string;
  duration_sec: number;
  sort_order: number;
}

interface ChapterRow {
  id: string;
  title: string;
  sort_order: number;
  lessons: LessonRow[];
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function CourseStudentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = await params;

  /* ── Auth ───────────────────────────────────────────────────── */
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role))
    redirect("/dashboard");

  const adminClient = await createAdminClient();

  /* ── Parallel data fetching ─────────────────────────────────── */
  const [courseRes, chaptersRes, enrollmentsRes, progressRes, questionsRes] =
    await Promise.all([
      adminClient
        .from("products")
        .select("id, title, slug, thumbnail")
        .eq("id", courseId)
        .single(),
      adminClient
        .from("chapters")
        .select("id, title, sort_order, lessons(id, title, duration_sec, sort_order)")
        .eq("product_id", courseId)
        .order("sort_order"),
      adminClient
        .from("enrollments")
        .select("id, user_id, source, created_at, profiles(id, full_name, avatar_url, phone)")
        .eq("product_id", courseId)
        .order("created_at", { ascending: false }),
      adminClient
        .from("lesson_progress")
        .select("user_id, lesson_id, completed, watch_sec, updated_at")
        .eq("product_id", courseId),
      adminClient
        .from("lesson_questions")
        .select("id, user_id, lesson_id, content, reply, replied_at, status, created_at")
        .eq("product_id", courseId)
        .order("created_at", { ascending: false }),
    ]);

  const course = courseRes.data;
  if (!course) redirect("/admin/courses");

  const chapters = (chaptersRes.data ?? []) as ChapterRow[];
  const enrollments = enrollmentsRes.data ?? [];
  const allProgress = progressRes.data ?? [];
  const allQuestions = questionsRes.data ?? [];

  /* ── Fetch emails from auth ─────────────────────────────────── */
  const emailMap: Record<string, string> = {};
  const userIds = new Set(enrollments.map((e: any) => e.user_id));

  let page = 1;
  const perPage = 1000;
  while (userIds.size > 0) {
    const {
      data: { users },
    } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (!users || users.length === 0) break;
    for (const u of users) {
      if (userIds.has(u.id)) {
        emailMap[u.id] = u.email || "";
      }
    }
    if (users.length < perPage) break;
    page++;
  }

  /* ── Build course structure ─────────────────────────────────── */
  const courseStructure = chapters
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((ch) => ({
      id: ch.id,
      title: ch.title,
      sortOrder: ch.sort_order,
      lessons: (ch.lessons || [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((l) => ({
          id: l.id,
          title: l.title,
          durationSec: l.duration_sec || 0,
          sortOrder: l.sort_order,
        })),
    }));

  const totalLessons = courseStructure.reduce(
    (sum, ch) => sum + ch.lessons.length,
    0
  );

  /* ── Aggregate per-student ──────────────────────────────────── */
  const progressByUser: Record<string, typeof allProgress> = {};
  for (const p of allProgress) {
    if (!progressByUser[p.user_id]) progressByUser[p.user_id] = [];
    progressByUser[p.user_id].push(p);
  }

  const questionsByUser: Record<string, typeof allQuestions> = {};
  for (const q of allQuestions) {
    if (!questionsByUser[q.user_id]) questionsByUser[q.user_id] = [];
    questionsByUser[q.user_id].push(q);
  }

  const students = enrollments.map((enrollment: any) => {
    const userProgress = progressByUser[enrollment.user_id] || [];
    const userQuestions = questionsByUser[enrollment.user_id] || [];
    const completedLessons = userProgress.filter((p) => p.completed).length;
    const totalWatchSec = userProgress.reduce(
      (sum, p) => sum + (p.watch_sec || 0),
      0
    );
    const lastActivity =
      userProgress.length > 0
        ? userProgress.reduce(
            (latest, p) => (p.updated_at > latest ? p.updated_at : latest),
            userProgress[0].updated_at
          )
        : null;

    const prof = enrollment.profiles || {};

    return {
      enrollmentId: enrollment.id,
      userId: enrollment.user_id,
      enrolledAt: enrollment.created_at,
      source: enrollment.source || "purchase",
      fullName: prof.full_name || "Không tên",
      email: emailMap[enrollment.user_id] || "",
      avatarUrl: prof.avatar_url || null,
      phone: prof.phone || null,
      completedLessons,
      totalLessons,
      totalWatchSec,
      lastActivity,
      questionCount: userQuestions.length,
      lessonProgress: userProgress.map((p) => ({
        lessonId: p.lesson_id,
        completed: p.completed,
        watchSec: p.watch_sec || 0,
        updatedAt: p.updated_at,
      })),
      questions: userQuestions.map((q) => ({
        id: q.id,
        content: q.content,
        status: q.status,
        reply: q.reply,
        repliedAt: q.replied_at,
        createdAt: q.created_at,
        lessonId: q.lesson_id,
      })),
    };
  });

  /* ── Stats ──────────────────────────────────────────────────── */
  const totalStudents = students.length;
  const avgCompletion =
    totalStudents > 0
      ? Math.round(
          students.reduce(
            (sum, s) =>
              sum +
              (totalLessons > 0
                ? (s.completedLessons / totalLessons) * 100
                : 0),
            0
          ) / totalStudents
        )
      : 0;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const activeThisWeek = students.filter(
    (s) => s.lastActivity && new Date(s.lastActivity) > weekAgo
  ).length;
  const completedAll = students.filter(
    (s) => totalLessons > 0 && s.completedLessons === totalLessons
  ).length;

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div>
      <TopBar
        title={`Học viên — ${course.title}`}
        subtitle="Quản lý và theo dõi tiến độ học tập của từng học viên"
      />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Back */}
        <Link
          href="/admin/courses"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Quay lại danh sách khoá học
        </Link>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            icon={<Users size={20} className="text-[#3b82f6]" />}
            bg="rgba(59,130,246,0.09)"
            value={totalStudents}
            label="Tổng học viên"
          />
          <StatCard
            icon={<BookCheck size={20} className="text-[#22c55e]" />}
            bg="rgba(34,197,94,0.09)"
            value={`${avgCompletion}%`}
            label="Hoàn thành TB"
          />
          <StatCard
            icon={<Clock size={20} className="text-[#f59e0b]" />}
            bg="rgba(245,158,11,0.09)"
            value={activeThisWeek}
            label="Active 7 ngày"
          />
          <StatCard
            icon={<GraduationCap size={20} className="text-[#D4A843]" />}
            bg="rgba(212,168,67,0.09)"
            value={completedAll}
            label="Hoàn thành 100%"
          />
        </div>

        {/* Student list */}
        <CourseStudentList
          students={students}
          courseStructure={courseStructure}
          courseId={courseId}
          totalLessons={totalLessons}
        />
      </div>
    </div>
  );
}

/* ── Stat Card ───────────────────────────────────────────────── */

function StatCard({
  icon,
  bg,
  value,
  label,
}: {
  icon: React.ReactNode;
  bg: string;
  value: string | number;
  label: string;
}) {
  return (
    <div className="stat-card flex items-center gap-4">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: bg }}
      >
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-white leading-none mb-1">
          {value}
        </div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}
