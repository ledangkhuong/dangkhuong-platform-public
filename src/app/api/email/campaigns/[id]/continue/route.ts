import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { rateLimit } from "@/lib/rate-limit";

const BATCH_SIZE = 50;
const SEND_DELAY_MS = 80; // ~12 emails/s, safely under SES 14/s limit

function createSESClient() {
  return new SESv2Client({
    region: process.env.AWS_SES_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_SES_ACCESS_KEY!,
      secretAccessKey: process.env.AWS_SES_SECRET_KEY!,
    },
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderTemplate(
  html: string,
  subscriber: { email: string; full_name?: string; id: string }
): string {
  return html
    .replace(/\{\{name\}\}/g, escapeHtml(subscriber.full_name || ""))
    .replace(/\{\{email\}\}/g, escapeHtml(subscriber.email))
    .replace(/\{\{subscriber_id\}\}/g, escapeHtml(subscriber.id));
}

function addTrackingPixel(html: string, sendId: string): string {
  const pixel = `<img src="${process.env.NEXT_PUBLIC_APP_URL || ""}/api/email/track/open?sid=${sendId}" width="1" height="1" style="display:none" alt="" />`;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${pixel}</body>`);
  }
  return html + pixel;
}

function rewriteLinksForTracking(html: string, sendId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  return html.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (_match, url) => {
      const trackingUrl = `${baseUrl}/api/email/track/click?sid=${sendId}&url=${encodeURIComponent(url)}`;
      return `href="${trackingUrl}"`;
    }
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// POST /api/email/campaigns/[id]/continue — process next batch of queued sends
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!["admin", "manager"].includes(profile?.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Rate limit: 3 per minute per user
    const rl = await rateLimit(`campaign-continue:${user.id}`, 3, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retryAfterSec: rl.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
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

    if (campaign.status !== "sending" && campaign.status !== "paused") {
      return NextResponse.json(
        { error: "Campaign must be in sending or paused status to continue" },
        { status: 400 }
      );
    }

    // If paused, check for "resume" query param; otherwise just return status
    const url = new URL(_req.url);
    const resume = url.searchParams.get("resume") === "1";

    if (campaign.status === "paused" && !resume) {
      return NextResponse.json({
        sent: 0,
        remaining: 0,
        completed: false,
        campaign,
      });
    }

    // Resume: set back to sending
    if (campaign.status === "paused" && resume) {
      await admin
        .from("email_campaigns")
        .update({ status: "sending", updated_at: new Date().toISOString() })
        .eq("id", id);
    }

    // ─── Claim batch: SELECT ids first, then UPDATE by ids ───
    // (.update().limit() is unreliable in PostgREST/Supabase)
    const { data: queuedRows, error: selectError } = await admin
      .from("email_sends")
      .select("id")
      .eq("campaign_id", id)
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (selectError) {
      return NextResponse.json(
        { error: selectError.message },
        { status: 500 }
      );
    }

    if (!queuedRows || queuedRows.length === 0) {
      // No more queued sends — check if all done
      const { count: remainingCount } = await admin
        .from("email_sends")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", id)
        .in("status", ["queued", "sending"]);

      if (!remainingCount || remainingCount === 0) {
        // All done, mark campaign as completed
        // Calculate actual sent count from email_sends
        const { count: actualSentCount } = await admin
          .from("email_sends")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", id)
          .eq("status", "sent");

        await admin
          .from("email_campaigns")
          .update({
            status: "sent",
            sent_count: actualSentCount || 0,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
      }

      const { data: finalCampaign } = await admin
        .from("email_campaigns")
        .select("*")
        .eq("id", id)
        .single();

      return NextResponse.json({
        sent: 0,
        remaining: 0,
        completed: true,
        campaign: finalCampaign,
      });
    }

    // Claim the batch by updating status to "sending"
    const batchIds = queuedRows.map((r) => r.id);

    const { data: claimedSends, error: claimError } = await admin
      .from("email_sends")
      .update({ status: "sending" })
      .in("id", batchIds)
      .select("id, subscriber_id, email");

    if (claimError || !claimedSends || claimedSends.length === 0) {
      return NextResponse.json(
        { error: claimError?.message || "Failed to claim batch" },
        { status: 500 }
      );
    }

    // Fetch subscriber details for template rendering
    const subscriberIds = claimedSends.map((s) => s.subscriber_id);
    const { data: subscribers } = await admin
      .from("subscribers")
      .select("id, email, full_name")
      .in("id", subscriberIds);

    const subscriberMap = new Map(
      (subscribers || []).map((s: { id: string; email: string; full_name?: string }) => [s.id, s])
    );

    const sesClient = createSESClient();
    let sentCount = 0;

    for (const send of claimedSends) {
      // Check if campaign was paused mid-batch
      if (sentCount > 0 && sentCount % 10 === 0) {
        const { data: currentCampaign } = await admin
          .from("email_campaigns")
          .select("status")
          .eq("id", id)
          .single();

        if (currentCampaign?.status === "paused") {
          // Revert unclaimed sends back to queued
          const unsentIds = claimedSends.slice(sentCount).map(s => s.id);
          if (unsentIds.length > 0) {
            await admin
              .from("email_sends")
              .update({ status: "queued" })
              .in("id", unsentIds);
          }
          break;
        }
      }

      try {
        const subscriber = subscriberMap.get(send.subscriber_id) || {
          id: send.subscriber_id,
          email: send.email,
          full_name: "",
        };

        // Render HTML with subscriber variables
        let renderedHtml = renderTemplate(
          campaign.html_content,
          subscriber
        );

        // Add tracking pixel
        renderedHtml = addTrackingPixel(renderedHtml, send.id);

        // Rewrite links for click tracking
        renderedHtml = rewriteLinksForTracking(renderedHtml, send.id);

        // Send via SES
        const command = new SendEmailCommand({
          FromEmailAddress: `${campaign.from_name || process.env.EMAIL_FROM_NAME || "Lê Đăng Khương Academy"} <${campaign.from_email || process.env.EMAIL_FROM || "support@ledangkhuong.net"}>`,
          Destination: { ToAddresses: [send.email] },
          Content: {
            Simple: {
              Subject: { Data: campaign.subject, Charset: "UTF-8" },
              Body: {
                Html: { Data: renderedHtml, Charset: "UTF-8" },
                Text: { Data: campaign.text_content || "", Charset: "UTF-8" },
              },
            },
          },
          ReplyToAddresses: campaign.reply_to
            ? [campaign.reply_to]
            : undefined,
        });

        const result = await sesClient.send(command);

        // Update send status to "sent"
        await admin
          .from("email_sends")
          .update({
            status: "sent",
            ses_message_id: result.MessageId || null,
            sent_at: new Date().toISOString(),
          })
          .eq("id", send.id);

        sentCount++;

        // Rate limiting delay between sends
        if (SEND_DELAY_MS > 0) {
          await sleep(SEND_DELAY_MS);
        }
      } catch (sendErr) {
        console.error(
          `Failed to send email to ${send.email}:`,
          sendErr
        );
        await admin
          .from("email_sends")
          .update({
            status: "failed",
            error_message:
              sendErr instanceof Error
                ? sendErr.message
                : "Unknown error",
          })
          .eq("id", send.id);
      }
    }

    // ─── ATOMIC sent_count: count actual "sent" records instead of incrementing ───
    const { count: totalSent } = await admin
      .from("email_sends")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", id)
      .eq("status", "sent");

    await admin
      .from("email_campaigns")
      .update({
        sent_count: totalSent || 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Check remaining (queued + sending)
    const { count: remainingCount } = await admin
      .from("email_sends")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", id)
      .in("status", ["queued", "sending"]);

    const remaining = remainingCount || 0;
    const completed = remaining === 0;

    // If no more queued, mark as completed
    if (completed) {
      await admin
        .from("email_campaigns")
        .update({
          status: "sent",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    }

    // Re-fetch campaign for UI
    const { data: latestCampaign } = await admin
      .from("email_campaigns")
      .select("*")
      .eq("id", id)
      .single();

    return NextResponse.json({
      sent: sentCount,
      remaining,
      completed,
      campaign: latestCampaign,
    });
  } catch (err) {
    console.error("POST /api/email/campaigns/[id]/continue error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
