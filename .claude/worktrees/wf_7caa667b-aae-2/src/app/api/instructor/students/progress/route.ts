import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET /api/instructor/students/progress — enrolled students with lesson completion progress
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminClient = await createAdminClient();

  // Verify instructor role
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "instructor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const product_id = searchParams.get("product_id");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 1), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);

  // Get instructor's course IDs
  const { data: instructorCourses, error: coursesError } = await adminClient
    .from("products")
    .select("id, title")
    .eq("instructor_id", user.id);

  if (coursesError) {
    console.error("[Instructor Students Progress GET] Courses error:", coursesError);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi tải dữ liệu." },
      { status: 500 }
    );
  }

  const courseIds = (instructorCourses ?? []).map((c) => c.id);
  if (courseIds.length === 0) {
    return NextResponse.json({ students: [], total: 0 });
  }

  // Build course title lookup
  const courseTitleMap: Record<string, string> = {};
  for (const c of instructorCourses ?? []) {
    courseTitleMap[c.id] = c.title;
  }

  // Determine which course IDs to query
  const targetCourseIds =
    product_id && courseIds.includes(product_id) ? [product_id] : courseIds;

  // ── 1. Get enrollments (with pagination) ──────────────────────
  let countQuery = adminClient
    .from("enrollments")
    .select("id", { count: "exact", head: true });

  if (targetCourseIds.length === 1) {
    countQuery = countQuery.eq("product_id", targetCourseIds[0]);
  } else {
    countQuery = countQuery.in("product_id", targetCourseIds);
  }

  const { count: total } = await countQuery;

  let enrollQuery = adminClient
    .from("enrollments")
    .select(
      "id, user_id, product_id, created_at, profiles!enrollments_user_id_fkey(full_name, email, avatar_url)"
    );

  if (targetCourseIds.length === 1) {
    enrollQuery = enrollQuery.eq("product_id", targetCourseIds[0]);
  } else {
    enrollQuery = enrollQuery.in("product_id", targetCourseIds);
  }

  const { data: enrollments, error: enrollError } = await enrollQuery
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (enrollError) {
    console.error("[Instructor Students Progress GET] Enrollments error:", enrollError);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi tải danh sách học viên." },
      { status: 500 }
    );
  }

  if (!enrollments || enrollments.length === 0) {
    return NextResponse.json({ students: [], total: total ?? 0 });
  }

  // ── 2. Batch query: total lesson count per course ─────────────
  const { data: lessonCounts, error: lessonCountError } = await adminClient
    .from("lessons")
    .select("product_id")
    .in("product_id", targetCourseIds);

  if (lessonCountError) {
    console.error("[Instructor Students Progress GET] Lesson count error:", lessonCountError);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi tải dữ liệu bài học." },
      { status: 500 }
    );
  }

  // Aggregate lesson counts in JS
  const lessonCountMap: Record<string, number> = {};
  for (const row of lessonCounts ?? []) {
    lessonCountMap[row.product_id] = (lessonCountMap[row.product_id] ?? 0) + 1;
  }

  // ── 3. Batch query: lesson_progress for enrolled students ─────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userIds = [...new Set(enrollments.map((e: any) => e.user_id))];

  const { data: progressRows, error: progressError } = await adminClient
    .from("lesson_progress")
    .select("user_id, product_id, completed, updated_at")
    .in("user_id", userIds)
    .in("product_id", targetCourseIds)
    .eq("completed", true);

  if (progressError) {
    console.error("[Instructor Students Progress GET] Progress error:", progressError);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi tải tiến trình học viên." },
      { status: 500 }
    );
  }

  // Aggregate: completed count & last activity per (user_id, product_id)
  const progressMap: Record<string, { completed: number; lastActivity: string | null }> = {};
  for (const row of progressRows ?? []) {
    const key = `${row.user_id}::${row.product_id}`;
    if (!progressMap[key]) {
      progressMap[key] = { completed: 0, lastActivity: null };
    }
    progressMap[key].completed += 1;
    if (
      row.updated_at &&
      (!progressMap[key].lastActivity || row.updated_at > progressMap[key].lastActivity!)
    ) {
      progressMap[key].lastActivity = row.updated_at;
    }
  }

  // Also get last activity for non-completed progress (user may have started but not finished)
  const { data: allActivityRows } = await adminClient
    .from("lesson_progress")
    .select("user_id, product_id, updated_at")
    .in("user_id", userIds)
    .in("product_id", targetCourseIds)
    .order("updated_at", { ascending: false });

  // Merge last activity from all progress (not just completed)
  for (const row of allActivityRows ?? []) {
    const key = `${row.user_id}::${row.product_id}`;
    if (!progressMap[key]) {
      progressMap[key] = { completed: 0, lastActivity: row.updated_at };
    } else if (
      row.updated_at &&
      (!progressMap[key].lastActivity || row.updated_at > progressMap[key].lastActivity!)
    ) {
      progressMap[key].lastActivity = row.updated_at;
    }
  }

  // ── 4. Build response ─────────────────────────────────────────
  const students = enrollments.map((e) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = e as any;
    const totalLessons = lessonCountMap[raw.product_id] ?? 0;
    const key = `${raw.user_id}::${raw.product_id}`;
    const progress = progressMap[key];
    const completedLessons = progress?.completed ?? 0;
    const completionPercent =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      user_id: raw.user_id,
      full_name: raw.profiles?.full_name ?? null,
      email: raw.profiles?.email ?? null,
      avatar_url: raw.profiles?.avatar_url ?? null,
      product_id: raw.product_id,
      course_title: courseTitleMap[raw.product_id] ?? null,
      enrolled_at: raw.created_at,
      total_lessons: totalLessons,
      completed_lessons: completedLessons,
      completion_percent: completionPercent,
      last_activity: progress?.lastActivity ?? null,
    };
  });

  return NextResponse.json({ students, total: total ?? 0 });
}
