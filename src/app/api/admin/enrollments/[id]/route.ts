import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * DELETE /api/admin/enrollments/[id]
 * Removes an enrollment and its associated lesson_progress.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: enrollmentId } = await params;

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

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminClient = await createAdminClient();

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
  await adminClient
    .from("lesson_progress")
    .delete()
    .eq("user_id", enrollment.user_id)
    .eq("product_id", enrollment.product_id);

  // Delete lesson_questions for this user + product
  await adminClient
    .from("lesson_questions")
    .delete()
    .eq("user_id", enrollment.user_id)
    .eq("product_id", enrollment.product_id);

  // Delete the enrollment
  const { error } = await adminClient
    .from("enrollments")
    .delete()
    .eq("id", enrollmentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
