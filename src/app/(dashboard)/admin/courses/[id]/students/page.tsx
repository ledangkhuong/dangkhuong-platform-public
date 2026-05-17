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
  Download,
  Filter,
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

type FilterTab = "all" | "completed" | "in_progress" | "inactive";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "completed", label: "Hoàn thành" },
  { key: "in_progress", label: "Đang học" },
  { key: "inactive", label: "Không hoạt động" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateVN(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function escapeCSV(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function CourseStudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { id: courseId } = await params;
  const { filter: filterParam } = await searchParams;

  const activeFilter: FilterTab =
    filterParam && ["all", "completed", "in_progress", "inactive"].includes(filterParam)
      ? (filterParam as FilterTab)
      : "all";

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

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const allStudents = enrollments.map((enrollment: any) => {
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
    const progressPct =
      totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0;

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
      progressPct,
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

  /* ── Filter students by active tab ──────────────────────────── */
  const filteredStudents = allStudents.filter((s) => {
    switch (activeFilter) {
      case "completed":
        return totalLessons > 0 && s.completedLessons === totalLessons;
      case "in_progress":
        return (
          s.completedLessons > 0 &&
          (totalLessons === 0 || s.completedLessons < totalLessons) &&
          (s.lastActivity ? new Date(s.lastActivity) > sevenDaysAgo : false)
        );
      case "inactive":
        return (
          !s.lastActivity ||
          new Date(s.lastActivity) <= sevenDaysAgo
        );
      default:
        return true;
    }
  });

  /* ── Stats (computed from ALL students, not filtered) ───────── */
  const totalStudents = allStudents.length;
  const avgCompletion =
    totalStudents > 0
      ? Math.round(
          allStudents.reduce(
            (sum, s) =>
              sum +
              (totalLessons > 0
                ? (s.completedLessons / totalLessons) * 100
                : 0),
            0
          ) / totalStudents
        )
      : 0;

  const activeThisWeek = allStudents.filter(
    (s) => s.lastActivity && new Date(s.lastActivity) > sevenDaysAgo
  ).length;
  const completedAll = allStudents.filter(
    (s) => totalLessons > 0 && s.completedLessons === totalLessons
  ).length;

  /* ── Tab counts ─────────────────────────────────────────────── */
  const tabCounts: Record<FilterTab, number> = {
    all: allStudents.length,
    completed: completedAll,
    in_progress: allStudents.filter(
      (s) =>
        s.completedLessons > 0 &&
        (totalLessons === 0 || s.completedLessons < totalLessons) &&
        (s.lastActivity ? new Date(s.lastActivity) > sevenDaysAgo : false)
    ).length,
    inactive: allStudents.filter(
      (s) => !s.lastActivity || new Date(s.lastActivity) <= sevenDaysAgo
    ).length,
  };

  /* ── CSV data URI ───────────────────────────────────────────── */
  const csvHeader = "Tên,Email,Tiến độ (%),Ngày đăng ký,Ngày hoàn thành\n";
  const csvRows = allStudents
    .map((s) => {
      const completionDate =
        totalLessons > 0 && s.completedLessons === totalLessons && s.lastActivity
          ? formatDateVN(s.lastActivity)
          : "";
      return [
        escapeCSV(s.fullName),
        escapeCSV(s.email),
        String(s.progressPct),
        formatDateVN(s.enrolledAt),
        completionDate,
      ].join(",");
    })
    .join("\n");
  const csvContent = csvHeader + csvRows;
  const csvDataUri =
    "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);

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

        {/* Filter tabs + CSV export */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#151515]" style={{ border: "1px solid #2a2a2a" }}>
            {FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab.key;
              return (
                <Link
                  key={tab.key}
                  href={
                    tab.key === "all"
                      ? `/admin/courses/${courseId}/students`
                      : `/admin/courses/${courseId}/students?filter=${tab.key}`
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? "bg-[#D4A843]/15 text-[#D4A843]"
                      : "text-gray-500 hover:text-gray-300 hover:bg-[#1f1f1f]"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-[#D4A843]/20 text-[#D4A843]"
                        : "bg-[#252525] text-gray-600"
                    }`}
                  >
                    {tabCounts[tab.key]}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* CSV Export */}
          <a
            href={csvDataUri}
            download={`students-${course.slug || courseId}.csv`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-gray-300 hover:text-white hover:bg-[#1f1f1f] transition-colors shrink-0"
            style={{ border: "1px solid #2a2a2a" }}
          >
            <Download size={14} />
            Xuất CSV
          </a>
        </div>

        {/* Active filter indicator */}
        {activeFilter !== "all" && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Filter size={12} />
            <span>
              Đang lọc:{" "}
              <span className="text-[#D4A843] font-medium">
                {FILTER_TABS.find((t) => t.key === activeFilter)?.label}
              </span>
              {" "}&middot;{" "}
              {filteredStudents.length} học viên
            </span>
          </div>
        )}

        {/* Student list */}
        <CourseStudentList
          students={filteredStudents}
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
