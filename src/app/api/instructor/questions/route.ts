import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET /api/instructor/questions — list student questions for instructor's courses
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
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  // Get instructor's course IDs
  const { data: instructorCourses, error: coursesError } = await adminClient
    .from("products")
    .select("id, title")
    .eq("instructor_id", user.id);

  if (coursesError) {
    console.error("[Instructor Questions GET] Courses error:", coursesError);
    return NextResponse.json(
      { error: "Co loi xay ra khi tai du lieu." },
      { status: 500 }
    );
  }

  const courseIds = (instructorCourses ?? []).map((c) => c.id);
  if (courseIds.length === 0) {
    return NextResponse.json({ questions: [], total: 0 });
  }

  // Build a map of course id -> title for later use
  const courseMap: Record<string, string> = {};
  for (const c of instructorCourses ?? []) {
    courseMap[c.id] = c.title;
  }

  // Get lesson IDs for those courses
  let lessonsQuery = adminClient
    .from("lessons")
    .select("id, title, product_id");

  if (product_id && courseIds.includes(product_id)) {
    lessonsQuery = lessonsQuery.eq("product_id", product_id);
  } else {
    lessonsQuery = lessonsQuery.in("product_id", courseIds);
  }

  const { data: lessons, error: lessonsError } = await lessonsQuery;

  if (lessonsError) {
    console.error("[Instructor Questions GET] Lessons error:", lessonsError);
    return NextResponse.json(
      { error: "Co loi xay ra khi tai du lieu." },
      { status: 500 }
    );
  }

  const lessonIds = (lessons ?? []).map((l) => l.id);
  if (lessonIds.length === 0) {
    return NextResponse.json({ questions: [], total: 0 });
  }

  // Build a map of lesson id -> { title, product_id }
  const lessonMap: Record<string, { title: string; product_id: string }> = {};
  for (const l of lessons ?? []) {
    lessonMap[l.id] = { title: l.title, product_id: l.product_id };
  }

  // Query top-level questions (parent_id IS NULL) from lesson_discussions
  let query = adminClient
    .from("lesson_discussions")
    .select(
      "id, lesson_id, user_id, content, is_resolved, is_pinned, created_at, profiles!lesson_discussions_user_id_fkey(full_name, avatar_url)",
      { count: "exact" }
    )
    .in("lesson_id", lessonIds)
    .is("parent_id", null);

  // Filter by resolved status if provided
  if (status === "resolved") {
    query = query.eq("is_resolved", true);
  } else if (status === "unresolved") {
    query = query.eq("is_resolved", false);
  }

  const { data: questions, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[Instructor Questions GET] Error:", error);
    return NextResponse.json(
      { error: "Co loi xay ra khi tai danh sach cau hoi." },
      { status: 500 }
    );
  }

  // Get reply counts for each question
  const questionIds = (questions ?? []).map((q) => q.id);
  let replyCountMap: Record<string, number> = {};

  if (questionIds.length > 0) {
    const { data: replies } = await adminClient
      .from("lesson_discussions")
      .select("parent_id")
      .in("parent_id", questionIds);

    replyCountMap = {};
    for (const r of replies ?? []) {
      if (r.parent_id) {
        replyCountMap[r.parent_id] = (replyCountMap[r.parent_id] || 0) + 1;
      }
    }
  }

  // Flatten joined data for cleaner response
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatted = (questions ?? []).map((q: any) => {
    const lesson = lessonMap[q.lesson_id];
    return {
      id: q.id,
      lesson_id: q.lesson_id,
      lesson_title: lesson?.title ?? null,
      course_title: lesson ? (courseMap[lesson.product_id] ?? null) : null,
      product_id: lesson?.product_id ?? null,
      user_id: q.user_id,
      student_name: q.profiles?.full_name ?? null,
      student_avatar: q.profiles?.avatar_url ?? null,
      content: q.content,
      is_resolved: q.is_resolved,
      is_pinned: q.is_pinned,
      reply_count: replyCountMap[q.id] || 0,
      created_at: q.created_at,
    };
  });

  return NextResponse.json({ questions: formatted, total: count ?? 0 });
}

