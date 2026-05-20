import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const MAX_BATCH_SIZE = 500;

export async function POST(request: NextRequest) {
  try {
    // Auth check
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

    // Parse body
    const body = await request.json();
    const { action, tag, subscriber_ids, filter } = body;

    // Validate action
    if (!action || !["add", "remove"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'add' or 'remove'" },
        { status: 400 }
      );
    }

    // Validate tag
    if (!tag || typeof tag !== "string" || tag.trim().length === 0) {
      return NextResponse.json(
        { error: "Tag name is required" },
        { status: 400 }
      );
    }

    const tagName = tag.trim();

    // Resolve subscriber IDs
    let resolvedIds: string[] = [];

    if (subscriber_ids && Array.isArray(subscriber_ids) && subscriber_ids.length > 0) {
      resolvedIds = subscriber_ids;
    } else if (filter) {
      // Build query to find matching subscribers
      let query = admin.from("subscribers").select("id");

      if (filter.list_id) {
        // Get subscriber IDs from list membership
        const { data: listMembers, error: listError } = await admin
          .from("subscriber_list_members")
          .select("subscriber_id")
          .eq("list_id", filter.list_id);

        if (listError) {
          return NextResponse.json(
            { error: "Failed to query list members" },
            { status: 500 }
          );
        }

        const listSubscriberIds = (listMembers || []).map(
          (m) => m.subscriber_id
        );

        if (listSubscriberIds.length === 0) {
          return NextResponse.json({ success: true, affected: 0 });
        }

        query = query.in("id", listSubscriberIds);
      }

      if (filter.status) {
        query = query.eq("status", filter.status);
      }

      if (filter.existing_tag) {
        query = query.contains("tags", [filter.existing_tag]);
      }

      const { data: matchedSubscribers, error: filterError } = await query;

      if (filterError) {
        return NextResponse.json(
          { error: "Failed to filter subscribers" },
          { status: 500 }
        );
      }

      resolvedIds = (matchedSubscribers || []).map((s) => s.id);
    } else {
      return NextResponse.json(
        { error: "Must provide subscriber_ids or filter" },
        { status: 400 }
      );
    }

    if (resolvedIds.length === 0) {
      return NextResponse.json({ success: true, affected: 0 });
    }

    // Limit batch size
    if (resolvedIds.length > MAX_BATCH_SIZE) {
      resolvedIds = resolvedIds.slice(0, MAX_BATCH_SIZE);
    }

    let affected = 0;

    if (action === "add") {
      // Fetch subscribers who don't already have this tag
      const { data: subscribers, error: fetchError } = await admin
        .from("subscribers")
        .select("id, tags")
        .in("id", resolvedIds);

      if (fetchError) {
        return NextResponse.json(
          { error: "Failed to fetch subscribers" },
          { status: 500 }
        );
      }

      // Filter to only those who don't have the tag yet
      const subscribersToUpdate = (subscribers || []).filter((sub) => {
        const currentTags: string[] = sub.tags || [];
        return !currentTags.includes(tagName);
      });

      // Update each subscriber's tags
      for (const sub of subscribersToUpdate) {
        const currentTags: string[] = sub.tags || [];
        const newTags = [...currentTags, tagName];

        const { error: updateError } = await admin
          .from("subscribers")
          .update({ tags: newTags, updated_at: new Date().toISOString() })
          .eq("id", sub.id);

        if (!updateError) affected++;
      }

      // Trigger automations for tag added
      if (affected > 0) {
        const affectedIds = subscribersToUpdate
          .slice(0, affected)
          .map((s) => s.id);
        await triggerTagAutomations(admin, tagName, affectedIds);
      }
    } else {
      // Remove action: fetch subscribers who have this tag
      const { data: subscribers, error: fetchError } = await admin
        .from("subscribers")
        .select("id, tags")
        .in("id", resolvedIds)
        .contains("tags", [tagName]);

      if (fetchError) {
        return NextResponse.json(
          { error: "Failed to fetch subscribers" },
          { status: 500 }
        );
      }

      // Remove tag from each subscriber
      for (const sub of subscribers || []) {
        const currentTags: string[] = sub.tags || [];
        const newTags = currentTags.filter((t: string) => t !== tagName);

        const { error: updateError } = await admin
          .from("subscribers")
          .update({ tags: newTags, updated_at: new Date().toISOString() })
          .eq("id", sub.id);

        if (!updateError) affected++;
      }
    }

    // Update email_tags subscriber_count
    const { count: tagCount } = await admin
      .from("subscribers")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .contains("tags", [tagName]);

    await admin
      .from("email_tags")
      .update({ subscriber_count: tagCount || 0 })
      .eq("name", tagName);

    return NextResponse.json({ success: true, affected });
  } catch (err) {
    console.error("POST /api/email/tags/bulk error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Trigger automations that listen for tag_added events
 */
async function triggerTagAutomations(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  tagName: string,
  subscriberIds: string[]
) {
  try {
    // Find active automations triggered by tag_added for this tag
    const { data: automations } = await admin
      .from("email_automations")
      .select("id, trigger_config")
      .eq("status", "active")
      .eq("trigger_type", "tag_added");

    if (!automations || automations.length === 0) return;

    // Filter automations where trigger_config matches the tag
    const matchingAutomations = automations.filter((auto) => {
      const config = auto.trigger_config;
      if (!config) return false;
      return config.tag === tagName || config.tags?.includes(tagName);
    });

    if (matchingAutomations.length === 0) return;

    // Enroll subscribers into matching automations
    for (const automation of matchingAutomations) {
      // Check existing enrollments
      const { data: existingEnrollments } = await admin
        .from("email_automation_enrollments")
        .select("subscriber_id")
        .eq("automation_id", automation.id)
        .in("subscriber_id", subscriberIds);

      const existingIds = new Set(
        (existingEnrollments || []).map((e) => e.subscriber_id)
      );

      for (const subscriberId of subscriberIds) {
        if (existingIds.has(subscriberId)) continue;

        await admin.from("email_automation_enrollments").insert({
          automation_id: automation.id,
          subscriber_id: subscriberId,
          status: "active",
          enrolled_at: new Date().toISOString(),
        });

        await admin.from("email_automation_logs").insert({
          automation_id: automation.id,
          subscriber_id: subscriberId,
          action: "enrolled",
        });
      }

      // Update automation counts
      const { data: counts } = await admin
        .from("email_automation_enrollments")
        .select("status")
        .eq("automation_id", automation.id);

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
        .eq("id", automation.id);
    }
  } catch (err) {
    // Don't fail the bulk operation if automation trigger fails
    console.error("Error triggering tag automations:", err);
  }
}
