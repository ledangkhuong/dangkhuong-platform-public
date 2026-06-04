/**
 * GET /api/quizzes/by-lesson?lesson_id=... — Lookup quiz ID for a lesson
 *
 * Returns { quiz_id } or 404 if no quiz exists for the lesson.
 * Used by LessonQuiz component to discover if a lesson has a quiz.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { allowed, retryAfterSec } = await rateLimit(
    `quiz-lookup:${ip}`,
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

  const lessonId = req.nextUrl.searchParams.get("lesson_id");
  if (!lessonId) {
    return NextResponse.json(
      { error: "lesson_id is required" },
      { status: 400 }
    );
  }

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id")
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (!quiz) {
    return NextResponse.json(
      { error: "Không tìm thấy quiz cho bài học này" },
      { status: 404 }
    );
  }

  return NextResponse.json({ quiz_id: quiz.id });
}
