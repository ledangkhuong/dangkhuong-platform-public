import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/email/unsubscribe — fetch subscriber info for the unsubscribe page
export async function GET(req: NextRequest) {
  try {
    const sid = req.nextUrl.searchParams.get("sid");
    const email = req.nextUrl.searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "email is required" },
        { status: 400 }
      );
    }

    const admin = await createAdminClient();

    const { data: subscriber, error } = await admin
      .from("subscribers")
      .select("id, email, status, unsubscribed_at")
      .eq("email", email)
      .single();

    if (error || !subscriber) {
      return NextResponse.json(
        { error: "Subscriber not found" },
        { status: 404 }
      );
    }

    // If send_id provided, get campaign info
    let campaignName: string | null = null;
    if (sid) {
      const { data: send } = await admin
        .from("email_sends")
        .select("campaign_id")
        .eq("id", sid)
        .single();

      if (send?.campaign_id) {
        const { data: campaign } = await admin
          .from("email_campaigns")
          .select("name")
          .eq("id", send.campaign_id)
          .single();

        campaignName = campaign?.name || null;
      }
    }

    return NextResponse.json({
      subscriber: {
        email: subscriber.email,
        status: subscriber.status,
        already_unsubscribed: subscriber.status === "unsubscribed",
      },
      campaign_name: campaignName,
    });
  } catch (err) {
    console.error("GET /api/email/unsubscribe error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/email/unsubscribe — process unsubscribe request
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, send_id, reason } = body;

    if (!email) {
      return NextResponse.json(
        { error: "email is required" },
        { status: 400 }
      );
    }

    const admin = await createAdminClient();

    // Find subscriber by email
    const { data: subscriber, error: subError } = await admin
      .from("subscribers")
      .select("id, status")
      .eq("email", email)
      .single();

    if (subError || !subscriber) {
      return NextResponse.json(
        { error: "Subscriber not found" },
        { status: 404 }
      );
    }

    // Update subscriber status
    await admin
      .from("subscribers")
      .update({
        status: "unsubscribed",
        unsubscribed_at: new Date().toISOString(),
      })
      .eq("id", subscriber.id);

    // If send_id provided, record the event and increment counter
    if (send_id) {
      const { data: send } = await admin
        .from("email_sends")
        .select("id, campaign_id, subscriber_id")
        .eq("id", send_id)
        .single();

      if (send) {
        // Insert unsubscribe event
        await admin.from("email_events").insert({
          send_id: send.id,
          campaign_id: send.campaign_id,
          subscriber_id: send.subscriber_id || subscriber.id,
          event_type: "unsubscribe",
          metadata: { reason: reason || null },
        });

        // Increment campaign unsubscribe_count
        if (send.campaign_id) {
          const { error: rpcError } = await admin.rpc("exec_sql", {
            query: `UPDATE email_campaigns SET unsubscribe_count = unsubscribe_count + 1 WHERE id = '${send.campaign_id}'`,
          });

          if (rpcError) {
            // Fallback: read-then-write
            const { data: campaign } = await admin
              .from("email_campaigns")
              .select("unsubscribe_count")
              .eq("id", send.campaign_id)
              .single();

            if (campaign) {
              await admin
                .from("email_campaigns")
                .update({
                  unsubscribe_count: (campaign.unsubscribe_count || 0) + 1,
                })
                .eq("id", send.campaign_id);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/email/unsubscribe error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
