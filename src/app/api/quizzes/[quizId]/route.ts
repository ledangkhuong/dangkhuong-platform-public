/**
 * GET /api/quizzes/[quizId] — Get quiz with questions for a lesson
 *
 * Returns quiz info + questions but STRIPS is_correct from options for security.
 * Correct answers are only revealed after submission via the submit endpoint.
 *
 * Also returns the user's best attempt (if any) so the UI can show "already passed".
 *
 * ─── SQL Schema (run in Supabase SQL Editor) ────────────────────────────────
 *
 * CREATE TABLE quizzes (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
 *   title TEXT NOT NULL,
 *   pass_score INTEGER DEFAULT 70,
 *   created_at TIMESTAMPTZ DEFAULT now()
 * );
 *
 * CREATE TABLE quiz_questions (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
 *   question_text TEXT NOT NULL,
 *   question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false')),
 *   options JSONB NOT NULL DEFAULT '[]',
 *   sort_order INTEGER DEFAULT 0,
 *   created_at TIMESTAMPTZ DEFAULT now()
 * );
 *
 * CREATE TABLE quiz_attempts (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
 *   user_id UUID NOT NULL,
 *   score INTEGER NOT NULL,
 *   passed BOOLEAN NOT NULL,
 *   answers JSONB NOT NULL DEFAULT '{}',
 *   completed_at TIMESTAMPTZ DEFAULT now()
 * );
 *
 * CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id, quiz_id);
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

/** Fisher-Yates (Knuth) in-place shuffle */
function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { allowed, retryAfterSec } = await rateLimit(
    `quiz-get:${ip}`,
    60,
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

  // Fetch quiz
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("id, lesson_id, title, pass_score, time_limit_minutes, created_at")
    .eq("id", quizId)
    .single();

  if (quizError || !quiz) {
    return NextResponse.json(
      { error: "Quiz không tồn tại" },
      { status: 404 }
    );
  }

  // Fetch questions
  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("id, question_text, question_type, options, sort_order")
    .eq("quiz_id", quizId)
    .order("sort_order", { ascending: true });

  // SECURITY: Strip is_correct from each option before sending to client.
  // Add original_index so grading still works after option shuffling.
  const safeQuestions = (questions ?? []).map((q) => {
    const optionsWithIndex = (
      q.options as { text: string; is_correct: boolean }[]
    ).map((opt, idx) => ({ text: opt.text, original_index: idx }));

    // Shuffle options within each question
    shuffleArray(optionsWithIndex);

    return { ...q, options: optionsWithIndex };
  });

  // Shuffle question order
  shuffleArray(safeQuestions);

  // Fetch user's best attempt for this quiz
  const { data: bestAttempt } = await supabase
    .from("quiz_attempts")
    .select("id, score, passed, completed_at")
    .eq("quiz_id", quizId)
    .eq("user_id", user.id)
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    quiz: {
      ...quiz,
      questions: safeQuestions,
    },
    bestAttempt: bestAttempt ?? null,
  });
}
