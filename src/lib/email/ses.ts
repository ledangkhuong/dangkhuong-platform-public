/**
 * AWS SES Email Client
 * Singleton SESv2 client và các hàm gửi email qua Amazon SES
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

// ─── SES Client Singleton ────────────────────────────────────

let sesClient: SESv2Client | null = null;

/** Lấy SES client singleton — khởi tạo 1 lần duy nhất */
export function getSESClient(): SESv2Client {
  if (!sesClient) {
    const region = process.env.AWS_SES_REGION;
    const accessKeyId = process.env.AWS_SES_ACCESS_KEY;
    const secretAccessKey = process.env.AWS_SES_SECRET_KEY;

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "Missing AWS SES credentials. Cần có AWS_SES_REGION, AWS_SES_ACCESS_KEY, AWS_SES_SECRET_KEY trong env."
      );
    }

    sesClient = new SESv2Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return sesClient;
}

// ─── Sender Address ──────────────────────────────────────────

/** Lấy địa chỉ From đầy đủ: "Tên <email>" */
function getFromAddress(): string {
  const email = process.env.EMAIL_FROM || "support@ledangkhuong.net";
  const name = process.env.EMAIL_FROM_NAME || "Lê Đăng Khương Academy";
  return `${name} <${email}>`;
}

// ─── Send Single Email ───────────────────────────────────────

/**
 * Gửi 1 email qua SES
 * @returns SES Message ID nếu thành công
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string,
  textBody?: string,
  replyTo?: string
): Promise<SendResult> {
  try {
    const client = getSESClient();
    const toAddresses = [to];

    const command = new SendEmailCommand({
      FromEmailAddress: getFromAddress(),
      Destination: {
        ToAddresses: toAddresses,
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
      error instanceof Error ? error.message : "Lỗi không xác định khi gửi email";
    console.error(`[SES] Gửi email thất bại đến ${to}:`, message);
    return {
      success: false,
      error: message,
    };
  }
}

// ─── Send with Full Params ───────────────────────────────────

/**
 * Gửi email với đầy đủ tham số (dùng cho các trường hợp nâng cao)
 * Hỗ trợ custom from name/email và SES tags
 */
export async function sendEmailWithParams(
  params: SendEmailParams
): Promise<SendResult> {
  try {
    const client = getSESClient();

    const fromEmail = params.fromEmail || process.env.EMAIL_FROM || "support@ledangkhuong.net";
    const fromName = params.fromName || process.env.EMAIL_FROM_NAME || "Lê Đăng Khương Academy";
    const fromAddress = `${fromName} <${fromEmail}>`;

    const command = new SendEmailCommand({
      FromEmailAddress: fromAddress,
      Destination: {
        ToAddresses: [params.to],
      },
      ReplyToAddresses: params.replyTo ? [params.replyTo] : undefined,
      Content: {
        Simple: {
          Subject: { Data: params.subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: params.html, Charset: "UTF-8" },
            ...(params.text ? { Text: { Data: params.text, Charset: "UTF-8" } } : {}),
          },
          Headers: params.headers
            ? Object.entries(params.headers).map(([Name, Value]) => ({ Name, Value }))
            : undefined,
        },
      },
      EmailTags: params.tags
        ? Object.entries(params.tags).map(([Name, Value]) => ({ Name, Value }))
        : undefined,
    });

    const response = await client.send(command);

    return { success: true, messageId: response.MessageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi gửi email";
    console.error(`[SES] sendEmailWithParams thất bại đến ${params.to}:`, message);
    return { success: false, error: message };
  }
}

// ─── Send Bulk Emails ────────────────────────────────────────

/**
 * Gửi email hàng loạt — mỗi email có nội dung riêng
 * Gửi tuần tự với delay để tránh vượt rate limit SES (14 emails/giây)
 *
 * @param emails - Mảng email cần gửi
 * @param delayMs - Delay giữa mỗi email (mặc định 100ms ~ 10 emails/giây, an toàn cho rate limit 14/s)
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

    // Delay giữa mỗi email để tránh vượt SES rate limit
    if (delayMs > 0) {
      await sleep(delayMs);
    }
  }

  return {
    total: emails.length,
    sent,
    failed,
    results,
  };
}

// ─── Send Templated Email (SES Template) ─────────────────────

/**
 * Gửi email sử dụng SES Template đã tạo sẵn trên AWS
 * Lưu ý: Cần tạo template trên SES console/API trước khi dùng
 *
 * @param to - Email người nhận
 * @param templateName - Tên template trên SES
 * @param templateData - Dữ liệu thay thế vào template
 */
export async function sendTemplatedEmail(
  to: string,
  templateName: string,
  templateData: Record<string, string>
): Promise<SendResult> {
  try {
    const client = getSESClient();

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
      error instanceof Error ? error.message : "Lỗi gửi templated email";
    console.error(`[SES] Gửi templated email thất bại đến ${to}:`, message);
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
