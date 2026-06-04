import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET /api/instructor/students — list enrolled students for instructor's courses
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

  // Get instructor's course IDs
  const { data: instructorCourses, error: coursesError } = await adminClient
    .from("products")
    .select("id, title")
    .eq("instructor_id", user.id);

  if (coursesError) {
    console.error("[Instructor Students GET] Courses error:", coursesError);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi tải dữ liệu." },
      { status: 500 }
    );
  }

  const courseIds = (instructorCourses ?? []).map((c) => c.id);
  if (courseIds.length === 0) {
    return NextResponse.json({ students: [] });
  }

  // Build enrollments query with profile join
  let query = adminClient
    .from("enrollments")
    .select(
      "id, user_id, product_id, created_at, profiles!enrollments_user_id_fkey(full_name, email, avatar_url)"
    );

  if (product_id && courseIds.includes(product_id)) {
    query = query.eq("product_id", product_id);
  } else {
    query = query.in("product_id", courseIds);
  }

  const { data: enrollments, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) {
    console.error("[Instructor Students GET] Error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi tải danh sách học viên." },
      { status: 500 }
    );
  }

  // Build a course title lookup
  const courseTitleMap: Record<string, string> = {};
  for (const c of instructorCourses ?? []) {
    courseTitleMap[c.id] = c.title;
  }

  // Flatten joined data
  const students = (enrollments ?? []).map((e) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = e as any;
    return {
      enrollment_id: raw.id,
      user_id: raw.user_id,
      product_id: raw.product_id,
      course_title: courseTitleMap[raw.product_id] ?? null,
      enrolled_at: raw.created_at,
      full_name: raw.profiles?.full_name ?? null,
      email: raw.profiles?.email ?? null,
      avatar_url: raw.profiles?.avatar_url ?? null,
    };
  });

  return NextResponse.json({ students });
}
