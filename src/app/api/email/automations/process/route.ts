import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { processAutomations } from "@/lib/email/automation-processor";

export async function POST(req: NextRequest) {
  const adminClient = await createAdminClient();

  // Check authorization: admin/manager cookie OR CRON_SECRET bearer token
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCron) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "manager"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const { processed, errors } = await processAutomations(adminClient);

    return NextResponse.json({
      success: true,
      processed,
      errors,
    });
  } catch (error) {
    console.error("Automation processing error:", error);
    return NextResponse.json(
      { error: "Failed to process automations" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const adminClient = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Count enrollments by status
    const { data: statusData, error: statusError } = await adminClient
      .from("automation_enrollments")
      .select("status");

    if (statusError) {
      throw statusError;
    }

    const statusCounts = {
      active: 0,
      waiting: 0,
      completed: 0,
      paused: 0,
      exited: 0,
    };

    for (const enrollment of statusData || []) {
      const status = enrollment.status as keyof typeof statusCounts;
      if (status in statusCounts) {
        statusCounts[status]++;
      }
    }

    // Count enrollments pending processing (next_action_at <= now)
    const { count: pending, error: pendingError } = await adminClient
      .from("automation_enrollments")
      .select("*", { count: "exact", head: true })
      .lte("next_action_at", new Date().toISOString())
      .in("status", ["active", "waiting"]);

    if (pendingError) {
      throw pendingError;
    }

    return NextResponse.json({
      pending: pending || 0,
      statusCounts,
    });
  } catch (error) {
    console.error("Error fetching automation status:", error);
    return NextResponse.json(
      { error: "Failed to fetch automation status" },
      { status: 500 }
    );
  }
}
