import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

// POST /api/admin/courses — create a new course (bypasses RLS)
export async function POST(req: NextRequest) {
  try {
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

    if (!profile || !["admin", "manager", "editor"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const admin = await createAdminClient();

    const { data, error } = await admin
      .from("products")
      .insert(body)
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error("POST /api/admin/courses error:", err);
    return NextResponse.json({ error: "Không thể thực hiện." }, { status: 500 });
  }
}

// DELETE /api/admin/courses — delete a course and all related data
export async function DELETE(req: NextRequest) {
  try {
    // Auth: only admin can delete courses
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: myProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (myProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let course_id;
    try {
      ({ course_id } = await req.json());
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!course_id || typeof course_id !== "string") {
      return NextResponse.json(
        { error: "course_id is required" },
        { status: 400 }
      );
    }

    const admin = await createAdminClient();

    // 1. Get all chapters for this product
    const { data: chapters } = await admin
      .from("chapters")
      .select("id")
      .eq("product_id", course_id);

    const chapterIds = (chapters ?? []).map((c) => c.id);

    // 2. Delete lessons belonging to those chapters
    if (chapterIds.length > 0) {
      await admin.from("lessons").delete().in("chapter_id", chapterIds);
    }

    // 3. Delete chapters
    await admin.from("chapters").delete().eq("product_id", course_id);

    // 4. Delete enrollments
    await admin.from("enrollments").delete().eq("product_id", course_id);

    // 5. Delete lesson_progress for this product
    await admin.from("lesson_progress").delete().eq("product_id", course_id);

    // 6. Delete orders related to this product
    await admin.from("orders").delete().eq("product_id", course_id);

    // 7. Delete the product itself
    const { error } = await admin.from("products").delete().eq("id", course_id);

    if (error) {
      console.error("[Admin Courses DELETE] Delete failed:", error.message);
      return NextResponse.json(
        { error: "Có lỗi xảy ra khi xoá khoá học. Vui lòng thử lại." },
        { status: 500 }
      );
    }

    // Audit log for successful course deletion
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await logAudit({
      admin_id: user.id,
      action: "course.delete",
      target_type: "course",
      target_id: course_id,
      ip_address: ip,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/courses error:", err);
    return NextResponse.json({ error: "Không thể thực hiện. Vui lòng thử lại." }, { status: 500 });
  }
}
