/**
 * Campaign Batch Processor
 * Handles creating email send records for a campaign and processing them
 * in batches to stay within SES rate limits.
 */

import { createAdminClient } from "@/lib/supabase/server";
import { sendCampaignEmail } from "./send-engine";
import type {
  EmailCampaign,
  EmailSend,
  Subscriber,
  BatchResult,
  CampaignProgress,
} from "./types";

// ─── Helpers ────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Create Campaign Sends ──────────────────────────────────

/**
 * Create queued email_sends records for every active subscriber
 * targeted by the campaign. If the campaign has a list_id, only
 * subscribers in that list are included; otherwise all active
 * subscribers receive the email.
 *
 * Inserts are batched in groups of 500 for large lists.
 *
 * @returns The number of send records created.
 */
export async function createCampaignSends(
  campaignId: string
): Promise<number> {
  const supabase = await createAdminClient();

  // 1. Fetch the campaign
  const { data: campaign, error: campaignError } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (campaignError || !campaign) {
    throw new Error(
      `Campaign not found: ${campaignError?.message || "unknown error"}`
    );
  }

  // 2. Fetch target subscribers
  let subscribers: Pick<Subscriber, "id" | "email">[];

  if (campaign.list_id) {
    // Join through subscriber_list_members to get subscribers in this list
    const { data, error } = await supabase
      .from("subscriber_list_members")
      .select("subscriber_id, subscribers!inner(id, email, status)")
      .eq("list_id", campaign.list_id)
      .eq("subscribers.status", "active");

    if (error) {
      throw new Error(`Failed to fetch list subscribers: ${error.message}`);
    }

    subscribers = (data || []).map((row: Record<string, unknown>) => {
      const sub = row.subscribers as unknown as {
        id: string;
        email: string;
      };
      return { id: sub.id, email: sub.email };
    });
  } else {
    // All active subscribers
    const { data, error } = await supabase
      .from("subscribers")
      .select("id, email")
      .eq("status", "active");

    if (error) {
      throw new Error(`Failed to fetch subscribers: ${error.message}`);
    }

    subscribers = data || [];
  }

  if (subscribers.length === 0) {
    return 0;
  }

  // 3. Batch insert email_sends (groups of 500)
  const BATCH_SIZE = 500;
  let totalCreated = 0;

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);

    const sendRecords = batch.map((sub) => ({
      campaign_id: campaignId,
      subscriber_id: sub.id,
      email: sub.email,
      status: "queued",
      metadata: {},
    }));

    const { error: insertError, data: inserted } = await supabase
      .from("email_sends")
      .insert(sendRecords)
      .select("id");

    if (insertError) {
      throw new Error(
        `Failed to insert email_sends batch at offset ${i}: ${insertError.message}`
      );
    }

    totalCreated += inserted?.length || batch.length;
  }

  // 4. Update campaign total_recipients
  await supabase
    .from("email_campaigns")
    .update({ total_recipients: totalCreated })
    .eq("id", campaignId);

  return totalCreated;
}

// ─── Process Campaign Batch ─────────────────────────────────

/**
 * Process the next batch of queued sends for a campaign.
 * For each send: render the email, send via SES, record success/failure,
 * and log a 'sent' event. Adds a small delay between sends to respect
 * SES rate limits.
 *
 * When no queued sends remain the campaign status is set to 'sent'.
 *
 * @param campaignId - The campaign to process
 * @param batchSize  - Number of sends to process (default 50)
 */
