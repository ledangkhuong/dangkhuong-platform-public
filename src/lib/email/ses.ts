/**
 * Email Client — Resend (thay thế tạm AWS SES khi DKIM bị revoked)
 *
 * Giữ nguyên toàn bộ interface: sendEmail, sendEmailWithParams, sendBulkEmails
 * Khi fix xong DKIM trên AWS → chuyển lại SES bằng cách restore file này.
 *
 * Backup SES gốc: ses.ts.bak
 */

import { Resend } from "resend";
import type {
  SendEmailParams,
  BulkEmailEntry,
  SendResult,
  BulkSendResult,
} from "./types";

// ─── Resend Client Singleton ────────────────────────────────

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("Missing RESEND_API_KEY in env.");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

// ─── Sender Address ──────────────────────────────────────────

function getFromAddress(): string {
  const email = process.env.EMAIL_FROM || "support@dangkhuong.com";
  const name = process.env.EMAIL_FROM_NAME || "Lê Đăng Khương Academy";
  return `${name} <${email}>`;
}

// ─── Send Single Email ───────────────────────────────────────

/**
 * Gửi 1 email qua Resend
 * @returns Message ID nếu thành công
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string,
  textBody?: string,
  replyTo?: string
): Promise<SendResult> {
  try {
    const client = getResendClient();

    const { data, error } = await client.emails.send({
      from: getFromAddress(),
      to: [to],
      subject,
      html: htmlBody,
      text: textBody || undefined,
      reply_to: replyTo || undefined,
    });

    if (error) {
      console.error(`[Resend] Gửi email thất bại đến ${to}:`, error.message);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định khi gửi email";
    console.error(`[Resend] Gửi email thất bại đến ${to}:`, message);
    return {
      success: false,
      error: message,
    };
  }
}

// ─── Send with Full Params ───────────────────────────────────

/**
 * Gửi email với đầy đủ tham số (dùng cho automation, campaigns)
 */
export async function sendEmailWithParams(
  params: SendEmailParams
): Promise<SendResult> {
  try {
    const client = getResendClient();

    const fromEmail = params.fromEmail || process.env.EMAIL_FROM || "support@dangkhuong.com";
    const fromName = params.fromName || process.env.EMAIL_FROM_NAME || "Lê Đăng Khương Academy";
    const fromAddress = `${fromName} <${fromEmail}>`;

    const { data, error } = await client.emails.send({
      from: fromAddress,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text || undefined,
      reply_to: params.replyTo || undefined,
      headers: params.headers || undefined,
      tags: params.tags
        ? Object.entries(params.tags).map(([name, value]) => ({ name, value }))
        : undefined,
    });

    if (error) {
      console.error(`[Resend] sendEmailWithParams thất bại đến ${params.to}:`, error.message);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi gửi email";
    console.error(`[Resend] sendEmailWithParams thất bại đến ${params.to}:`, message);
    return { success: false, error: message };
  }
}

// ─── Send Bulk Emails ────────────────────────────────────────

/**
 * Gửi email hàng loạt — mỗi email có nội dung riêng
 * Gửi tuần tự với delay
 */
export async function sendBulkEmails(
  emails: BulkEmailEntry[],
  delayMs: number = 100
): Promise<BulkSendResult> {
  const results: BulkSendResult["results"] = [];
  let sent = 0;
  let failed = 0;

  for (const email of emails) {
    const result = await sendEmail(
      email.to,
      email.subject,
      email.html,
      email.text
    );

    results.push({
      to: email.to,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    });

    if (result.success) {
      sent++;
    } else {
      failed++;
    }

    if (delayMs > 0) {
      await sleep(delayMs);
    }
  }

  return { total: emails.length, sent, failed, results };
}

// ─── Send Templated Email ────────────────────────────────────

/**
 * Gửi email với template (fallback: dùng sendEmail thường)
 * Resend không có SES-style templates — gửi HTML trực tiếp
 */
export async function sendTemplatedEmail(
  to: string,
  templateName: string,
  templateData: Record<string, string>
): Promise<SendResult> {
  // Resend doesn't support SES-style templates
  // Log warning and return error
  console.warn(`[Resend] sendTemplatedEmail not supported — template: ${templateName}`);
  return {
    success: false,
    error: "Templated email not supported with Resend. Use sendEmail with HTML instead.",
  };
}

// ─── Legacy exports for compatibility ───────────────────────

/** No-op: Resend doesn't need a client object */
export function getSESClient(): unknown {
  return getResendClient();
}

// ─── Helpers ─────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
