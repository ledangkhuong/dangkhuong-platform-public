import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET /api/email/campaigns/[id]/analytics — detailed analytics for a campaign
export async function GET(
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

    // Aggregate email_events by event_type
    const { data: events, error: eventsError } = await admin
      .from("email_events")
      .select("event_type, subscriber_id, metadata, created_at")
      .eq("campaign_id", id);

    if (eventsError) {
      return NextResponse.json(
        { error: eventsError.message },
        { status: 500 }
      );
    }

    const allEvents = events || [];

    // Count by event type
    const eventCounts: Record<string, number> = {};
    const uniqueByType: Record<string, Set<string>> = {};

    for (const event of allEvents) {
      const type = event.event_type;
      eventCounts[type] = (eventCounts[type] || 0) + 1;

      if (!uniqueByType[type]) {
        uniqueByType[type] = new Set();
      }
      if (event.subscriber_id) {
        uniqueByType[type].add(event.subscriber_id);
      }
    }

    const sent = campaign.sent_count || 0;
    const delivered = eventCounts["delivered"] || 0;
    const opens = eventCounts["open"] || 0;
    const uniqueOpens = uniqueByType["open"]?.size || 0;
    const clicks = eventCounts["click"] || 0;
    const uniqueClicks = uniqueByType["click"]?.size || 0;
    const bounces = eventCounts["bounce"] || 0;
    const complaints = eventCounts["complaint"] || 0;
    const unsubscribes = eventCounts["unsubscribe"] || 0;

    const total = campaign.total_recipients || 0;
    const open_rate =
      total > 0 ? Math.round((uniqueOpens / total) * 10000) / 100 : 0;
    const click_rate =
      total > 0 ? Math.round((uniqueClicks / total) * 10000) / 100 : 0;
    const bounce_rate =
      total > 0 ? Math.round((bounces / total) * 10000) / 100 : 0;
    const complaint_rate =
      total > 0 ? Math.round((complaints / total) * 10000) / 100 : 0;

    // Build timeline (group by day)
    const timelineMap = new Map<
      string,
      { date: string; opens: number; clicks: number }
    >();

    for (const event of allEvents) {
      if (event.event_type !== "open" && event.event_type !== "click") {
        continue;
      }
      const date = event.created_at
        ? new Date(event.created_at).toISOString().split("T")[0]
        : "unknown";

      if (!timelineMap.has(date)) {
        timelineMap.set(date, { date, opens: 0, clicks: 0 });
      }
      const entry = timelineMap.get(date)!;
      if (event.event_type === "open") entry.opens++;
      if (event.event_type === "click") entry.clicks++;
    }

    const timeline = Array.from(timelineMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // Top clicked links
    const linkClickMap = new Map<string, number>();
    for (const event of allEvents) {
      if (event.event_type !== "click") continue;
      const metadata = event.metadata as Record<string, unknown> | null;
      const url = metadata?.url as string | undefined;
      if (url) {
        linkClickMap.set(url, (linkClickMap.get(url) || 0) + 1);
      }
    }

    const top_links = Array.from(linkClickMap.entries())
      .map(([url, clickCount]) => ({ url, clicks: clickCount }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 20);

    // Subscriber engagement breakdown
    const { data: sends } = await admin
      .from("email_sends")
      .select("status")
      .eq("campaign_id", id);

    const sendStatusCounts: Record<string, number> = {};
    for (const send of sends || []) {
      sendStatusCounts[send.status] =
        (sendStatusCounts[send.status] || 0) + 1;
    }

    return NextResponse.json({
      overview: {
        sent,
        delivered,
        opens,
        unique_opens: uniqueOpens,
        clicks,
        unique_clicks: uniqueClicks,
        bounces,
        complaints,
        unsubscribes,
      },
      rates: {
        open_rate,
        click_rate,
        bounce_rate,
        complaint_rate,
      },
      timeline,
      top_links,
      engagement_breakdown: sendStatusCounts,
      geo: [], // future
    });
  } catch (err) {
    console.error(
      "GET /api/email/campaigns/[id]/analytics error:",
      err
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
