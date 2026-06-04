/**
 * Email Client — AWS SES SDK v2 (@aws-sdk/client-sesv2)
 *
 * Đã chuyển lại từ Resend → AWS SES SDK v2 sau khi DKIM được fix.
 *
 * Giữ nguyên toàn bộ interface public:
 *   - sendEmail
 *   - sendEmailWithParams
 *   - sendBulkEmails
 *   - sendTemplatedEmail
 *   - getSESClient
 *
 * Env vars:
 *   - AWS_SES_ACCESS_KEY
 *   - AWS_SES_SECRET_KEY
 *   - AWS_SES_REGION       (default: us-east-1)
 *   - EMAIL_FROM           (default: support@ledangkhuong.net — verified SES sender)
 *   - EMAIL_FROM_NAME      (default: Lê Đăng Khương Academy)
 */

import {
  SESv2Client,
  SendEmailCommand,
} from "@aws-sdk/client-sesv2";
import type {
  SendEmailParams,
  BulkEmailEntry,
  SendResult,
  BulkSendResult,
} from "./types";

// Re-export types for external consumers
export type { SendEmailParams, BulkEmailEntry, SendResult, BulkSendResult };

// ─── SESv2 Client Singleton ──────────────────────────────────

let sesClient: SESv2Client | null = null;

function buildSESClient(): SESv2Client {
  const accessKeyId = process.env.AWS_SES_ACCESS_KEY;
  const secretAccessKey = process.env.AWS_SES_SECRET_KEY;
  const region = process.env.AWS_SES_REGION || "us-east-1";

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing AWS_SES_ACCESS_KEY or AWS_SES_SECRET_KEY in env."
    );
  }

  return new SESv2Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/** Public: trả về instance SESv2Client (singleton). */
export function getSESClient(): unknown {
  if (!sesClient) {
    sesClient = buildSESClient();
  }
  return sesClient;
}

/** Internal typed accessor */
function getClient(): SESv2Client {
  return getSESClient() as SESv2Client;
}

// ─── Sender Address ──────────────────────────────────────────

function getFromAddress(): string {
  const email = process.env.EMAIL_FROM || "support@ledangkhuong.net";
  const name = process.env.EMAIL_FROM_NAME || "Lê Đăng Khương Academy";
  return `${name} <${email}>`;
}

function buildFromAddress(fromName?: string, fromEmail?: string): string {
  const email = fromEmail || process.env.EMAIL_FROM || "support@ledangkhuong.net";
  const name =
    fromName || process.env.EMAIL_FROM_NAME || "Lê Đăng Khương Academy";
  return `${name} <${email}>`;
}

// ─── Send Single Email ───────────────────────────────────────

/**
 * Gửi 1 email qua AWS SES v2 (raw HTML).
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string,
  textBody?: string,
  replyTo?: string
): Promise<SendResult> {
  try {
    const client = getClient();

    const command = new SendEmailCommand({
      FromEmailAddress: getFromAddress(),
      Destination: {
        ToAddresses: [to],
      },
      ReplyToAddresses: replyTo ? [replyTo] : undefined,
      Content: {
        Simple: {
          Subject: {
            Data: subject,
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: htmlBody,
              Charset: "UTF-8",
            },
            ...(textBody
              ? {
                  Text: {
                    Data: textBody,
                    Charset: "UTF-8",
                  },
                }
              : {}),
          },
        },
      },
    });

    const response = await client.send(command);

    return {
      success: true,
      messageId: response.MessageId,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Lỗi không xác định khi gửi email";
    console.error(`[SESv2] Gửi email thất bại đến ${to}:`, message);
    return {
      success: false,
      error: message,
    };
  }
}

// ─── Send with Full Params ───────────────────────────────────

/**
 * Gửi email với đầy đủ tham số (dùng cho automation, campaigns).
 * Hỗ trợ thêm: headers, tags, fromName/fromEmail override.
 */
export async function sendEmailWithParams(
  params: SendEmailParams
): Promise<SendResult> {
  try {
    const client = getClient();

    const fromAddress = buildFromAddress(params.fromName, params.fromEmail);

    // Convert tag map → SES MessageTags
    const messageTags = params.tags
      ? Object.entries(params.tags).map(([Name, Value]) => ({ Name, Value }))
      : undefined;

    // Convert headers map → SES Headers
    const headers = params.headers
      ? Object.entries(params.headers).map(([Name, Value]) => ({ Name, Value }))
      : undefined;

    const command = new SendEmailCommand({
      FromEmailAddress: fromAddress,
      Destination: {
        ToAddresses: [params.to],
      },
      ReplyToAddresses: params.replyTo ? [params.replyTo] : undefined,
      EmailTags: messageTags,
      Content: {
        Simple: {
          Subject: {
            Data: params.subject,
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: params.html,
              Charset: "UTF-8",
            },
            ...(params.text
              ? {
                  Text: {
                    Data: params.text,
                    Charset: "UTF-8",
                  },
                }
              : {}),
          },
          Headers: headers,
        },
      },
    });

    const response = await client.send(command);

    return {
      success: true,
      messageId: response.MessageId,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi gửi email";
    console.error(
      `[SESv2] sendEmailWithParams thất bại đến ${params.to}:`,
      message
    );
    return {
      success: false,
      error: message,
    };
  }
}

// ─── Send Bulk Emails ────────────────────────────────────────

/**
 * Gửi email hàng loạt — mỗi email có nội dung riêng.
 * Gửi tuần tự với delay giữa các lần gửi để tránh throttle.
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
 * Gửi email bằng SES template (đã tạo sẵn trong SES bằng CreateEmailTemplate).
 * Dùng SendEmailCommand với Content.Template { TemplateName, TemplateData }.
 */
export async function sendTemplatedEmail(
  to: string,
  templateName: string,
  templateData: Record<string, string>
): Promise<SendResult> {
  try {
    const client = getClient();

    const command = new SendEmailCommand({
      FromEmailAddress: getFromAddress(),
      Destination: {
        ToAddresses: [to],
      },
      Content: {
        Template: {
          TemplateName: templateName,
          TemplateData: JSON.stringify(templateData),
        },
      },
    });

    const response = await client.send(command);

    return {
      success: true,
      messageId: response.MessageId,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Lỗi gửi templated email";
    console.error(
      `[SESv2] sendTemplatedEmail thất bại đến ${to} (template=${templateName}):`,
      message
    );
    return {
      success: false,
      error: message,
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
