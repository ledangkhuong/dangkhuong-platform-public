/**
 * Email Queue / Batch Processor
 * Xử lý gửi email campaign theo batch, tôn trọng SES rate limits
 *
 * SES rate limit mặc định: 14 emails/giây
 * Delay 100ms giữa mỗi email = ~10 emails/giây (an toàn)
 */

import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "./ses";
import { getDefaultVariables, prepareEmailHtml } from "./template-renderer";
import type { BatchResult, SendResult } from "./types";

// ─── Constants ───────────────────────────────────────────────

const DEFAULT_BATCH_SIZE = 50;
const SEND_DELAY_MS = 100; // 100ms giữa mỗi email

// ─── Create Campaign Sends ───────────────────────────────────

/**
 * Tạo bản ghi email_sends cho tất cả subscribers trong campaign
 *
 * 1. Lấy thông tin campaign (list_id)
 * 2. Lấy tất cả active subscribers (thuộc list hoặc toàn bộ)
 * 3. Tạo email_sends records với status='queued'
 * 4. Cập nhật total_recipients trên campaign
 *
 * @param campaignId - ID campaign cần tạo sends
 * @returns Số lượng sends đã tạo
 */
export async function createCampaignSends(campaignId: string): Promise<number> {
  const supabase = await createAdminClient();

  // 1. Lấy thông tin campaign
  const { data: campaign, error: campaignError } = await supabase
    .from("email_campaigns")
    .select("id, subject, list_id, status")
    .eq("id", campaignId)
    .single();

  if (campaignError || !campaign) {
    throw new Error(`Không tìm thấy campaign: ${campaignId}`);
  }

  // 2. Lấy danh sách subscribers active
  let subscribersQuery = supabase
    .from("subscribers")
    .select("id, email, full_name")
    .eq("status", "active");

  // Nếu campaign có target list cụ thể, lọc theo list
  if (campaign.list_id) {
    const { data: listSubscriberIds } = await supabase
      .from("subscriber_list_members")
      .select("subscriber_id")
      .eq("list_id", campaign.list_id);

    if (listSubscriberIds && listSubscriberIds.length > 0) {
      const ids = listSubscriberIds.map((ls) => ls.subscriber_id);
      subscribersQuery = subscribersQuery.in("id", ids);
    } else {
      // List trống, không có ai để gửi
      return 0;
    }
  }

  const { data: subscribers, error: subscribersError } = await subscribersQuery;

  if (subscribersError) {
    throw new Error(`Lỗi lấy danh sách subscribers: ${subscribersError.message}`);
  }

  if (!subscribers || subscribers.length === 0) {
    return 0;
  }

  // 3. Kiểm tra và loại bỏ subscribers đã có email_sends cho campaign này
  const { data: existingSends } = await supabase
    .from("email_sends")
    .select("subscriber_id")
    .eq("campaign_id", campaignId);

  const existingIds = new Set(
    (existingSends || []).map((s) => s.subscriber_id)
  );

  const newSubscribers = subscribers.filter(
    (sub) => !existingIds.has(sub.id)
  );

  if (newSubscribers.length === 0) {
    return 0;
  }

  // 4. Tạo email_sends records theo batch (Supabase có giới hạn insert)
  const INSERT_BATCH_SIZE = 500;
  let totalCreated = 0;

  for (let i = 0; i < newSubscribers.length; i += INSERT_BATCH_SIZE) {
    const batch = newSubscribers.slice(i, i + INSERT_BATCH_SIZE);
    const sends = batch.map((sub) => ({
      campaign_id: campaignId,
      subscriber_id: sub.id,
      email: sub.email,
      status: "queued" as const,
    }));

    const { error: insertError } = await supabase
      .from("email_sends")
      .insert(sends);

    if (insertError) {
      console.error(
        `[Queue] Lỗi tạo email_sends batch ${i}:`,
        insertError.message
      );
    } else {
      totalCreated += batch.length;
    }
  }

  // 5. Cập nhật total_recipients trên campaign
  await supabase
    .from("email_campaigns")
    .update({ total_recipients: totalCreated })
    .eq("id", campaignId);

  console.log(
    `[Queue] Đã tạo ${totalCreated} email_sends cho campaign ${campaignId}`
  );

  return totalCreated;
}

// ─── Process Campaign Batch ──────────────────────────────────

/**
 * Xử lý 1 batch email trong campaign
 *
 * 1. Lấy thông tin campaign + HTML template
 * 2. Lấy batch email_sends tiếp theo (status='queued')
 * 3. Với mỗi send: render template → gửi qua SES → cập nhật status
 * 4. Cập nhật sent_count trên campaign
 *
 * @param campaignId - ID campaign cần xử lý
 * @param batchSize - Số email mỗi batch (mặc định 50)
 * @returns Kết quả: sent, failed, remaining
 */
