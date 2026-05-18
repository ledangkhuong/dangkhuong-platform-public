/**
 * Admin Quiz Management Page
 *
 * SIDEBAR NOTE: Add this link to adminNav in src/components/layout/Sidebar.tsx:
 *   { href: "/admin/quizzes", icon: ClipboardCheck, label: "Quản lý Quiz", roles: ["admin", "manager"] },
 * Import ClipboardCheck from lucide-react.
 */

import TopBar from "@/components/layout/TopBar";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  ClipboardCheck,
  BookOpen,
  Users,
  TrendingUp,
  Plus,
} from "lucide-react";
import CreateQuizForm from "@/components/admin/CreateQuizForm";
import DeleteQuizButton from "@/components/admin/DeleteQuizButton";

export const dynamic = "force-dynamic";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function AdminQuizzesPage() {
  // Auth check
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await authClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  // Fetch quizzes via API-like logic (using admin client)
  const admin = await createAdminClient();

  const { data: quizzes } = await admin
    .from("quizzes")
    .select(`
      id, title, pass_score, lesson_id, created_at,
      lessons!inner(title, chapter_id,
        chapters!inner(title, product_id,
          products!inner(title)
        )
      )
    `)
    .order("created_at", { ascending: false });

  // Question counts
  const { data: questionCounts } = await admin
    .from("quiz_questions")
    .select("quiz_id");

  const qCountMap: Record<string, number> = {};
  for (const qc of questionCounts ?? []) {
    qCountMap[qc.quiz_id] = (qCountMap[qc.quiz_id] || 0) + 1;
  }

  // Attempt stats
  const { data: attempts } = await admin
    .from("quiz_attempts")
    .select("quiz_id, score, passed");

  const attemptStats: Record<
    string,
    { count: number; totalScore: number; passedCount: number }
  > = {};
  for (const a of attempts ?? []) {
    if (!attemptStats[a.quiz_id]) {
      attemptStats[a.quiz_id] = { count: 0, totalScore: 0, passedCount: 0 };
    }
    attemptStats[a.quiz_id].count++;
    attemptStats[a.quiz_id].totalScore += a.score;
    if (a.passed) attemptStats[a.quiz_id].passedCount++;
  }

  // Build display rows
  const rows = (quizzes ?? []).map((q: Record<string, unknown>) => {
    const lesson = q.lessons as Record<string, unknown>;
    const chapter = lesson?.chapters as Record<string, unknown>;
    const product = chapter?.products as Record<string, unknown>;
    const stats = attemptStats[q.id as string] || {
      count: 0,
      totalScore: 0,
      passedCount: 0,
    };
    return {
      id: q.id as string,
      title: q.title as string,
      pass_score: q.pass_score as number,
      lesson_title: (lesson?.title as string) ?? "",
      chapter_title: (chapter?.title as string) ?? "",
      course_title: (product?.title as string) ?? "",
      question_count: qCountMap[q.id as string] || 0,
      attempts_count: stats.count,
      avg_score:
        stats.count > 0
          ? Math.round(stats.totalScore / stats.count)
          : 0,
      pass_rate:
        stats.count > 0
          ? Math.round((stats.passedCount / stats.count) * 100)
          : 0,
      created_at: q.created_at as string,
    };
  });

  // Fetch lessons for the create form (all lessons from all courses)
  const { data: allLessons } = await admin
    .from("lessons")
    .select(`
      id, title, chapter_id,
      chapters!inner(title, product_id,
        products!inner(title)
      )
    `)
    .order("title", { ascending: true });

  // Find lessons that already have quizzes so we can exclude them
  const lessonsWithQuizzes = new Set(
    (quizzes ?? []).map((q: Record<string, unknown>) => q.lesson_id as string)
  );

  const availableLessons = (allLessons ?? [])
    .filter((l: Record<string, unknown>) => !lessonsWithQuizzes.has(l.id as string))
    .map((l: Record<string, unknown>) => {
      const ch = l.chapters as Record<string, unknown>;
      const pr = ch?.products as Record<string, unknown>;
      return {
        id: l.id as string,
        title: l.title as string,
        chapter_title: (ch?.title as string) ?? "",
        course_title: (pr?.title as string) ?? "",
      };
    });

  // Stats
  const totalQuizzes = rows.length;
  const totalAttempts = rows.reduce((s, r) => s + r.attempts_count, 0);
  const overallAvgScore =
    totalAttempts > 0
      ? Math.round(
          rows.reduce((s, r) => s + r.avg_score * r.attempts_count, 0) /
            totalAttempts
        )
      : 0;

  return (
    <div className="min-h-screen">
      <TopBar title="Quản lý Quiz" />

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-dark p-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(212,168,67,0.15)" }}
              >
                <ClipboardCheck size={18} className="text-[#D4A843]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalQuizzes}</p>
                <p className="text-xs text-gray-500">Tổng quiz</p>
              </div>
            </div>
          </div>

          <div className="card-dark p-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(59,130,246,0.15)" }}
              >
                <Users size={18} className="text-[#3b82f6]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {totalAttempts}
                </p>
                <p className="text-xs text-gray-500">Lượt làm bài</p>
              </div>
            </div>
          </div>

          <div className="card-dark p-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(34,197,94,0.15)" }}
              >
                <TrendingUp size={18} className="text-[#22c55e]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {overallAvgScore}%
                </p>
                <p className="text-xs text-gray-500">Điểm trung bình</p>
              </div>
            </div>
          </div>
        </div>

        {/* Create quiz form */}
        <CreateQuizForm lessons={availableLessons} />

        {/* Quiz list */}
        <div className="card-dark overflow-hidden">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <BookOpen size={16} className="text-[#D4A843]" />
              Danh sách Quiz ({rows.length})
            </h2>
          </div>

          {rows.length === 0 ? (
            <div className="p-8 text-center">
              <ClipboardCheck
                size={40}
                className="text-gray-700 mx-auto mb-3"
              />
              <p className="text-sm text-gray-500">
                Chưa có quiz nào. Tạo quiz đầu tiên bên trên.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="p-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white truncate">
                        {row.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {row.course_title} &rsaquo; {row.chapter_title}{" "}
                        &rsaquo; {row.lesson_title}
                      </p>

                      {/* Stats row */}
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-gray-400">
                          <span className="text-white font-medium">
                            {row.question_count}
                          </span>{" "}
                          câu hỏi
                        </span>
                        <span className="text-xs text-gray-400">
                          <span className="text-white font-medium">
                            {row.attempts_count}
                          </span>{" "}
                          lượt làm
                        </span>
                        <span className="text-xs text-gray-400">
                          TB:{" "}
                          <span className="text-white font-medium">
                            {row.avg_score}%
                          </span>
                        </span>
                        <span className="text-xs text-gray-400">
                          Đạt:{" "}
                          <span
                            className={`font-medium ${
                              row.pass_rate >= 50
                                ? "text-[#22c55e]"
                                : "text-red-400"
                            }`}
                          >
                            {row.pass_rate}%
                          </span>
                        </span>
                        <span className="text-xs text-gray-500">
                          Cần {row.pass_score}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-gray-500">
                        {formatDate(row.created_at)}
                      </span>
                      <DeleteQuizButton quizId={row.id} quizTitle={row.title} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
