import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// POST /api/email/campaigns/[id]/cleanup — remove duplicate email_sends and recalculate stats
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const admin = await createAdminClient();

    // Fetch campaign
    const { data: campaign, error: fetchError } = await admin
      .from("email_campaigns")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Get all email_sends for this campaign
    const { data: allSends, error: sendsError } = await admin
      .from("email_sends")
      .select("id, subscriber_id, email, status, sent_at, opened_at, clicked_at, created_at")
      .eq("campaign_id", id)
      .order("created_at", { ascending: true });

    if (sendsError) {
      return NextResponse.json({ error: sendsError.message }, { status: 500 });
    }

    if (!allSends || allSends.length === 0) {
      return NextResponse.json({
        message: "No email sends found for this campaign",
        cleaned: 0,
      });
    }

    // Group sends by subscriber_id — keep the BEST record per subscriber
    // Priority: opened > clicked > sent > queued > failed
    const statusPriority: Record<string, number> = {
      opened: 5,
      clicked: 4,
      sent: 3,
      queued: 2,
      failed: 1,
    };

    const bestBySubscriber = new Map<
      string,
      { id: string; status: string; priority: number }
    >();
    const duplicateIds: string[] = [];

    for (const send of allSends) {
      const subId = send.subscriber_id;
      const priority = statusPriority[send.status] ?? 0;
      const existing = bestBySubscriber.get(subId);

      if (!existing || priority > existing.priority) {
        // This one is better — mark old one as duplicate
        if (existing) {
          duplicateIds.push(existing.id);
        }
        bestBySubscriber.set(subId, {
          id: send.id,
          status: send.status,
          priority,
        });
      } else {
        // Current is worse — mark as duplicate
        duplicateIds.push(send.id);
      }
    }

    // Delete duplicate email_sends in batches
    let deletedCount = 0;
    const batchSize = 100;
    for (let i = 0; i < duplicateIds.length; i += batchSize) {
      const batch = duplicateIds.slice(i, i + batchSize);

      // First delete related email_events for these sends
      await admin
        .from("email_events")
        .delete()
        .in("send_id", batch);

      // Then delete the duplicate sends
      const { error: deleteError } = await admin
        .from("email_sends")
        .delete()
        .in("id", batch);

      if (!deleteError) {
        deletedCount += batch.length;
      }
    }

    // Recalculate campaign stats from remaining (clean) email_sends
    const { data: cleanSends } = await admin
      .from("email_sends")
      .select("id, status, opened_at, clicked_at")
      .eq("campaign_id", id);

    const remaining = cleanSends || [];
    const sentCount = remaining.filter(
      (s) => s.status === "sent" || s.status === "opened" || s.status === "clicked"
    ).length;
    const openCount = remaining.filter((s) => s.opened_at != null).length;
    const clickCount = remaining.filter((s) => s.clicked_at != null).length;
    const failedCount = remaining.filter((s) => s.status === "failed").length;

    // Update campaign with correct counts
    const { error: updateError } = await admin
      .from("email_campaigns")
      .update({
        sent_count: sentCount,
        open_count: openCount,
        click_count: clickCount,
        total_recipients: remaining.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // Re-fetch updated campaign
    const { data: updatedCampaign } = await admin
      .from("email_campaigns")
      .select("*")
      .eq("id", id)
      .single();

    return NextResponse.json({
      success: true,
      message: `Cleaned ${deletedCount} duplicate sends`,
      before: {
        total_sends: allSends.length,
        unique_subscribers: bestBySubscriber.size,
        duplicates: duplicateIds.length,
      },
      after: {
        total_sends: remaining.length,
        sent_count: sentCount,
        open_count: openCount,
        click_count: clickCount,
        failed_count: failedCount,
      },
      campaign: updatedCampaign,
    });
  } catch (err) {
    console.error("POST /api/email/campaigns/[id]/cleanup error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
