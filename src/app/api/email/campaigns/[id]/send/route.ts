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
  // Insert before closing body tag, or append at end
  if (html.includes("</body>")) {
    return html.replace("</body>", `${pixel}</body>`);
  }
  return html + pixel;
}

function rewriteLinksForTracking(html: string, sendId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  // Match href attributes with http/https URLs
  return html.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (_match, url) => {
      const trackingUrl = `${baseUrl}/api/email/track/click?sid=${sendId}&url=${encodeURIComponent(url)}`;
      return `href="${trackingUrl}"`;
    }
  );
}

async function sendEmail(
  sesClient: SESv2Client,
  options: {
    fromName: string;
    fromEmail: string;
    replyTo?: string;
    toEmail: string;
    subject: string;
    htmlContent: string;
    textContent?: string;
  }
) {
  const command = new SendEmailCommand({
    FromEmailAddress: `${options.fromName} <${options.fromEmail}>`,
    Destination: { ToAddresses: [options.toEmail] },
    Content: {
      Simple: {
        Subject: { Data: options.subject },
        Body: {
          Html: { Data: options.htmlContent },
          Text: { Data: options.textContent || "" },
        },
      },
    },
    ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
  });

  return sesClient.send(command);
}

// POST /api/email/campaigns/[id]/send — trigger sending a campaign
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

    if (campaign.status !== "draft" && campaign.status !== "scheduled") {
      return NextResponse.json(
        { error: "Campaign must be in draft or scheduled status to send" },
        { status: 400 }
      );
    }

    if (!campaign.html_content?.trim()) {
      return NextResponse.json(
        { error: "Campaign must have html_content before sending" },
        { status: 400 }
      );
    }

    // Step 1: Set status = 'sending', set sent_at = now()
    await admin
      .from("email_campaigns")
      .update({
        status: "sending",
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Step 2: Get target subscribers
    let subscribersQuery;
    if (campaign.list_id) {
      // Get active subscribers in the specified list
      subscribersQuery = admin
        .from("subscriber_list_members")
        .select(
          "subscribers!inner(id, email, full_name)"
        )
        .eq("list_id", campaign.list_id)
        .eq("subscribers.status", "active");
    } else {
      // Get ALL active subscribers
      subscribersQuery = admin
        .from("subscribers")
        .select("id, email, full_name")
        .eq("status", "active");
    }

    const { data: subscriberRows, error: subError } = await subscribersQuery;

    if (subError) {
      // Revert status on error
      await admin
        .from("email_campaigns")
        .update({ status: "draft", sent_at: null, updated_at: new Date().toISOString() })
        .eq("id", id);
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    // Normalize subscriber data (handle joined vs direct queries)
    const subscribers = (subscriberRows || []).map(
      (row: Record<string, unknown>) => {
        if (row.subscribers) {
          return row.subscribers as { id: string; email: string; full_name?: string };
        }
        return row as unknown as { id: string; email: string; full_name?: string };
      }
    );

    if (subscribers.length === 0) {
      await admin
        .from("email_campaigns")
        .update({
          status: "sent",
          completed_at: new Date().toISOString(),
          total_recipients: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      return NextResponse.json({
        success: true,
        total_recipients: 0,
        sent: 0,
        remaining: 0,
      });
    }

    // Create email_sends records for each subscriber
    const sendRecords = subscribers.map((sub) => ({
      campaign_id: id,
      subscriber_id: sub.id,
      email: sub.email,
      status: "queued",
    }));

    const { error: insertsError } = await admin
      .from("email_sends")
      .insert(sendRecords);

    if (insertsError) {
      await admin
        .from("email_campaigns")
        .update({ status: "draft", sent_at: null, updated_at: new Date().toISOString() })
        .eq("id", id);
      return NextResponse.json(
        { error: insertsError.message },
        { status: 500 }
      );
    }

    // Update total_recipients
    await admin
      .from("email_campaigns")
      .update({
        total_recipients: subscribers.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Step 3: Process first batch
    const { data: queuedSends, error: queueError } = await admin
      .from("email_sends")
      .select("id, subscriber_id, email")
      .eq("campaign_id", id)
      .eq("status", "queued")
      .limit(BATCH_SIZE);

    if (queueError || !queuedSends) {
      return NextResponse.json(
        { error: queueError?.message || "Failed to fetch queued sends" },
        { status: 500 }
      );
    }

    const sesClient = createSESClient();
    let sentCount = 0;

    // Build a subscriber map for template rendering
    const subscriberMap = new Map(
      subscribers.map((s) => [s.email, s])
    );

    for (const send of queuedSends) {
      try {
        const subscriber = subscriberMap.get(send.email) || {
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
        const result = await sendEmail(sesClient, {
          fromName: campaign.from_name || "Dang Khuong Academy",
          fromEmail: campaign.from_email || "support@ledangkhuong.net",
          replyTo: campaign.reply_to || undefined,
          toEmail: send.email,
          subject: campaign.subject,
          htmlContent: renderedHtml,
          textContent: campaign.text_content || undefined,
        });

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

    // Update campaign sent_count
    await admin
      .from("email_campaigns")
      .update({
        sent_count: sentCount,
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

    // If no more queued, mark as completed
    if (remaining === 0) {
      await admin
        .from("email_campaigns")
        .update({
          status: "sent",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    }

    return NextResponse.json({
      success: true,
      total_recipients: subscribers.length,
      sent: sentCount,
      remaining,
    });
  } catch (err) {
    console.error("POST /api/email/campaigns/[id]/send error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
