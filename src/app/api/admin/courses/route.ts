import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

// DELETE /api/admin/courses — delete a course and all related data
export async function DELETE(req: NextRequest) {
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

  const { course_id } = await req.json();

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
}