export async function processCampaignBatch(
  campaignId: string,
  batchSize: number = 50
): Promise<BatchResult> {
  const supabase = await createAdminClient();

  // 1. Fetch the campaign
  const { data: campaign, error: campaignError } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (campaignError || !campaign) {
    throw new Error(
      `Campaign not found: ${campaignError?.message || "unknown error"}`
    );
  }

  const typedCampaign = campaign as unknown as EmailCampaign;

  // 2. Fetch next batch of queued sends joined with subscriber data
  const { data: sends, error: sendsError } = await supabase
    .from("email_sends")
    .select("*, subscribers!inner(*)")
    .eq("campaign_id", campaignId)
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (sendsError) {
    throw new Error(`Failed to fetch queued sends: ${sendsError.message}`);
  }

  if (!sends || sends.length === 0) {
    // No queued sends — mark campaign as completed
    await markCampaignCompleted(supabase, campaignId);
    return {
      sent: 0,
      failed: 0,
      remaining: 0,
      completed: true,
      errors: [],
    };
  }

  // 3. Process each send
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const sendRow of sends) {
    const send = sendRow as unknown as EmailSend & {
      subscribers: Subscriber;
    };
    const subscriber = send.subscribers;

    try {
      // Send the email
      const messageId = await sendCampaignEmail(
        send,
        typedCampaign,
        subscriber
      );

      // Update send record: success
      await supabase
        .from("email_sends")
        .update({
          status: "sent",
          ses_message_id: messageId,
          sent_at: new Date().toISOString(),
        })
        .eq("id", send.id);

      // Log sent event
      await supabase.from("email_events").insert({
        send_id: send.id,
        campaign_id: campaignId,
        subscriber_id: subscriber.id,
        event_type: "sent",
        metadata: { ses_message_id: messageId },
      });

      // Increment campaign sent_count
      await supabase.rpc("increment_campaign_sent_count", {
        cid: campaignId,
      }).then(({ error: rpcError }) => {
        // Fallback: if the RPC doesn't exist, do a manual increment
        if (rpcError) {
          return supabase
            .from("email_campaigns")
            .update({ sent_count: (typedCampaign.sent_count || 0) + sent + 1 })
            .eq("id", campaignId);
        }
      });

      sent++;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown send error";

      // Update send record: failure
      await supabase
        .from("email_sends")
        .update({
          status: "failed",
          error_message: errorMessage,
        })
        .eq("id", send.id);

      errors.push(`${subscriber.email}: ${errorMessage}`);
      failed++;
    }

    // Rate-limit pause between sends (50ms ~ up to 20 emails/sec)
    await sleep(50);
  }

  // 4. Check how many queued sends remain
  const { count: remainingCount } = await supabase
    .from("email_sends")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "queued");

  const remaining = remainingCount ?? 0;
  const completed = remaining === 0;

  // 5. If nothing left, mark campaign as sent/completed
  if (completed) {
    await markCampaignCompleted(supabase, campaignId);
  }

  return {
    sent,
    failed,
    remaining,
    completed,
    errors,
  };
}

// ─── Campaign Progress ──────────────────────────────────────

/**
 * Get real-time progress for a campaign by counting sends in each status.
 */
export async function getCampaignProgress(
  campaignId: string
): Promise<CampaignProgress> {
  const supabase = await createAdminClient();

  // Count sends by status in parallel
  const [sentResult, failedResult, queuedResult, totalResult] =
    await Promise.all([
      supabase
        .from("email_sends")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .eq("status", "sent"),
      supabase
        .from("email_sends")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .eq("status", "failed"),
      supabase
        .from("email_sends")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .eq("status", "queued"),
      supabase
        .from("email_sends")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId),
    ]);

  const sentCount = sentResult.count ?? 0;
  const failedCount = failedResult.count ?? 0;
  const queuedCount = queuedResult.count ?? 0;
  const totalCount = totalResult.count ?? 0;

  const percentage =
    totalCount > 0
      ? Math.round(((sentCount + failedCount) / totalCount) * 100)
      : 0;

  return {
    total: totalCount,
    sent: sentCount,
    failed: failedCount,
    queued: queuedCount,
    percentage,
  };
}

// ─── Internal Helpers ───────────────────────────────────────

/**
 * Mark a campaign as completed: set status='sent' and completed_at.
 */
async function markCampaignCompleted(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  campaignId: string
): Promise<void> {
  const now = new Date().toISOString();

  await supabase
    .from("email_campaigns")
    .update({
      status: "sent",
      completed_at: now,
    })
    .eq("id", campaignId);
}
