import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { isValidUUID } from "@/lib/utils";

/**
 * DELETE /api/admin/enrollments/[id]
 * Removes an enrollment and its associated lesson_progress.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: enrollmentId } = await params;
  if (!isValidUUID(enrollmentId)) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager", "sale"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminClient = await createAdminClient();

  try {
    // Get enrollment details first
    const { data: enrollment } = await adminClient
      .from("enrollments")
      .select("user_id, product_id")
      .eq("id", enrollmentId)
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      );
    }

    // Delete lesson_progress for this user + product
    const { error: progressError } = await adminClient
      .from("lesson_progress")
      .delete()
      .eq("user_id", enrollment.user_id)
      .eq("product_id", enrollment.product_id);

    if (progressError) {
      console.error("[Admin Enrollments DELETE] lesson_progress error:", progressError);
      return NextResponse.json({ error: "Có lỗi xảy ra khi xóa tiến trình bài học." }, { status: 500 });
    }

    // Delete lesson_questions for this user + product
    const { error: questionsError } = await adminClient
      .from("lesson_questions")
      .delete()
      .eq("user_id", enrollment.user_id)
      .eq("product_id", enrollment.product_id);

    if (questionsError) {
      console.error("[Admin Enrollments DELETE] lesson_questions error:", questionsError);
      return NextResponse.json({ error: "Có lỗi xảy ra khi xóa câu hỏi bài học." }, { status: 500 });
    }

    // Delete the enrollment
    const { error } = await adminClient
      .from("enrollments")
      .delete()
      .eq("id", enrollmentId);

    if (error) {
      console.error("[Admin Enrollments DELETE] Error:", error);
      return NextResponse.json({ error: "Có lỗi xảy ra khi xóa đăng ký. Vui lòng thử lại." }, { status: 500 });
    }

    await logAudit({
      admin_id: user.id,
      action: "enrollment.delete",
      target_type: "enrollment",
      target_id: enrollmentId,
      details: { user_id: enrollment.user_id, product_id: enrollment.product_id },
      ip_address: _request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Admin Enrollments DELETE] Unexpected error:", err);
    return NextResponse.json({ error: "Có lỗi xảy ra. Vui lòng thử lại." }, { status: 500 });
  }
}
