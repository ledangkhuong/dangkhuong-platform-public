/**
 * POST /api/quizzes/[quizId]/submit — Submit quiz answers and get graded
 *
 * Body: { answers: { [questionId: string]: number } }
 *   - number = selected option index (0-based)
 *
 * Server-side grading:
 *   1. Fetch correct answers from DB (never trust client)
 *   2. Compare submitted answers with correct ones
 *   3. Calculate percentage score
 *   4. Save attempt to quiz_attempts
 *   5. Return score, passed status, and correct answers (revealed after submission)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { allowed, retryAfterSec } = await rateLimit(
    `quiz-submit:${ip}`,
    20,
    60
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests", retryAfterSec },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { quizId } = await params;
  const body = await req.json();
  const answers: Record<string, number> = body.answers;

  if (!answers || typeof answers !== "object") {
    return NextResponse.json(
      { error: "answers is required" },
      { status: 400 }
    );
  }

  // Fetch quiz info
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("id, pass_score")
    .eq("id", quizId)
    .single();

  if (quizError || !quiz) {
    return NextResponse.json(
      { error: "Quiz không tồn tại" },
      { status: 404 }
    );
  }

  // Fetch all questions with correct answers (server-side only)
  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("id, options")
    .eq("quiz_id", quizId);

  if (!questions || questions.length === 0) {
    return NextResponse.json(
      { error: "Quiz không có câu hỏi" },
      { status: 400 }
    );
  }

  // Grade: compare submitted answers with correct answers
  let correctCount = 0;
  const correctAnswers: Record<string, number> = {};

  for (const question of questions) {
    const options = question.options as { text: string; is_correct: boolean }[];
    // Find the correct option index
    const correctIndex = options.findIndex((opt) => opt.is_correct);
    correctAnswers[question.id] = correctIndex;

    // Check if student's answer matches
    const studentAnswer = answers[question.id];
    if (studentAnswer !== undefined && studentAnswer === correctIndex) {
      correctCount++;
    }
  }

  const score = Math.round((correctCount / questions.length) * 100);
  const passed = score >= (quiz.pass_score ?? 70);

  // Save attempt
  const { error: insertError } = await supabase
    .from("quiz_attempts")
    .insert({
      quiz_id: quizId,
      user_id: user.id,
      score,
      passed,
      answers,
    });

  if (insertError) {
    console.error("[Quiz Submit] Insert attempt error:", insertError.message);
    return NextResponse.json(
      { error: "Có lỗi khi lưu kết quả. Vui lòng thử lại." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    score,
    passed,
    correct_count: correctCount,
    total_questions: questions.length,
    correct_answers: correctAnswers,
  });
}
