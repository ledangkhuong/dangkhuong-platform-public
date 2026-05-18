import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

// GET /api/email/unsubscribe — fetch subscriber info for the unsubscribe page
export async function GET(req: NextRequest) {
  try {
    // Rate limit: 10 GET requests per minute per IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const rl = await rateLimit(`unsub-get:${ip}`, 10, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSec) },
        }
      );
    }

    const sid = req.nextUrl.searchParams.get("sid");
    const email = req.nextUrl.searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email là bắt buộc" },
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
        { error: "Không tìm thấy người đăng ký" },
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
    // Rate limit: 5 POST (unsubscribe) requests per minute per IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const rl = await rateLimit(`unsub-post:${ip}`, 5, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSec) },
        }
      );
    }

    const body = await req.json();
    const { email, send_id, reason } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email là bắt buộc" },
        { status: 400 }
      );
    }

    // Require a valid send_id to prevent unauthenticated unsubscribe abuse
    if (!send_id) {
      return NextResponse.json(
        { error: "send_id is required" },
        { status: 400 }
      );
    }

    const admin = await createAdminClient();

    // Validate that send_id corresponds to a real send for this email address
    // This prevents attackers from unsubscribing arbitrary emails without a valid link
    const { data: send } = await admin
      .from("email_sends")
      .select("id, campaign_id, subscriber_id")
      .eq("id", send_id)
      .single();

    if (!send) {
      return NextResponse.json(
        { error: "Invalid send_id" },
        { status: 400 }
      );
    }

    // Verify the send's subscriber matches the provided email
    if (send.subscriber_id) {
      const { data: sendSubscriber } = await admin
        .from("subscribers")
        .select("email")
        .eq("id", send.subscriber_id)
        .single();

      if (!sendSubscriber || sendSubscriber.email !== email) {
        return NextResponse.json(
          { error: "send_id does not match email" },
          { status: 400 }
        );
      }
    }

    // Find subscriber by email
    const { data: subscriber, error: subError } = await admin
      .from("subscribers")
      .select("id, status")
      .eq("email", email)
      .single();

    if (subError || !subscriber) {
      return NextResponse.json(
        { error: "Không tìm thấy người đăng ký" },
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

    // Record the unsubscribe event using the validated send
    await admin.from("email_events").insert({
      send_id: send.id,
      campaign_id: send.campaign_id,
      subscriber_id: send.subscriber_id || subscriber.id,
      event_type: "unsubscribe",
      metadata: { reason: reason || null },
    });

    // Atomically increment campaign unsubscribe_count
    if (send.campaign_id) {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(send.campaign_id)) {
        await admin.rpc("increment_unsubscribe_count", {
          campaign_id_param: send.campaign_id,
        });
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