export async function processCampaignBatch(
  campaignId: string,
  batchSize: number = DEFAULT_BATCH_SIZE
): Promise<BatchResult> {
  const supabase = await createAdminClient();

  // 1. Lấy thông tin campaign
  const { data: campaign, error: campaignError } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (campaignError || !campaign) {
    throw new Error(`Không tìm thấy campaign: ${campaignId}`);
  }

  if (!campaign.html_content) {
    throw new Error(`Campaign ${campaignId} chưa có nội dung email (html_content)`);
  }

  // 2. Lấy batch email_sends tiếp theo
  const { data: pendingSends, error: sendsError } = await supabase
    .from("email_sends")
    .select("id, subscriber_id, email")
    .eq("campaign_id", campaignId)
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (sendsError) {
    throw new Error(`Lỗi lấy email_sends: ${sendsError.message}`);
  }

  if (!pendingSends || pendingSends.length === 0) {
    // Đếm remaining
    const { count } = await supabase
      .from("email_sends")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("status", "queued");

    return { sent: 0, failed: 0, remaining: count || 0, completed: (count || 0) === 0, errors: [] };
  }

  // 3. Lấy thông tin subscribers cho batch này
  const subscriberIds = pendingSends.map((s) => s.subscriber_id);
  const { data: subscribers } = await supabase
    .from("subscribers")
    .select("id, email, full_name")
    .in("id", subscriberIds);

  const subscriberMap = new Map<string, { id: string; email: string; full_name: string | null }>();
  (subscribers || []).forEach((sub) => {
    subscriberMap.set(sub.id, sub);
  });

  // 4. Gửi từng email
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const send of pendingSends) {
    // Đánh dấu đang gửi
    await supabase
      .from("email_sends")
      .update({ status: "sending" })
      .eq("id", send.id);

    const subscriber = subscriberMap.get(send.subscriber_id);

    if (!subscriber) {
      // Subscriber không tồn tại / đã bị xoá
      await supabase
        .from("email_sends")
        .update({
          status: "failed",
          error_message: "Subscriber không tồn tại",
        })
        .eq("id", send.id);
      failed++;
      errors.push(`${send.email}: Subscriber không tồn tại`);
      continue;
    }

    try {
      // Render template với biến subscriber
      const variables = getDefaultVariables(subscriber, campaignId, send.id);
      const renderedHtml = prepareEmailHtml(
        campaign.html_content,
        variables,
        send.id
      );

      // Render subject (có thể chứa biến {{name}})
      const renderedSubject = campaign.subject
        .replace(/\{\{\s*name\s*\}\}/g, variables.name)
        .replace(/\{\{\s*first_name\s*\}\}/g, variables.first_name);

      // Gửi email qua SES
      const result: SendResult = await sendEmail(
        send.email,
        renderedSubject,
        renderedHtml,
        undefined,
        campaign.reply_to || undefined
      );

      if (result.success) {
        await supabase
          .from("email_sends")
          .update({
            status: "sent",
            ses_message_id: result.messageId || null,
            sent_at: new Date().toISOString(),
          })
          .eq("id", send.id);
        sent++;
      } else {
        await supabase
          .from("email_sends")
          .update({
            status: "failed",
            error_message: result.error || "Lỗi không xác định từ SES",
          })
          .eq("id", send.id);
        failed++;
        errors.push(`${send.email}: ${result.error || "SES error"}`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Lỗi không xác định";
      await supabase
        .from("email_sends")
        .update({
          status: "failed",
          error_message: message,
        })
        .eq("id", send.id);
      failed++;
      errors.push(`${send.email}: ${message}`);
    }

    // Delay giữa mỗi email
    await sleep(SEND_DELAY_MS);
  }

  // 5. Cập nhật sent_count trên campaign
  if (sent > 0) {
    // Dùng raw query hoặc increment
    const { data: updatedCampaign } = await supabase
      .from("email_campaigns")
      .select("sent_count")
      .eq("id", campaignId)
      .single();

    if (updatedCampaign) {
      await supabase
        .from("email_campaigns")
        .update({
          sent_count: (updatedCampaign.sent_count || 0) + sent,
        })
        .eq("id", campaignId);
    }
  }

  // Cập nhật status campaign nếu không còn email queued
  const { count: remainingCount } = await supabase
    .from("email_sends")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "queued");

  const remaining = remainingCount || 0;

  if (remaining === 0) {
    await supabase
      .from("email_campaigns")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", campaignId);
  } else {
    // Đánh dấu đang gửi nếu chưa
    await supabase
      .from("email_campaigns")
      .update({ status: "sending" })
      .eq("id", campaignId)
      .neq("status", "sending");
  }

  console.log(
    `[Queue] Campaign ${campaignId}: sent=${sent}, failed=${failed}, remaining=${remaining}`
  );

  return { sent, failed, remaining, completed: remaining === 0, errors };
}

// ─── Send Single Email ───────────────────────────────────────

/**
 * Gửi 1 email nhanh (broadcast) — không cần campaign
 * Dùng cho quick send, test, hoặc transactional email
 *
 * @param to - Email người nhận
 * @param subject - Tiêu đề
 * @param html - Nội dung HTML
 * @param campaignId - ID campaign (tuỳ chọn, để tracking)
 */
export async function sendSingleEmail(
  to: string,
  subject: string,
  html: string,
  campaignId?: string
): Promise<SendResult> {
  const supabase = await createAdminClient();

  // Tạo email_send record nếu có campaignId
  let sendId: string | null = null;

  if (campaignId) {
    // Tìm subscriber
    const { data: subscriber } = await supabase
      .from("subscribers")
      .select("id, email, full_name")
      .eq("email", to)
      .single();

    if (subscriber) {
      const { data: send } = await supabase
        .from("email_sends")
        .insert({
          campaign_id: campaignId,
          subscriber_id: subscriber.id,
          email: to,
          status: "sending",
        })
        .select("id")
        .single();

      sendId = send?.id || null;
    }
  }

  // Gửi email
  const result = await sendEmail(to, subject, html);

  // Cập nhật status nếu có send record
  if (sendId) {
    await supabase
      .from("email_sends")
      .update({
        status: result.success ? "sent" : "failed",
        ses_message_id: result.messageId || null,
        sent_at: result.success ? new Date().toISOString() : null,
        error_message: result.error || null,
      })
      .eq("id", sendId);
  }

  return result;
}

// ─── Helpers ─────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
