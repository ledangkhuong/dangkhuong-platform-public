import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const BATCH_SIZE = 50;

function createSESClient() {
  return new SESv2Client({
    region: process.env.AWS_SES_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_SES_ACCESS_KEY!,
      secretAccessKey: process.env.AWS_SES_SECRET_KEY!,
    },
  });
}

function renderTemplate(
  html: string,
  subscriber: { email: string; full_name?: string; id: string }
): string {
  return html
    .replace(/\{\{name\}\}/g, subscriber.full_name || "")
    .replace(/\{\{email\}\}/g, subscriber.email)
    .replace(/\{\{subscriber_id\}\}/g, subscriber.id);
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

    // If paused, set back to sending
    if (campaign.status === "paused") {
      await admin
        .from("email_campaigns")
        .update({ status: "sending", updated_at: new Date().toISOString() })
        .eq("id", id);
    }

    // Get next batch of queued sends with subscriber info
    const { data: queuedSends, error: queueError } = await admin
      .from("email_sends")
      .select("id, subscriber_id, email")
      .eq("campaign_id", id)
      .eq("status", "queued")
      .limit(BATCH_SIZE);

    if (queueError) {
      return NextResponse.json(
        { error: queueError.message },
        { status: 500 }
      );
    }

    if (!queuedSends || queuedSends.length === 0) {
      // No more queued sends, mark campaign as completed
      await admin
        .from("email_campaigns")
        .update({
          status: "sent",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      // Re-fetch to get updated campaign data for UI
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

    // Fetch subscriber details for template rendering
    const subscriberIds = queuedSends.map((s) => s.subscriber_id);
    const { data: subscribers } = await admin
      .from("subscribers")
      .select("id, email, full_name")
      .in("id", subscriberIds);

    const subscriberMap = new Map(
      (subscribers || []).map((s: { id: string; email: string; full_name?: string }) => [s.id, s])
    );

    const sesClient = createSESClient();
    let sentCount = 0;

    for (const send of queuedSends) {
      // Check if campaign was paused mid-batch
      const { data: currentCampaign } = await admin
        .from("email_campaigns")
        .select("status")
        .eq("id", id)
        .single();

      if (currentCampaign?.status === "paused") {
        break;
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

        // Update send status
        await admin
          .from("email_sends")
          .update({
            status: "sent",
            ses_message_id: result.MessageId || null,
            sent_at: new Date().toISOString(),
          })
          .eq("id", send.id);

        sentCount++;
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

    // Update campaign sent_count (increment)
    const { data: updatedCampaign } = await admin
      .from("email_campaigns")
      .select("sent_count")
      .eq("id", id)
      .single();

    const newSentCount = (updatedCampaign?.sent_count || 0) + sentCount;
    await admin
      .from("email_campaigns")
      .update({
        sent_count: newSentCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Check remaining
    const { count: remainingCount } = await admin
      .from("email_sends")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", id)
      .eq("status", "queued");

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
