import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET /api/instructor/submissions — list submissions for instructor's courses
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminClient = await createAdminClient();

  // Verify role — instructor (own courses) or admin/manager (all courses)
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "";
  const isStaffViewer = role === "admin" || role === "manager";
  if (role !== "instructor" && !isStaffViewer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const product_id = searchParams.get("product_id");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  // Get accessible course IDs — all for admin/manager, assigned-only for instructor
  let coursesQuery = adminClient.from("products").select("id");
  if (!isStaffViewer) {
    coursesQuery = coursesQuery.eq("instructor_id", user.id);
  }
  const { data: instructorCourses, error: coursesError } = await coursesQuery;

  if (coursesError) {
    console.error("[Instructor Submissions GET] Courses error:", coursesError);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi tải dữ liệu." },
      { status: 500 }
    );
  }

  const courseIds = (instructorCourses ?? []).map((c) => c.id);
  if (courseIds.length === 0) {
    return NextResponse.json({ submissions: [], total: 0 });
  }

  // Build query for submissions.
  // NOTE: user_id has no FK to public.profiles (it references auth.users), so we
  // cannot embed profiles via PostgREST — student names are resolved separately below.
  let query = adminClient
    .from("lesson_submissions")
    .select(
      "id, user_id, lesson_id, product_id, content, links, status, feedback, score, reviewed_by, reviewed_at, created_at, updated_at, lessons!lesson_submissions_lesson_id_fkey(title)",
      { count: "exact" }
    );

  // Filter by instructor's courses
  if (product_id && courseIds.includes(product_id)) {
    query = query.eq("product_id", product_id);
  } else {
    query = query.in("product_id", courseIds);
  }

  if (status && ["pending", "reviewed", "approved"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data: submissions, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[Instructor Submissions GET] Error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi tải danh sách bài nộp." },
      { status: 500 }
    );
  }

  // Resolve student names separately (no FK from user_id to profiles).
  const userIds = [
    ...new Set((submissions ?? []).map((s) => (s as { user_id: string }).user_id)),
  ];
  const nameMap: Record<string, string | null> = {};
  if (userIds.length > 0) {
    const { data: profs } = await adminClient
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    for (const p of profs ?? []) nameMap[p.id] = p.full_name;
  }

  // Flatten joined data for cleaner response
  const formatted = (submissions ?? []).map((s) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = s as any;
    return {
      id: raw.id,
      user_id: raw.user_id,
      lesson_id: raw.lesson_id,
      product_id: raw.product_id,
      content: raw.content,
      links: raw.links,
      status: raw.status,
      feedback: raw.feedback,
      score: raw.score,
      reviewed_by: raw.reviewed_by,
      reviewed_at: raw.reviewed_at,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
      student_name: nameMap[raw.user_id] ?? null,
      lesson_title: raw.lessons?.title ?? null,
    };
  });

  return NextResponse.json({ submissions: formatted, total: count ?? 0 });
}

// PATCH /api/instructor/submissions — review/grade a submission
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminClient = await createAdminClient();

  // Verify role — instructor (own courses) or admin/manager (all courses)
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "";
  const isStaffViewer = role === "admin" || role === "manager";
  if (role !== "instructor" && !isStaffViewer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let id, status, feedback, score;
  try {
    ({ id, status, feedback, score } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // Fetch the submission to verify it belongs to one of instructor's courses
  const { data: submission } = await adminClient
    .from("lesson_submissions")
    .select("id, product_id")
    .eq("id", id)
    .single();

  if (!submission) {
    return NextResponse.json(
      { error: "Bài nộp không tồn tại." },
      { status: 404 }
    );
  }

  // Admin/manager can grade any course; instructors only their own
  if (!isStaffViewer) {
    const { data: course } = await adminClient
      .from("products")
      .select("id")
      .eq("id", submission.product_id)
      .eq("instructor_id", user.id)
      .single();

    if (!course) {
      return NextResponse.json(
        { error: "Không có quyền chấm bài nộp này." },
        { status: 403 }
      );
    }
  }

  // Build update data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (status && ["pending", "reviewed", "approved"].includes(status)) {
    updateData.status = status;
  }
  if (feedback !== undefined) {
    updateData.feedback = feedback;
  }
  if (score !== undefined) {
    updateData.score = score;
  }
  if (status === "reviewed" || status === "approved") {
    updateData.reviewed_by = user.id;
    updateData.reviewed_at = new Date().toISOString();
  }

  const { data, error } = await adminClient
    .from("lesson_submissions")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[Instructor Submissions PATCH] Error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi cập nhật bài nộp." },
      { status: 500 }
    );
  }

  return NextResponse.json({ submission: data });
}
