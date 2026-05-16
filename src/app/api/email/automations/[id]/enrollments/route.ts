import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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
  if (!profile || !["admin", "manager"].includes(profile.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = await createAdminClient();

  // Parse query params
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
  );
  const offset = (page - 1) * limit;

  // Build query
  let query = admin
    .from("email_automation_enrollments")
    .select("*, subscribers(email, full_name, tags)", { count: "exact" })
    .eq("automation_id", id)
    .order("enrolled_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    enrollments: data,
    total: count ?? 0,
    page,
    limit,
  });
}

export async function DELETE(
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
  if (!profile || !["admin", "manager"].includes(profile.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = await createAdminClient();

  // Get enrollment_id from query params
  const { searchParams } = new URL(req.url);
  const enrollmentId = searchParams.get("enrollment_id");

  if (!enrollmentId) {
    return NextResponse.json(
      { error: "enrollment_id is required" },
      { status: 400 }
    );
  }

  // Verify enrollment belongs to this automation
  const { data: enrollment, error: fetchError } = await admin
    .from("email_automation_enrollments")
    .select("id, subscriber_id, status")
    .eq("id", enrollmentId)
    .eq("automation_id", id)
    .single();

  if (fetchError || !enrollment) {
    return NextResponse.json(
      { error: "Enrollment not found" },
      { status: 404 }
    );
  }

  if (enrollment.status === "exited") {
    return NextResponse.json(
      { error: "Enrollment already exited" },
      { status: 400 }
    );
  }

  // Update enrollment status to 'exited'
  const { error: updateError } = await admin
    .from("email_automation_enrollments")
    .update({ status: "exited", exited_at: new Date().toISOString() })
    .eq("id", enrollmentId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Log the action
  await admin.from("email_automation_logs").insert({
    automation_id: id,
    enrollment_id: enrollmentId,
    subscriber_id: enrollment.subscriber_id,
    action: "exited",
    details: { reason: "manual_exit", exited_by: user.id },
  });

  // Update automation's active_count
  const { count: activeCount } = await admin
    .from("email_automation_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("automation_id", id)
    .eq("status", "active");

  await admin
    .from("email_automations")
    .update({ active_count: activeCount ?? 0 })
    .eq("id", id);

  return NextResponse.json({ success: true });
}
