import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: automation_id } = await params;

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

    // Rate limit: 5 enrollments per 5 min per user
    const rl = await rateLimit(`auto-enroll:${user.id}`, 5, 300);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retryAfterSec: rl.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const admin = await createAdminClient();

    // Parse body
    const body = await request.json();
    const { subscriber_ids, tag, list_id } = body;

    // Resolve subscriber IDs
    let resolvedSubscriberIds: string[] = [];

    if (subscriber_ids && Array.isArray(subscriber_ids)) {
      resolvedSubscriberIds = subscriber_ids;
    } else if (tag) {
      // Find all active subscribers with the given tag
      const { data: subscribers, error: tagError } = await admin
        .from("email_subscribers")
        .select("id")
        .eq("status", "active")
        .contains("tags", [tag]);

      if (tagError) {
        return NextResponse.json(
          { error: "Failed to find subscribers by tag" },
          { status: 500 }
        );
      }

      resolvedSubscriberIds = (subscribers || []).map((s) => s.id);
    } else if (list_id) {
      // Find all subscriber_ids from subscriber_list_members
      const { data: listSubscribers, error: listError } = await admin
        .from("subscriber_list_members")
        .select("subscriber_id")
        .eq("list_id", list_id);

      if (listError) {
        return NextResponse.json(
          { error: "Failed to find subscribers by list" },
          { status: 500 }
        );
      }

      resolvedSubscriberIds = (listSubscribers || []).map(
        (s) => s.subscriber_id
      );
    } else {
      return NextResponse.json(
        { error: "Must provide subscriber_ids, tag, or list_id" },
        { status: 400 }
      );
    }

    if (resolvedSubscriberIds.length === 0) {
      return NextResponse.json({ enrolled: 0, skipped: 0 });
    }

    // Get existing enrollments to skip duplicates
    const { data: existingEnrollments } = await admin
      .from("email_automation_enrollments")
      .select("subscriber_id")
      .eq("automation_id", automation_id)
      .in("subscriber_id", resolvedSubscriberIds);

    const existingIds = new Set(
      (existingEnrollments || []).map((e) => e.subscriber_id)
    );

    let enrolled = 0;
    let skipped = 0;

    for (const subscriber_id of resolvedSubscriberIds) {
      if (existingIds.has(subscriber_id)) {
        skipped++;
        continue;
      }

      // Insert enrollment record
      const { error: enrollError } = await admin
        .from("email_automation_enrollments")
        .insert({
          automation_id,
          subscriber_id,
          status: "active",
          enrolled_at: new Date().toISOString(),
        });

      if (enrollError) {
        // Could be a race condition duplicate
        skipped++;
        continue;
      }

      // Insert log
      await admin.from("email_automation_logs").insert({
        automation_id,
        subscriber_id,
        action: "enrolled",
      });

      enrolled++;
    }

    // Update automation's enrolled_count and active_count
    const { data: counts } = await admin
      .from("email_automation_enrollments")
      .select("status")
      .eq("automation_id", automation_id);

    const totalEnrolled = (counts || []).length;
    const activeCount = (counts || []).filter(
      (c) => c.status === "active"
    ).length;

    await admin
      .from("email_automations")
      .update({
        enrolled_count: totalEnrolled,
        active_count: activeCount,
      })
      .eq("id", automation_id);

    return NextResponse.json({ enrolled, skipped });
  } catch (error) {
    console.error("Error enrolling subscribers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
