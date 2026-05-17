import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Handle SNS subscription confirmation
    if (body.Type === "SubscriptionConfirmation") {
      if (body.SubscribeURL) {
        await fetch(body.SubscribeURL);
      }
      return NextResponse.json({ confirmed: true });
    }

    // Only process Notification type
    if (body.Type !== "Notification") {
      return NextResponse.json({ ok: true });
    }

    const message = JSON.parse(body.Message);
    const notificationType = message.notificationType;
    const messageId = message.mail?.messageId;

    if (!messageId) {
      return NextResponse.json({ ok: true });
    }

    const admin = await createAdminClient();

    // Find the email_send by ses_message_id
    const { data: send } = await admin
      .from("email_sends")
      .select("id, campaign_id, subscriber_id, status")
      .eq("ses_message_id", messageId)
      .single();

    if (!send) {
      // SES message not found in our system — nothing to update
      return NextResponse.json({ ok: true });
    }

    switch (notificationType) {
      case "Bounce":
        await handleBounce(admin, send, message);
        break;

      case "Complaint":
        await handleComplaint(admin, send, message);
        break;

      case "Delivery":
        await handleDelivery(admin, send);
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("SES webhook error:", err);
    // Always return 200 to prevent SNS retries on transient errors
    return NextResponse.json({ ok: true });
  }
}

interface EmailSend {
  id: string;
  campaign_id: string | null;
  subscriber_id: string | null;
  status: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

async function handleBounce(
  admin: AdminClient,
  send: EmailSend,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  message: any
) {
  const bounce = message.bounce;
  const bouncedRecipients = bounce?.bouncedRecipients || [];

  // Update email_send
  await admin
    .from("email_sends")
    .update({
      status: "bounced",
      bounced_at: new Date().toISOString(),
    })
    .eq("id", send.id);

  // Insert email_event
  await admin.from("email_events").insert({
    send_id: send.id,
    campaign_id: send.campaign_id,
    subscriber_id: send.subscriber_id,
    event_type: "bounce",
    metadata: {
      bounce_type: bounce?.bounceType,
      bounce_sub_type: bounce?.bounceSubType,
      recipients: bouncedRecipients.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) => r.emailAddress
      ),
    },
  });

  // Update subscriber status to bounced
  if (send.subscriber_id) {
    await admin
      .from("subscribers")
      .update({ status: "bounced" })
      .eq("id", send.subscriber_id);
  }

  // Increment campaign bounce_count
  if (send.campaign_id) {
    await incrementCampaignCounter(admin, send.campaign_id, "bounce_count");
  }
}

async function handleComplaint(
  admin: AdminClient,
  send: EmailSend,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  message: any
) {
  const complaint = message.complaint;
  const complainedRecipients = complaint?.complainedRecipients || [];

  // Update email_send
  await admin
    .from("email_sends")
    .update({ status: "complained" })
    .eq("id", send.id);

  // Insert email_event
  await admin.from("email_events").insert({
    send_id: send.id,
    campaign_id: send.campaign_id,
    subscriber_id: send.subscriber_id,
    event_type: "complaint",
    metadata: {
      complaint_feedback_type: complaint?.complaintFeedbackType,
      recipients: complainedRecipients.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) => r.emailAddress
      ),
    },
  });

  // Update subscriber status to complained
  if (send.subscriber_id) {
    await admin
      .from("subscribers")
      .update({ status: "complained" })
      .eq("id", send.subscriber_id);
  }

  // Increment campaign complaint_count
  if (send.campaign_id) {
    await incrementCampaignCounter(admin, send.campaign_id, "complaint_count");
  }
}

async function handleDelivery(admin: AdminClient, send: EmailSend) {
  // Only update status if currently 'sent' (don't downgrade from opened/clicked)
  if (send.status === "sent") {
    await admin
      .from("email_sends")
      .update({ status: "delivered" })
      .eq("id", send.id);
  }

  // Insert email_event
  await admin.from("email_events").insert({
    send_id: send.id,
    campaign_id: send.campaign_id,
    subscriber_id: send.subscriber_id,
    event_type: "delivered",
    metadata: {},
  });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function incrementCampaignCounter(
  admin: AdminClient,
  campaignId: string,
  counterName: string
) {
  // Validate campaignId is a proper UUID to prevent injection
  if (!UUID_REGEX.test(campaignId)) return;

  const { data: campaign } = await admin
    .from("email_campaigns")
    .select(counterName)
    .eq("id", campaignId)
    .single();

  if (campaign) {
    await admin
      .from("email_campaigns")
      .update({
        [counterName]: ((campaign as Record<string, number>)[counterName] || 0) + 1,
      })
      .eq("id", campaignId);
  }
}
