/**
 * Admin Quiz Management API
 *
 * GET    /api/admin/quizzes          — List all quizzes with stats
 * POST   /api/admin/quizzes          — Create quiz with questions
 * PUT    /api/admin/quizzes          — Update quiz and/or questions
 * DELETE /api/admin/quizzes          — Delete a quiz
 *
 * All endpoints are admin-only (roles: admin, manager).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    return { error: "Forbidden", status: 403 };
  }

  return { user, profile };
}

// ─── GET: List all quizzes with stats ────────────────────────────────────────

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  const admin = await createAdminClient();

  // Get quizzes with lesson info
  const { data: quizzes, error } = await admin
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

  if (error) {
    console.error("[Admin Quizzes GET] Error:", error.message);
    return NextResponse.json(
      { error: "Có lỗi khi lấy danh sách quiz" },
      { status: 500 }
    );
  }

  // Get question counts per quiz
  const { data: questionCounts } = await admin
    .from("quiz_questions")
    .select("quiz_id");

  const qCountMap: Record<string, number> = {};
  for (const qc of questionCounts ?? []) {
    qCountMap[qc.quiz_id] = (qCountMap[qc.quiz_id] || 0) + 1;
  }

  // Get attempt stats per quiz
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

  const result = (quizzes ?? []).map((q: Record<string, unknown>) => {
    const lesson = q.lessons as Record<string, unknown>;
    const chapter = lesson?.chapters as Record<string, unknown>;
    const product = chapter?.products as Record<string, unknown>;
    const stats = attemptStats[q.id as string] || {
      count: 0,
      totalScore: 0,
      passedCount: 0,
    };
    return {
      id: q.id,
      title: q.title,
      pass_score: q.pass_score,
      lesson_id: q.lesson_id,
      lesson_title: lesson?.title ?? "",
      chapter_title: chapter?.title ?? "",
      course_title: product?.title ?? "",
      question_count: qCountMap[q.id as string] || 0,
      attempts_count: stats.count,
      avg_score: stats.count > 0 ? Math.round(stats.totalScore / stats.count) : 0,
      pass_rate:
        stats.count > 0
          ? Math.round((stats.passedCount / stats.count) * 100)
          : 0,
      created_at: q.created_at,
    };
  });

  return NextResponse.json({ quizzes: result });
}

// ─── POST: Create quiz with questions ────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  const body = await req.json();
  const { lesson_id, title, pass_score, questions } = body;

  if (!lesson_id || !title || !questions || !Array.isArray(questions)) {
    return NextResponse.json(
      { error: "lesson_id, title, và questions là bắt buộc" },
      { status: 400 }
    );
  }

  if (questions.length === 0) {
    return NextResponse.json(
      { error: "Quiz phải có ít nhất 1 câu hỏi" },
      { status: 400 }
    );
  }

  const admin = await createAdminClient();

  // Check if lesson already has a quiz
  const { data: existingQuiz } = await admin
    .from("quizzes")
    .select("id")
    .eq("lesson_id", lesson_id)
    .maybeSingle();

  if (existingQuiz) {
    return NextResponse.json(
      { error: "Bài học này đã có quiz. Vui lòng chỉnh sửa hoặc xoá quiz cũ." },
      { status: 409 }
    );
  }

  // Create quiz
  const { data: quiz, error: quizError } = await admin
    .from("quizzes")
    .insert({
      lesson_id,
      title,
      pass_score: pass_score ?? 70,
    })
    .select("id")
    .single();

  if (quizError || !quiz) {
    console.error("[Admin Quizzes POST] Create quiz error:", quizError?.message);
    return NextResponse.json(
      { error: "Không thể tạo quiz. Vui lòng thử lại." },
      { status: 500 }
    );
  }

  // Insert questions
  const questionRows = questions.map(
    (
      q: {
        question_text: string;
        question_type: string;
        options: { text: string; is_correct: boolean }[];
      },
      index: number
    ) => ({
      quiz_id: quiz.id,
      question_text: q.question_text,
      question_type: q.question_type || "multiple_choice",
      options: q.options,
      sort_order: index,
    })
  );

  const { error: qError } = await admin
    .from("quiz_questions")
    .insert(questionRows);

  if (qError) {
    console.error("[Admin Quizzes POST] Insert questions error:", qError.message);
    // Rollback: delete the quiz
    await admin.from("quizzes").delete().eq("id", quiz.id);
    return NextResponse.json(
      { error: "Không thể tạo câu hỏi. Vui lòng thử lại." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, quiz_id: quiz.id });
}

// ─── PUT: Update quiz ────────────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  const body = await req.json();
  const { quiz_id, title, pass_score, questions } = body;

  if (!quiz_id) {
    return NextResponse.json(
      { error: "quiz_id là bắt buộc" },
      { status: 400 }
    );
  }

  const admin = await createAdminClient();

  // Update quiz fields if provided
  const updateFields: Record<string, unknown> = {};
  if (title !== undefined) updateFields.title = title;
  if (pass_score !== undefined) updateFields.pass_score = pass_score;

  if (Object.keys(updateFields).length > 0) {
    const { error } = await admin
      .from("quizzes")
      .update(updateFields)
      .eq("id", quiz_id);

    if (error) {
      console.error("[Admin Quizzes PUT] Update quiz error:", error.message);
      return NextResponse.json(
        { error: "Không thể cập nhật quiz" },
        { status: 500 }
      );
    }
  }

  // If questions are provided, replace all questions
  if (questions && Array.isArray(questions)) {
    if (questions.length === 0) {
      return NextResponse.json(
        { error: "Quiz phải có ít nhất 1 câu hỏi" },
        { status: 400 }
      );
    }

    // Delete existing questions
    await admin.from("quiz_questions").delete().eq("quiz_id", quiz_id);

    // Insert new questions
    const questionRows = questions.map(
      (
        q: {
          question_text: string;
          question_type: string;
          options: { text: string; is_correct: boolean }[];
        },
        index: number
      ) => ({
        quiz_id,
        question_text: q.question_text,
        question_type: q.question_type || "multiple_choice",
        options: q.options,
        sort_order: index,
      })
    );

    const { error: qError } = await admin
      .from("quiz_questions")
      .insert(questionRows);

    if (qError) {
      console.error("[Admin Quizzes PUT] Insert questions error:", qError.message);
      return NextResponse.json(
        { error: "Không thể cập nhật câu hỏi" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}

// ─── DELETE: Delete a quiz ───────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  const { quiz_id } = await req.json();

  if (!quiz_id || typeof quiz_id !== "string") {
    return NextResponse.json(
      { error: "quiz_id là bắt buộc" },
      { status: 400 }
    );
  }

  const admin = await createAdminClient();

  // Delete questions first (cascade should handle this, but be explicit)
  await admin.from("quiz_questions").delete().eq("quiz_id", quiz_id);

  // Delete attempts
  await admin.from("quiz_attempts").delete().eq("quiz_id", quiz_id);

  // Delete quiz
  const { error } = await admin.from("quizzes").delete().eq("id", quiz_id);

  if (error) {
    console.error("[Admin Quizzes DELETE] Error:", error.message);
    return NextResponse.json(
      { error: "Không thể xoá quiz. Vui lòng thử lại." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
