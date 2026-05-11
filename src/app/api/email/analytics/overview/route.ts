import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET /api/email/analytics/overview — aggregated analytics overview
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await createAdminClient();

    const searchParams = req.nextUrl.searchParams;
    const period = searchParams.get("period") || "30d";

    // Calculate date range
    const now = new Date();
    let daysBack = 30;
    if (period === "7d") daysBack = 7;
    else if (period === "90d") daysBack = 90;
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const startISO = startDate.toISOString();

    // Fetch campaigns within period
    const { data: campaigns } = await admin
      .from("email_campaigns")
      .select(
        "id, name, subject, status, sent_count, open_count, click_count, sent_at, created_at, total_recipients"
      )
      .gte("created_at", startISO)
      .order("created_at", { ascending: false });

    const campaignList = campaigns || [];

    // Aggregate summary
    const total_sent = campaignList.reduce(
      (sum, c) => sum + (c.sent_count || 0),
      0
    );
    const total_opens = campaignList.reduce(
      (sum, c) => sum + (c.open_count || 0),
      0
    );
    const total_clicks = campaignList.reduce(
      (sum, c) => sum + (c.click_count || 0),
      0
    );

    // Fetch bounce/complaint events within period
    const { data: events } = await admin
      .from("email_events")
      .select("event_type, created_at, subscriber_id, metadata")
      .gte("created_at", startISO);

    const allEvents = events || [];

    let total_bounces = 0;
    let total_complaints = 0;
    let total_unsubscribes = 0;
    let hard_bounces = 0;
    let soft_bounces = 0;

    // Build daily stats map
    const dailyMap = new Map<
      string,
      {
        date: string;
        sent: number;
        opens: number;
        clicks: number;
        bounces: number;
        new_subscribers: number;
      }
    >();

    // Initialize all days in range
    for (let d = 0; d < daysBack; d++) {
      const date = new Date(
        startDate.getTime() + d * 24 * 60 * 60 * 1000
      );
      const key = date.toISOString().split("T")[0];
      dailyMap.set(key, {
        date: key,
        sent: 0,
        opens: 0,
        clicks: 0,
        bounces: 0,
        new_subscribers: 0,
      });
    }

    // Count events by type and day
    for (const event of allEvents) {
      const dateKey = event.created_at
        ? new Date(event.created_at).toISOString().split("T")[0]
        : null;

      switch (event.event_type) {
        case "bounce":
          total_bounces++;
          {
            const meta = event.metadata as Record<string, unknown> | null;
            const bounceType = meta?.bounce_type as string | undefined;
            if (bounceType === "Permanent") hard_bounces++;
            else soft_bounces++;
          }
          if (dateKey && dailyMap.has(dateKey)) {
            dailyMap.get(dateKey)!.bounces++;
          }
          break;
        case "complaint":
          total_complaints++;
          break;
        case "unsubscribe":
          total_unsubscribes++;
          break;
        case "open":
          if (dateKey && dailyMap.has(dateKey)) {
            dailyMap.get(dateKey)!.opens++;
          }
          break;
        case "click":
          if (dateKey && dailyMap.has(dateKey)) {
            dailyMap.get(dateKey)!.clicks++;
          }
          break;
      }
    }

    // Add sent counts by day from campaigns
    for (const c of campaignList) {
      const dateKey = c.sent_at
        ? new Date(c.sent_at).toISOString().split("T")[0]
        : c.created_at
          ? new Date(c.created_at).toISOString().split("T")[0]
          : null;
      if (dateKey && dailyMap.has(dateKey)) {
        dailyMap.get(dateKey)!.sent += c.sent_count || 0;
      }
    }

    // Fetch new subscribers per day
    const { data: newSubscribers } = await admin
      .from("subscribers")
      .select("created_at")
      .gte("created_at", startISO);

    for (const sub of newSubscribers || []) {
      const dateKey = sub.created_at
        ? new Date(sub.created_at).toISOString().split("T")[0]
        : null;
      if (dateKey && dailyMap.has(dateKey)) {
        dailyMap.get(dateKey)!.new_subscribers++;
      }
    }

    const daily_stats = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // Calculate rates
    const avg_open_rate =
      total_sent > 0
        ? Math.round((total_opens / total_sent) * 10000) / 100
        : 0;
    const avg_click_rate =
      total_sent > 0
        ? Math.round((total_clicks / total_sent) * 10000) / 100
        : 0;
    const avg_bounce_rate =
      total_sent > 0
        ? Math.round((total_bounces / total_sent) * 10000) / 100
        : 0;

    // Top 5 campaigns by open rate
    const sentCampaigns = campaignList.filter(
      (c) => c.status === "sent" && (c.sent_count || 0) > 0
    );
    const top_campaigns = sentCampaigns
      .map((c) => ({
        id: c.id,
        name: c.name,
        subject: c.subject,
        sent_count: c.sent_count || 0,
        open_count: c.open_count || 0,
        click_count: c.click_count || 0,
        open_rate:
          Math.round(
            ((c.open_count || 0) / (c.sent_count || 1)) * 10000
          ) / 100,
        click_rate:
          Math.round(
            ((c.click_count || 0) / (c.sent_count || 1)) * 10000
          ) / 100,
      }))
      .sort((a, b) => b.open_rate - a.open_rate)
      .slice(0, 5);

    // Subscriber growth data
    const { count: totalActive } = await admin
      .from("subscribers")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    const subscriber_growth = daily_stats.map((d) => ({
      date: d.date,
      new_subscribers: d.new_subscribers,
      total_active: totalActive || 0,
    }));

    // Recent bounces
    const { data: recentBounces } = await admin
      .from("email_events")
      .select("subscriber_id, metadata, created_at, campaign_id")
      .eq("event_type", "bounce")
      .order("created_at", { ascending: false })
      .limit(10);

    // Enrich bounces with subscriber email
    const recentBounceList = [];
    for (const b of recentBounces || []) {
      let email = "Unknown";
      if (b.subscriber_id) {
        const { data: sub } = await admin
          .from("subscribers")
          .select("email")
          .eq("id", b.subscriber_id)
          .single();
        if (sub) email = sub.email;
      }
      const meta = b.metadata as Record<string, unknown> | null;
      recentBounceList.push({
        email,
        bounce_type: (meta?.bounce_type as string) || "Unknown",
        reason: (meta?.bounce_reason as string) || "",
        date: b.created_at,
        campaign_id: b.campaign_id,
      });
    }

    return NextResponse.json({
      summary: {
        total_sent,
        total_opens,
        total_clicks,
        total_bounces,
        total_complaints,
        total_unsubscribes,
      },
      rates: {
        avg_open_rate,
        avg_click_rate,
        avg_bounce_rate,
      },
      daily_stats,
      top_campaigns,
      subscriber_growth,
      recent_bounces: recentBounceList,
      bounce_breakdown: {
        hard_bounces,
        soft_bounces,
      },
      period,
      campaign_count: campaignList.length,
    });
  } catch (err) {
    console.error("GET /api/email/analytics/overview error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
