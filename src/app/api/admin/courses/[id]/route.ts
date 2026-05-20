import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/courses/[id] — fetch a single course (bypasses RLS)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const allowedRoles = ["admin", "manager", "editor", "instructor"];
  if (!profile || !allowedRoles.includes(profile.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = await createAdminClient();

  const { data: course, error } = await admin
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !course)
    return NextResponse.json({ error: "Course not found" }, { status: 404 });

  // Instructors can only see their own courses
  if (profile.role === "instructor" && course.instructor_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(course);
}

/**
 * PUT /api/admin/courses/[id] — update a course (bypasses RLS)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const allowedRoles = ["admin", "manager", "editor", "instructor"];
  if (!profile || !allowedRoles.includes(profile.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = await createAdminClient();

  // Instructors can only update their own courses
  if (profile.role === "instructor") {
    const { data: course } = await admin
      .from("products")
      .select("instructor_id")
      .eq("id", id)
      .single();
    if (!course || course.instructor_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Whitelist allowed fields
  const allowedFields = [
    "title", "slug", "description", "description_html", "thumbnail",
    "price", "sale_price", "type", "tier_required", "status",
    "category", "sort_order", "instructor_id",
  ];

  const payload: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) {
      payload[key] = body[key];
    }
  }

  const { error } = await admin
    .from("products")
    .update(payload)
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: `Lỗi khi cập nhật: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
