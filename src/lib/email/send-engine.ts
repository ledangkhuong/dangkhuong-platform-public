/**
 * Email Send Engine
 * Core functions for sending individual and campaign emails via AWS SES.
 * Handles variable replacement, open/click tracking injection,
 * and List-Unsubscribe headers.
 */

import { SendEmailCommand } from "@aws-sdk/client-sesv2";
import { getSESClient } from "./ses";
import type {
  SendEmailParams,
  EmailCampaign,
  EmailSend,
  Subscriber,
} from "./types";

// ─── HTML Escaping ─────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─── Constants ──────────────────────────────────────────────

const DEFAULT_FROM_EMAIL = process.env.EMAIL_FROM || "support@ledangkhuong.net";
const DEFAULT_FROM_NAME = process.env.EMAIL_FROM_NAME || "Lê Đăng Khương Academy";
const COMPANY_NAME = process.env.EMAIL_FROM_NAME || "Lê Đăng Khương Academy";

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL || "https://dangkhuong.com"
  );
}

// ─── Send Single Email ──────────────────────────────────────

/**
 * Send a single email via SES.
 * @returns Object with messageId on success; throws on failure.
 */
export async function sendSingleEmail(
  params: SendEmailParams
): Promise<{ messageId: string; success: true }> {
  const client = getSESClient();

  const fromEmail = params.fromEmail || process.env.EMAIL_FROM || DEFAULT_FROM_EMAIL;
  const fromName = params.fromName || process.env.EMAIL_FROM_NAME || DEFAULT_FROM_NAME;
  const fromAddress = `${fromName} <${fromEmail}>`;

  // Build SES message tags from params.tags
  const messageTags = params.tags
    ? Object.entries(params.tags).map(([Name, Value]) => ({ Name, Value }))
    : undefined;

  // Build extra headers list
  const headers = params.headers
    ? Object.entries(params.headers).map(([Name, Value]) => ({ Name, Value }))
    : undefined;

  const command = new SendEmailCommand({
    FromEmailAddress: fromAddress,
    Destination: {
      ToAddresses: [params.to],
    },
    ReplyToAddresses: params.replyTo ? [params.replyTo] : undefined,
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
    EmailTags: messageTags,
  });

  const response = await client.send(command);

  if (!response.MessageId) {
    throw new Error("SES did not return a MessageId");
  }

  return {
    messageId: response.MessageId,
    success: true,
  };
}

// ─── Variable Replacement ───────────────────────────────────

/**
 * Build a variables map for a subscriber, then replace all
 * {{variable}} placeholders in the given text.
 */
function replaceVariables(
  text: string,
  subscriber: Subscriber,
  sendId: string
): string {
  const appUrl = getAppUrl();

  const unsubscribeUrl = `${appUrl}/email/unsubscribe?sid=${sendId}&email=${encodeURIComponent(subscriber.email)}`;

  const fullName = subscriber.full_name || "bạn";
  const firstName = fullName !== "bạn" ? fullName.split(" ")[0] : "bạn";

  const vars: Record<string, string> = {
    name: fullName,
    full_name: fullName,
    email: subscriber.email,
    first_name: firstName,
    unsubscribe_url: unsubscribeUrl,
    company_name: COMPANY_NAME,
    current_year: String(new Date().getFullYear()),
    subscriber_id: subscriber.id,
  };

  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    // Escape HTML for all values except URLs to prevent injection
    const safeValue =
      key.toLowerCase().includes("url") ||
      key.toLowerCase().includes("link") ||
      value.startsWith("http")
        ? value
        : escapeHtml(value);

    // Replace both {{key}} patterns (case-insensitive)
    result = result.replace(
      new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi"),
      safeValue
    );
  }

  return result;
}

// ─── Tracking Injection ─────────────────────────────────────

/**
 * Add a 1x1 tracking pixel before the closing </body> tag.
 */
function injectTrackingPixel(html: string, sendId: string): string {
  const appUrl = getAppUrl();
  const pixel = `<img src="${appUrl}/api/email/track/open?sid=${sendId}" width="1" height="1" style="display:none" alt="" />`;

  // Insert before </body> if present, otherwise append
  if (html.includes("</body>")) {
    return html.replace("</body>", `${pixel}</body>`);
  }
  return html + pixel;
}

/**
 * Rewrite all href="..." links in the HTML to go through the click tracker.
 * Skips mailto: links and the unsubscribe URL (already tracked by its own route).
 */
function rewriteLinksForTracking(html: string, sendId: string): string {
  const appUrl = getAppUrl();
  const unsubscribePrefix = `${appUrl}/email/unsubscribe`;

  return html.replace(
    /href="(https?:\/\/[^"]+)"/gi,
    (_match: string, url: string) => {
      // Don't double-wrap the unsubscribe link or tracking endpoints
      if (
        url.startsWith(unsubscribePrefix) ||
        url.includes("/api/email/track/")
      ) {
        return `href="${url}"`;
      }

      const trackedUrl = `${appUrl}/api/email/track/click?sid=${sendId}&url=${encodeURIComponent(url)}`;
      return `href="${trackedUrl}"`;
    }
  );
}

// ─── Send Campaign Email ────────────────────────────────────

/**
 * Render and send a single campaign email to one subscriber.
 * Performs variable replacement, injects tracking pixel,
 * rewrites links for click tracking, and adds List-Unsubscribe header.
 *
 * @returns The SES messageId for the sent email.
 */
export async function sendCampaignEmail(
  send: EmailSend,
  campaign: EmailCampaign,
  subscriber: Subscriber
): Promise<string> {
  const appUrl = getAppUrl();

  // 1. Replace template variables in subject and HTML
  let html = replaceVariables(campaign.html_content, subscriber, send.id);
  const subject = replaceVariables(campaign.subject, subscriber, send.id);

  // 2. Replace variables in text content if available
  const textContent = campaign.text_content
    ? replaceVariables(campaign.text_content, subscriber, send.id)
    : undefined;

  // 3. Inject open tracking pixel
  html = injectTrackingPixel(html, send.id);

  // 4. Rewrite links for click tracking
  html = rewriteLinksForTracking(html, send.id);

  // 5. Build unsubscribe URL for headers
  const unsubscribeUrl = `${appUrl}/email/unsubscribe?sid=${send.id}&email=${encodeURIComponent(subscriber.email)}`;

  // 6. Send via SES with List-Unsubscribe header
  const result = await sendSingleEmail({
    to: subscriber.email,
    subject,
    html,
    text: textContent,
    fromName: campaign.from_name || DEFAULT_FROM_NAME,
    fromEmail: campaign.from_email || DEFAULT_FROM_EMAIL,
    replyTo: campaign.reply_to || undefined,
    tags: {
      campaign_id: campaign.id,
      send_id: send.id,
    },
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  return result.messageId;
}
