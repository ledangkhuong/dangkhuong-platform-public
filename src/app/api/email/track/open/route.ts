import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

const GIF_HEADERS = {
  "Content-Type": "image/gif",
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;

function gifResponse() {
  return new Response(TRANSPARENT_GIF, { headers: GIF_HEADERS });
}

export async function GET(req: NextRequest) {
  const sid = req.nextUrl.searchParams.get("sid");

  if (!sid) {
    return gifResponse();
  }

  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || null;

    // Rate limit: 60 requests per minute per IP
    // If rate limited, still return the pixel (don't break email rendering)
    const rl = await rateLimit(`email-track:${ip || "unknown"}`, 60, 60);
    if (!rl.allowed) {
      return gifResponse();
    }

    const admin = await createAdminClient();

    // Fetch the email send record
    const { data: send, error: sendError } = await admin
      .from("email_sends")
      .select("id, campaign_id, subscriber_id, opened_at, status")
      .eq("id", sid)
      .single();

    if (sendError || !send) {
      return gifResponse();
    }

    const alreadyOpened = !!send.opened_at;

    // Always insert an email_event (tracks multiple opens)
    await admin.from("email_events").insert({
      send_id: send.id,
      campaign_id: send.campaign_id,
      subscriber_id: send.subscriber_id,
      event_type: "open",
      metadata: {},
      ip_address: ip,
      user_agent: userAgent,
    });

    if (!alreadyOpened) {
      // Update send status only if currently 'sent' or 'delivered'
      const statusUpdate: Record<string, unknown> = {
        opened_at: new Date().toISOString(),
      };
      if (send.status === "sent" || send.status === "delivered") {
        statusUpdate.status = "opened";
      }

      await admin.from("email_sends").update(statusUpdate).eq("id", send.id);

      // Increment campaign open_count
      if (send.campaign_id) {
        const { data: campaign } = await admin
          .from("email_campaigns")
          .select("open_count")
          .eq("id", send.campaign_id)
          .single();

        if (campaign) {
          await admin
            .from("email_campaigns")
            .update({ open_count: (campaign.open_count || 0) + 1 })
            .eq("id", send.campaign_id);
        }
      }
    }
  } catch (err) {
    console.error("Open tracking error:", err);
    // Never fail — always return the pixel
  }

  return gifResponse();
}
