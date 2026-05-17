import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const FALLBACK_URL = "https://dangkhuong.com";

const ALLOWED_DOMAINS = ["dangkhuong.com", "www.dangkhuong.com"];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.some(
      (d) => parsed.hostname === d || parsed.hostname.endsWith("." + d)
    );
  } catch {
    return false;
  }
}

function redirect(url: string) {
  return NextResponse.redirect(url, { status: 302 });
}

export async function GET(req: NextRequest) {
  const sid = req.nextUrl.searchParams.get("sid");
  const encodedUrl = req.nextUrl.searchParams.get("url");

  const decodedUrl = encodedUrl ? decodeURIComponent(encodedUrl) : null;
  const targetUrl =
    decodedUrl && isAllowedUrl(decodedUrl) ? decodedUrl : FALLBACK_URL;

  if (!sid) {
    return redirect(targetUrl);
  }

  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || null;

    // Rate limit: 60 requests per minute per IP
    // If rate limited, still redirect (don't break user experience) but skip the database write
    const rl = await rateLimit(`email-track:${ip || "unknown"}`, 60, 60);
    if (!rl.allowed) {
      return redirect(targetUrl);
    }

    const admin = await createAdminClient();

    // Fetch the email send record
    const { data: send, error: sendError } = await admin
      .from("email_sends")
      .select("id, campaign_id, subscriber_id, clicked_at, status")
      .eq("id", sid)
      .single();

    if (sendError || !send) {
      return redirect(targetUrl);
    }

    // Insert click event (always, for counting multiple clicks)
    await admin.from("email_events").insert({
      send_id: send.id,
      campaign_id: send.campaign_id,
      subscriber_id: send.subscriber_id,
      event_type: "click",
      metadata: { url: decodedUrl },
      ip_address: ip,
      user_agent: userAgent,
    });

    // Update send record if not already clicked
    if (!send.clicked_at) {
      const updateData: Record<string, unknown> = {
        clicked_at: new Date().toISOString(),
      };

      // Upgrade status to 'clicked' if not bounced/complained
      if (
        send.status !== "bounced" &&
        send.status !== "complained"
      ) {
        updateData.status = "clicked";
      }

      await admin.from("email_sends").update(updateData).eq("id", send.id);

      // Increment campaign click_count
      if (send.campaign_id) {
        const { data: campaign } = await admin
          .from("email_campaigns")
          .select("click_count")
          .eq("id", send.campaign_id)
          .single();

        if (campaign) {
          await admin
            .from("email_campaigns")
            .update({ click_count: (campaign.click_count || 0) + 1 })
            .eq("id", send.campaign_id);
        }
      }
    }
  } catch (err) {
    console.error("Click tracking error:", err);
    // Never fail — always redirect
  }

  return redirect(targetUrl);
}