// POST /api/instructor/questions — reply to a student question
export async function POST(req: NextRequest) {
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

  let discussion_id: string, content: string;
  try {
    ({ discussion_id, content } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!discussion_id) {
    return NextResponse.json(
      { error: "discussion_id is required" },
      { status: 400 }
    );
  }

  if (!content || typeof content !== "string" || !content.trim()) {
    return NextResponse.json(
      { error: "Noi dung khong duoc de trong" },
      { status: 400 }
    );
  }

  // Fetch the parent discussion to verify it belongs to instructor's course
  const { data: discussion } = await adminClient
    .from("lesson_discussions")
    .select("id, lesson_id")
    .eq("id", discussion_id)
    .is("parent_id", null)
    .single();

  if (!discussion) {
    return NextResponse.json(
      { error: "Cau hoi khong ton tai." },
      { status: 404 }
    );
  }

  // Verify the lesson belongs to instructor's course
  const { data: lesson } = await adminClient
    .from("lessons")
    .select("id, product_id")
    .eq("id", discussion.lesson_id)
    .single();

  if (!lesson) {
    return NextResponse.json(
      { error: "Bai hoc khong ton tai." },
      { status: 404 }
    );
  }

  const { data: course } = await adminClient
    .from("products")
    .select("id")
    .eq("id", lesson.product_id)
    .eq("instructor_id", user.id)
    .single();

  if (!course) {
    return NextResponse.json(
      { error: "Khong co quyen tra loi cau hoi nay." },
      { status: 403 }
    );
  }

  // Insert the reply
  const { data: reply, error } = await adminClient
    .from("lesson_discussions")
    .insert({
      lesson_id: discussion.lesson_id,
      user_id: user.id,
      parent_id: discussion_id,
      content: content.trim(),
    })
    .select(
      "*, profiles!lesson_discussions_user_id_fkey(full_name, avatar_url)"
    )
    .single();

  if (error) {
    console.error("[Instructor Questions POST] Error:", error);
    return NextResponse.json(
      { error: "Co loi xay ra khi gui tra loi." },
      { status: 500 }
    );
  }

  return NextResponse.json({ reply });
}

// PATCH /api/instructor/questions — mark question as resolved/pinned
export async function PATCH(req: NextRequest) {
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

  let discussion_id: string,
    is_resolved: boolean | undefined,
    is_pinned: boolean | undefined;
  try {
    ({ discussion_id, is_resolved, is_pinned } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!discussion_id) {
    return NextResponse.json(
      { error: "discussion_id is required" },
      { status: 400 }
    );
  }

  if (is_resolved === undefined && is_pinned === undefined) {
    return NextResponse.json(
      { error: "is_resolved or is_pinned is required" },
      { status: 400 }
    );
  }

  // Fetch the discussion to verify ownership
  const { data: discussion } = await adminClient
    .from("lesson_discussions")
    .select("id, lesson_id")
    .eq("id", discussion_id)
    .single();

  if (!discussion) {
    return NextResponse.json(
      { error: "Cau hoi khong ton tai." },
      { status: 404 }
    );
  }

  // Verify the lesson belongs to instructor's course
  const { data: lesson } = await adminClient
    .from("lessons")
    .select("id, product_id")
    .eq("id", discussion.lesson_id)
    .single();

  if (!lesson) {
    return NextResponse.json(
      { error: "Bai hoc khong ton tai." },
      { status: 404 }
    );
  }

  const { data: course } = await adminClient
    .from("products")
    .select("id")
    .eq("id", lesson.product_id)
    .eq("instructor_id", user.id)
    .single();

  if (!course) {
    return NextResponse.json(
      { error: "Khong co quyen cap nhat cau hoi nay." },
      { status: 403 }
    );
  }

  // Build update data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (is_resolved !== undefined) {
    updateData.is_resolved = is_resolved;
  }
  if (is_pinned !== undefined) {
    updateData.is_pinned = is_pinned;
  }

  const { data, error } = await adminClient
    .from("lesson_discussions")
    .update(updateData)
    .eq("id", discussion_id)
    .select()
    .single();

  if (error) {
    console.error("[Instructor Questions PATCH] Error:", error);
    return NextResponse.json(
      { error: "Co loi xay ra khi cap nhat cau hoi." },
      { status: 500 }
    );
  }

  return NextResponse.json({ discussion: data });
}
