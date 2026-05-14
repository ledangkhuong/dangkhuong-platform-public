/**
 * Template Renderer
 * Render template email bằng cách thay thế biến {{variable}}
 * và thêm tracking pixel + click tracking
 */

import type { Subscriber, TemplateVariables } from "./types";

// ─── Constants ───────────────────────────────────────────────

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://dangkhuong-platform.vercel.app";
const COMPANY_NAME = process.env.EMAIL_FROM_NAME || "Lê Đăng Khương Academy";

// ─── Render Template ─────────────────────────────────────────

/**
 * Thay thế các biến {{variable}} trong HTML template
 *
 * @param html - Nội dung HTML chứa biến {{...}}
 * @param variables - Map biến → giá trị thay thế
 * @returns HTML đã render xong
 *
 * @example
 * renderTemplate("Xin chào {{name}}", { name: "Khương" })
 * // => "Xin chào Khương"
 */
export function renderTemplate(
  html: string,
  variables: Record<string, string>
): string {
  let rendered = html;

  for (const [key, value] of Object.entries(variables)) {
    // Thay thế cả {{key}} và {{ key }} (có khoảng trắng)
    const pattern = new RegExp(`\\{\\{\\s*${escapeRegExp(key)}\\s*\\}\\}`, "g");
    rendered = rendered.replace(pattern, value);
  }

  return rendered;
}

// ─── Default Variables ───────────────────────────────────────

/**
 * Tạo bộ biến mặc định cho mỗi subscriber
 * Bao gồm thông tin cá nhân + tracking URLs
 *
 * @param subscriber - Thông tin subscriber (id, email, full_name)
 * @param campaignId - ID campaign hiện tại
 * @param sendId - ID email_send (dùng cho tracking)
 */
export function getDefaultVariables(
  subscriber: Pick<Subscriber, "id" | "email" | "full_name">,
  campaignId: string,
  sendId: string
): TemplateVariables {
  const fullName = subscriber.full_name || "";
  // Tên tiếng Việt: phần cuối cùng thường là tên gọi
  const firstName = fullName.split(" ").pop() || fullName || "bạn";
  const encodedEmail = encodeURIComponent(subscriber.email);

  return {
    name: fullName || "bạn",
    full_name: fullName,
    email: subscriber.email,
    first_name: firstName,
    subscriber_id: subscriber.id,
    unsubscribe_url: `${APP_URL}/email/unsubscribe?sid=${sendId}&email=${encodedEmail}`,
    current_year: new Date().getFullYear().toString(),
    company_name: COMPANY_NAME,
  };
}

// ─── Tracking Pixel ──────────────────────────────────────────

/**
 * Thêm tracking pixel 1x1 vào cuối email HTML
 * Pixel này sẽ gọi API /api/email/track/open khi email được mở
 *
 * @param html - Nội dung HTML email
 * @param sendId - ID email_send để tracking
 */
export function wrapWithTrackingPixel(html: string, sendId: string): string {
  const pixelUrl = `${APP_URL}/api/email/track/open?sid=${sendId}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`;

  // Chèn pixel trước </body> nếu có, hoặc cuối nội dung
  if (html.includes("</body>")) {
    return html.replace("</body>", `${pixel}</body>`);
  }

  return html + pixel;
}

// ─── Click Tracking ──────────────────────────────────────────

/**
 * Rewrite tất cả link <a href="..."> để đi qua tracking redirect
 * Redirect URL: /api/email/track/click?sid={sendId}&url={encodedOriginalUrl}
 *
 * Bỏ qua các link đặc biệt:
 * - mailto: links
 * - Unsubscribe links (đã có tracking riêng)
 * - Anchor links (#)
 *
 * @param html - Nội dung HTML email
 * @param sendId - ID email_send để tracking
 */
export function rewriteLinksForTracking(html: string, sendId: string): string {
  // Regex match <a ... href="url" ...>
  const linkRegex = /<a\s([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi;

  return html.replace(linkRegex, (match, before, url, after) => {
    // Bỏ qua các link không cần track
    if (
      url.startsWith("mailto:") ||
      url.startsWith("#") ||
      url.includes("/email/unsubscribe") ||
      url.includes("/api/email/track/")
    ) {
      return match;
    }

    const trackingUrl = `${APP_URL}/api/email/track/click?sid=${sendId}&url=${encodeURIComponent(url)}`;
    return `<a ${before}href="${trackingUrl}"${after}>`;
  });
}

// ─── Full Pipeline ───────────────────────────────────────────

/**
 * Pipeline đầy đủ: render template → rewrite links → thêm tracking pixel
 * Dùng hàm này khi chuẩn bị email để gửi
 *
 * @param html - HTML template gốc (chứa biến {{...}})
 * @param variables - Biến thay thế
 * @param sendId - ID email_send cho tracking
 */
export function prepareEmailHtml(
  html: string,
  variables: Record<string, string>,
  sendId: string
): string {
  let result = renderTemplate(html, variables);
  result = rewriteLinksForTracking(result, sendId);
  result = wrapWithTrackingPixel(result, sendId);
  return result;
}

// ─── Helpers ─────────────────────────────────────────────────

/** Escape ký tự đặc biệt trong RegExp */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
