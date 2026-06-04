import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET /api/instructor/courses — list courses assigned to current instructor
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminClient = await createAdminClient();

  // Verify role — instructors see their own courses; admin/manager see all
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

  // Fetch courses — instructor sees assigned courses; admin/manager see all
  let coursesQuery = adminClient
    .from("products")
    .select("id, title, thumbnail, slug, price, sale_price, created_at")
    .order("created_at", { ascending: false });
  if (!isStaffViewer) {
    coursesQuery = coursesQuery.eq("instructor_id", user.id);
  }
  const { data: courses, error } = await coursesQuery;

  if (error) {
    console.error("[Instructor Courses GET] Error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi tải danh sách khoá học." },
      { status: 500 }
    );
  }

  // Get enrollment counts for each course
  const courseIds = (courses ?? []).map((c) => c.id);

  let enrollmentCounts: Record<string, number> = {};
  if (courseIds.length > 0) {
    const { data: countRows, error: countError } = await adminClient
      .from("enrollments")
      .select("product_id")
      .in("product_id", courseIds);

    if (!countError && countRows) {
      enrollmentCounts = countRows.reduce(
        (acc, row) => {
          acc[row.product_id] = (acc[row.product_id] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
    }
  }

  const coursesWithCount = (courses ?? []).map((course) => ({
    ...course,
    enrollment_count: enrollmentCounts[course.id] || 0,
  }));

  return NextResponse.json({ courses: coursesWithCount });
}
