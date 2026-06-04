/**
 * Setup Email Automations — inserts 4 complete automation sequences
 * into the Supabase `email_automations` table via the Admin client.
 *
 * Automations:
 *   1. Welcome Sequence        (trigger: tag_added "new_user")
 *   2. Post-Purchase Sequence  (trigger: purchase)
 *   3. Re-engagement Sequence  (trigger: tag_added "inactive_30d")
 *   4. Event/Webinar Sequence  (trigger: tag_added "event_registered")
 *
 * Idempotent: skips any automation whose name already exists.
 *
 * Usage:
 *   node scripts/setup-email-automations.mjs
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ─── Load .env.local ────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Shared HTML helpers ────────────────────────────────────────

const BASE_URL = "https://dangkhuong.com";

/**
 * Wraps email body content in the dark-themed brand template.
 * Matches the style from src/lib/email/transactional.ts baseTemplate().
 */
function emailTemplate(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin:0; padding:0; background:#0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrap { max-width:560px; margin:0 auto; padding:32px 16px; }
    .card { background:#1a1a1a; border:1px solid #2a2a2a; border-radius:12px; padding:32px; }
    .logo { display:flex; align-items:center; gap:10px; margin-bottom:28px; }
    .logo-icon { width:36px; height:36px; border-radius:8px; background:linear-gradient(135deg,#D4A843,#B8922E); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:13px; }
    .logo-text { color:#fff; font-weight:700; font-size:16px; }
    h1 { color:#fff; font-size:22px; font-weight:700; margin:0 0 12px; line-height:1.3; }
    p { color:#9ca3af; font-size:14px; line-height:1.7; margin:0 0 16px; }
    .btn { display:inline-block; padding:12px 28px; background:#D4A843; color:#000; border-radius:8px; text-decoration:none; font-weight:600; font-size:14px; }
    .divider { height:1px; background:#2a2a2a; margin:24px 0; }
    .footer { color:#4b5563; font-size:12px; text-align:center; margin-top:24px; line-height:1.6; }
    .highlight { color:#D4A843; font-weight:600; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="logo">
      <div class="logo-icon">LDK</div>
      <div class="logo-text">Le Dang Khuong Academy</div>
    </div>
    <div class="card">
      ${bodyHtml}
    </div>
    <div class="footer">
      &copy; 2025 Le Dang Khuong Academy &middot; <a href="${BASE_URL}" style="color:#4b5563;">dangkhuong.com</a><br/>
      Ban nhan email nay vi da dang ky tai dangkhuong.com<br/>
      <a href="${BASE_URL}/unsubscribe?sid={{subscriber_id}}" style="color:#4b5563;">Huy dang ky</a>
    </div>
  </div>
</body>
</html>`;
}

// ─── Automation 1: Welcome Sequence ─────────────────────────────

const welcomeFlow = {
  nodes: [
    {
      id: "trigger_1",
      type: "trigger",
      position: { x: 0, y: 0 },
      data: {
        triggerType: "tag_added",
        config: { tag: "new_user" },
      },
    },
    // Email 1 — Chào mừng
    {
      id: "send_1",
      type: "sendEmail",
      position: { x: 0, y: 100 },
      data: {
        subject: "Chào mừng bạn đến với Lê Đăng Khương Academy! \u{1F680}",
        fromName: "Lê Đăng Khương",
        htmlContent: emailTemplate(`
      <h1>Chào mừng bạn, {{name}}! \u{1F680}</h1>
      <p>Tôi là <span class="highlight">Lê Đăng Khương</span> — và tôi rất vui khi bạn quyết định tham gia cùng cộng đồng hơn 600 học viên của chúng tôi.</p>
      <p>Đăng nhập vào <span class="highlight">dangkhuong.com</span> bằng email và mật khẩu bạn vừa đăng ký để bắt đầu hành trình:</p>
      <ul style="color:#9ca3af; font-size:14px; line-height:2; padding-left:20px; margin:0 0 20px;">
        <li>\u{1F4DA} Khám phá kho khóa học từ cơ bản đến nâng cao</li>
        <li>\u{1F4AC} Tham gia cộng đồng thảo luận, đặt câu hỏi</li>
        <li>\u{1F3C6} Tích điểm XP và leo bảng xếp hạng</li>
        <li>\u{1F4EC} Nhận newsletter và tip hàng tuần</li>
      </ul>
      <a href="${BASE_URL}/login" class="btn">Đăng nhập học ngay →</a>
      <div class="divider"></div>
      <p style="margin:0;">Nếu bạn có bất kỳ câu hỏi nào, chỉ cần reply email này — tôi đọc tất cả.</p>
      <p style="margin:8px 0 0; color:#6b7280; font-size:13px;">— Lê Đăng Khương</p>
    `),
      },
    },
    // Wait 1 day
    {
      id: "wait_1",
      type: "wait",
      position: { x: 0, y: 200 },
      data: { days: 1, hours: 0, minutes: 0 },
    },
    // Email 2 — Câu chuyện cá nhân
    {
      id: "send_2",
      type: "sendEmail",
      position: { x: 0, y: 300 },
      data: {
        subject: "Câu chuyện của tôi — và tại sao tôi xây hệ thống này",
        fromName: "Lê Đăng Khương",
        htmlContent: emailTemplate(`
      <h1>Câu chuyện của tôi \u{1F4D6}</h1>
      <p>Xin chào {{name}},</p>
      <p>Tôi bắt đầu từ con số 0 — một người làm marketing cá nhân với vài chục khách hàng, chạy đủ thứ công cụ rời rạc và cảm thấy kiệt sức mỗi ngày.</p>
      <p>Rồi tôi nhận ra: <span class="highlight">vấn đề không phải thiếu kiến thức, mà là thiếu hệ thống</span>.</p>
      <p>Đó là lý do tôi xây dựng Lê Đăng Khương Academy — một hệ thống All-In-One bằng AI Agent, nơi mọi thứ từ khóa học, cộng đồng, CRM, email marketing đến thanh toán đều nằm trong một nền tảng duy nhất.</p>
      <p>Tầm nhìn của tôi rất đơn giản: <span class="highlight">giúp bạn xây dựng thu nhập bền vững bằng kiến thức và hệ thống</span>, không phải bằng may mắn hay chiêu trò.</p>
      <p>Tôi chia sẻ chi tiết hơn ở trang giới thiệu — mời bạn đọc thêm:</p>
      <a href="${BASE_URL}/about" class="btn">Xem thêm về tôi →</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">— Lê Đăng Khương</p>
    `),
      },
    },
    // Wait 2 days
    {
      id: "wait_2",
      type: "wait",
      position: { x: 0, y: 400 },
      data: { days: 2, hours: 0, minutes: 0 },
    },
    // Email 3 — Bài học đầu tiên
    {
      id: "send_3",
      type: "sendEmail",
      position: { x: 0, y: 500 },
      data: {
        subject: "\u{1F381} Tặng bạn bài học đầu tiên — bắt đầu từ đây",
        fromName: "Lê Đăng Khương",
        htmlContent: emailTemplate(`
      <h1>\u{1F381} Bắt đầu từ đây, {{name}}!</h1>
      <p>Nhiều học viên hỏi tôi: <em>"Anh ơi, nên học gì trước?"</em></p>
      <p>Câu trả lời của tôi luôn là: <span class="highlight">hãy bắt đầu với nền tảng</span>. Hiểu đúng mindset và quy trình trước, rồi kỹ thuật sẽ đến sau.</p>
      <p>Tôi đã chuẩn bị sẵn một bài học miễn phí — đây là bài mà hầu hết học viên thành công đều bắt đầu. Nội dung ngắn gọn, dễ hiểu, và bạn có thể áp dụng ngay trong ngày.</p>
      <div style="background:#222;border:1px solid rgba(212,168,67,0.2);border-radius:8px;padding:16px;margin:20px 0;">
        <div style="color:#D4A843;font-size:13px;margin-bottom:6px;">\u{1F4A1} Tại sao nên học bài này trước?</div>
        <div style="color:#9ca3af;font-size:14px;line-height:1.6;">Vì nó giúp bạn xây dựng tư duy đúng — từ đó mọi bài học sau sẽ dễ tiếp thu và áp dụng hơn gấp nhiều lần.</div>
      </div>
      <a href="${BASE_URL}/courses" class="btn">Vào học ngay →</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">— Lê Đăng Khương</p>
    `),
      },
    },
    // Wait 2 days
    {
      id: "wait_3",
      type: "wait",
      position: { x: 0, y: 600 },
      data: { days: 2, hours: 0, minutes: 0 },
    },
    // Email 4 — Testimonial / Social proof
    {
      id: "send_4",
      type: "sendEmail",
      position: { x: 0, y: 700 },
      data: {
        subject: "Học viên Nguyễn Thị Thủy đã đạt 30 triệu — bạn thì sao?",
        fromName: "Lê Đăng Khương",
        htmlContent: emailTemplate(`
      <h1>Câu chuyện thành công \u{1F4AA}</h1>
      <p>Xin chào {{name}},</p>
      <p>Tôi muốn chia sẻ với bạn câu chuyện của <span class="highlight">chị Nguyễn Thị Thủy</span> — một học viên bắt đầu từ con số 0 và đạt thu nhập <span class="highlight">30 triệu/tháng</span> chỉ sau 4 tháng áp dụng hệ thống.</p>
      <div style="background:#222;border:1px solid #333;border-radius:8px;padding:20px;margin:20px 0;">
        <div style="color:#D4A843;font-size:24px;margin-bottom:8px;">“</div>
        <div style="color:#fff;font-size:14px;line-height:1.7;font-style:italic;">Ban đầu em cũng nghi ngờ lắm. Nhưng khi làm theo hệ thống anh Khương hướng dẫn, từ xây dựng nội dung → thu hút khách → chốt đơn — mọi thứ trở nên rõ ràng. Tháng thứ 4 em đã đạt 30 triệu.</div>
        <div style="color:#9ca3af;font-size:13px;margin-top:12px;">— Nguyễn Thị Thủy, học viên khóa Web All-In-One</div>
      </div>
      <p>Và chị Thủy không phải trường hợp duy nhất. Trong cộng đồng, rất nhiều học viên đang chia sẻ kết quả mỗi ngày.</p>
      <p>Bạn có muốn xem thêm? Vào cộng đồng để đọc những câu chuyện thực tế:</p>
      <a href="${BASE_URL}/community" class="btn">Xem câu chuyện thành công →</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">— Lê Đăng Khương</p>
    `),
      },
    },
    // Wait 2 days
    {
      id: "wait_4",
      type: "wait",
      position: { x: 0, y: 800 },
      data: { days: 2, hours: 0, minutes: 0 },
    },
    // Email 5 — Zoom invitation
    {
      id: "send_5",
      type: "sendEmail",
      position: { x: 0, y: 900 },
      data: {
        subject: "☕ Mời sinh tố 100K — vào Zoom cùng tôi thứ 6 này",
        fromName: "Lê Đăng Khương",
        htmlContent: emailTemplate(`
      <h1>☕ Mời bạn vào Zoom cùng tôi!</h1>
      <p>Xin chào {{name}},</p>
      <p>Mỗi tuần, tôi tổ chức một buổi <span class="highlight">Zoom live</span> — nơi tôi chia sẻ kinh nghiệm thực tế, trả lời câu hỏi trực tiếp, và hướng dẫn cụ thể cách áp dụng hệ thống.</p>
      <div style="background:#222;border:1px solid rgba(212,168,67,0.2);border-radius:8px;padding:20px;margin:20px 0;">
        <div style="color:#fff;font-weight:600;font-size:16px;margin-bottom:12px;">Bạn sẽ nhận được gì?</div>
        <ul style="color:#9ca3af;font-size:14px;line-height:2;padding-left:20px;margin:0;">
          <li>\u{1F3AF} Chiến lược kinh doanh online thực chiến</li>
          <li>\u{1F4AC} Hỏi đáp trực tiếp 1-1 với tôi</li>
          <li>\u{1F91D} Kết nối với học viên khác trong cộng đồng</li>
          <li>\u{1F381} Tài liệu và template độc quyền</li>
        </ul>
      </div>
      <p>Chi phí chỉ <span class="highlight">100.000đ</span> — bằng một ly sinh tố. Nhưng giá trị bạn nhận được có thể thay đổi cả hướng đi kinh doanh.</p>
      <p style="color:#ef4444;font-weight:600;">Số lượng giới hạn — đăng ký sớm để giữ chỗ!</p>
      <a href="${BASE_URL}/weballinone" class="btn">Đăng ký Zoom 100K →</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">— Lê Đăng Khương</p>
    `),
      },
    },
    // End
    {
      id: "end_1",
      type: "end",
      position: { x: 0, y: 1000 },
      data: {},
    },
  ],
  edges: [
    { id: "e1", source: "trigger_1", target: "send_1" },
    { id: "e2", source: "send_1", target: "wait_1" },
    { id: "e3", source: "wait_1", target: "send_2" },
    { id: "e4", source: "send_2", target: "wait_2" },
    { id: "e5", source: "wait_2", target: "send_3" },
    { id: "e6", source: "send_3", target: "wait_3" },
    { id: "e7", source: "wait_3", target: "send_4" },
    { id: "e8", source: "send_4", target: "wait_4" },
    { id: "e9", source: "wait_4", target: "send_5" },
    { id: "e10", source: "send_5", target: "end_1" },
  ],
};

// ─── Automation 2: Post-Purchase Sequence ───────────────────────

const postPurchaseFlow = {
  nodes: [
    {
      id: "trigger_1",
      type: "trigger",
      position: { x: 0, y: 0 },
      data: {
        triggerType: "purchase",
        config: {},
      },
    },
    // Email 1 — Cảm ơn + Hướng dẫn bắt đầu
    {
      id: "send_1",
      type: "sendEmail",
      position: { x: 0, y: 100 },
      data: {
        subject: "\u{1F389} Cảm ơn bạn! Đây là cách bắt đầu học",
        fromName: "Lê Đăng Khương",
        htmlContent: emailTemplate(`
      <h1>Cảm ơn bạn, {{name}}! \u{1F389}</h1>
      <p>Chúc mừng bạn đã đầu tư cho bản thân — đây là quyết định đúng đắn nhất bạn có thể làm.</p>
      <p>Quyền truy cập của bạn đã được kích hoạt. Bắt đầu ngay với <span class="highlight">3 bước đơn giản</span>:</p>
      <div style="background:#222;border:1px solid #333;border-radius:8px;padding:20px;margin:20px 0;">
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:16px;">
          <div style="background:#D4A843;color:#000;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">1</div>
          <div>
            <div style="color:#fff;font-weight:600;font-size:14px;">Đăng nhập tại dangkhuong.com</div>
            <div style="color:#9ca3af;font-size:13px;">Dùng email và mật khẩu bạn đã đăng ký</div>
          </div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:16px;">
          <div style="background:#D4A843;color:#000;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">2</div>
          <div>
            <div style="color:#fff;font-weight:600;font-size:14px;">Vào trang khóa học</div>
            <div style="color:#9ca3af;font-size:13px;">Tìm khóa học bạn vừa mua trong danh sách</div>
          </div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:12px;">
          <div style="background:#D4A843;color:#000;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">3</div>
          <div>
            <div style="color:#fff;font-weight:600;font-size:14px;">Bắt đầu bài 1</div>
            <div style="color:#9ca3af;font-size:13px;">Xem video, ghi chú, và làm bài tập</div>
          </div>
        </div>
      </div>
      <a href="${BASE_URL}/courses" class="btn">Vào khóa học ngay →</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">Nếu cần hỗ trợ, chỉ cần reply email này. Chúng tôi phản hồi trong vòng 24h.</p>
      <p style="margin:8px 0 0; font-size:13px; color:#6b7280;">— Lê Đăng Khương</p>
    `),
      },
    },
    // Wait 3 days
    {
      id: "wait_1",
      type: "wait",
      position: { x: 0, y: 200 },
      data: { days: 3, hours: 0, minutes: 0 },
    },
    // Email 2 — Nhắc nhở học bài 1
    {
      id: "send_2",
      type: "sendEmail",
      position: { x: 0, y: 300 },
      data: {
        subject: "{{name}}, bạn đã học bài 1 chưa? \u{1F4DA}",
        fromName: "Lê Đăng Khương",
        htmlContent: emailTemplate(`
      <h1>Bạn đã bắt đầu chưa, {{name}}? \u{1F4DA}</h1>
      <p>Tôi biết cuộc sống bận rộn — nhưng đừng để kiến thức bạn vừa đầu tư bị lãng phí nhé!</p>
      <p>Đây là một vài <span class="highlight">tip học hiệu quả</span> từ những học viên top:</p>
      <ul style="color:#9ca3af; font-size:14px; line-height:2; padding-left:20px; margin:0 0 20px;">
        <li>⏰ Dành 20-30 phút mỗi ngày — nhất quán hơn cố gắng học nhiều 1 lần</li>
        <li>\u{1F4DD} Ghi chú ngắn sau mỗi bài — giúp nhớ lâu hơn 3 lần</li>
        <li>\u{1F4AC} Đặt câu hỏi trong cộng đồng nếu chưa hiểu — đừng bỏ qua</li>
        <li>\u{1F3AF} Hoàn thành bài 1 trước khi sang bài 2 — đừng skip</li>
      </ul>
      <p>Bài 1 chỉ mất khoảng 20 phút. Bắt đầu ngay hôm nay nhé!</p>
      <a href="${BASE_URL}/dashboard" class="btn">Tiếp tục học →</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">— Lê Đăng Khương</p>
    `),
      },
    },
    // Wait 4 days
    {
      id: "wait_2",
      type: "wait",
      position: { x: 0, y: 400 },
      data: { days: 4, hours: 0, minutes: 0 },
    },
    // Email 3 — Community + XP
    {
      id: "send_3",
      type: "sendEmail",
      position: { x: 0, y: 500 },
      data: {
        subject: "Tham gia cộng đồng 600+ học viên — tích XP leo rank! \u{1F3C6}",
        fromName: "Lê Đăng Khương",
        htmlContent: emailTemplate(`
      <h1>Cộng đồng đang chờ bạn! \u{1F3C6}</h1>
      <p>Xin chào {{name}},</p>
      <p>Bạn biết không? Học viên tham gia cộng đồng có <span class="highlight">tỷ lệ hoàn thành khóa học cao gấp 3 lần</span> so với học một mình.</p>
      <p>Tại cộng đồng Lê Đăng Khương Academy, bạn sẽ:</p>
      <div style="background:#222;border:1px solid #333;border-radius:8px;padding:20px;margin:20px 0;">
        <div style="color:#fff;font-weight:600;font-size:15px;margin-bottom:16px;">\u{1F3AE} Hệ thống XP & Leaderboard</div>
        <ul style="color:#9ca3af;font-size:14px;line-height:2;padding-left:20px;margin:0;">
          <li>Tích XP mỗi khi hoàn thành bài học, đặt câu hỏi, hoặc giúp đỡ người khác</li>
          <li>Leo rank từ Bronze → Silver → Gold → Diamond</li>
          <li>Top leaderboard nhận phần thưởng đặc biệt hàng tháng</li>
        </ul>
      </div>
      <p>Hơn 600 học viên đang hoạt động mỗi ngày — đặt câu hỏi, chia sẻ kết quả, và hỗ trợ nhau. Đừng bỏ lỡ!</p>
      <a href="${BASE_URL}/community" class="btn">Vào cộng đồng →</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">— Lê Đăng Khương</p>
    `),
      },
    },
    // Wait 7 days
    {
      id: "wait_3",
      type: "wait",
      position: { x: 0, y: 600 },
      data: { days: 7, hours: 0, minutes: 0 },
    },
    // Email 4 — Upsell combo
    {
      id: "send_4",
      type: "sendEmail",
      position: { x: 0, y: 700 },
      data: {
        subject: "Nâng cấp kỹ năng — combo 3 khóa học ưu đãi 40%",
        fromName: "Lê Đăng Khương",
        htmlContent: emailTemplate(`
      <h1>Nâng cấp hành trình học tập \u{1F680}</h1>
      <p>Xin chào {{name}},</p>
      <p>Bạn đã bước vào hành trình rồi — và tôi tin bạn đã thấy giá trị từ khóa học đầu tiên.</p>
      <p>Bây giờ là lúc để <span class="highlight">nâng cấp lên tầm tiếp theo</span>. Tôi đã chuẩn bị combo 3 khóa học với mức ưu đãi đặc biệt dành riêng cho học viên hiện tại:</p>
      <div style="background:#222;border:1px solid rgba(212,168,67,0.2);border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
        <div style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Ưu đãi dành cho học viên</div>
        <div style="color:#D4A843;font-weight:700;font-size:32px;margin-bottom:4px;">Giảm 40%</div>
        <div style="color:#9ca3af;font-size:14px;">Combo 3 khóa học — Chỉ áp dụng trong thời gian giới hạn</div>
      </div>
      <p>Combo bao gồm các khóa học bổ trợ lẫn nhau, giúp bạn có kiến thức toàn diện từ nền tảng đến thực chiến.</p>
      <a href="${BASE_URL}/pricing" class="btn">Xem ưu đãi →</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">— Lê Đăng Khương</p>
    `),
      },
    },
    // Wait 16 days
    {
      id: "wait_4",
      type: "wait",
      position: { x: 0, y: 800 },
      data: { days: 16, hours: 0, minutes: 0 },
    },
    // Email 5 — Affiliate invitation
    {
      id: "send_5",
      type: "sendEmail",
      position: { x: 0, y: 900 },
      data: {
        subject: "Kiếm thêm thu nhập — trở thành Affiliate của LDK Academy",
        fromName: "Lê Đăng Khương",
        htmlContent: emailTemplate(`
      <h1>Kiếm tiền cùng chúng tôi \u{1F4B0}</h1>
      <p>Xin chào {{name}},</p>
      <p>Bạn đã trải nghiệm khóa học và thấy giá trị nó mang lại. Bây giờ, bạn có thể <span class="highlight">kiếm thêm thu nhập</span> bằng cách chia sẻ giá trị đó cho người khác.</p>
      <div style="background:#222;border:1px solid #333;border-radius:8px;padding:20px;margin:20px 0;">
        <div style="color:#fff;font-weight:600;font-size:16px;margin-bottom:16px;">Chương trình Affiliate LDK Academy</div>
        <ul style="color:#9ca3af;font-size:14px;line-height:2;padding-left:20px;margin:0;">
          <li>\u{1F4B8} Hoa hồng <span style="color:#D4A843;font-weight:600;">20%</span> trên mỗi đơn hàng</li>
          <li>\u{1F517} Link giới thiệu cá nhân — theo dõi realtime</li>
          <li>\u{1F4CA} Dashboard affiliate riêng với thống kê chi tiết</li>
          <li>\u{1F4B3} Thanh toán hoa hồng hàng tháng, minh bạch</li>
        </ul>
      </div>
      <p>Nhiều affiliate đang kiếm thêm <span class="highlight">5-15 triệu/tháng</span> chỉ bằng cách chia sẻ link cho bạn bè và cộng đồng. Bạn cũng có thể!</p>
      <a href="${BASE_URL}/dashboard/affiliate" class="btn">Đăng ký affiliate →</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">— Lê Đăng Khương</p>
    `),
      },
    },
    // End
    {
      id: "end_1",
      type: "end",
      position: { x: 0, y: 1000 },
      data: {},
    },
  ],
  edges: [
    { id: "e1", source: "trigger_1", target: "send_1" },
    { id: "e2", source: "send_1", target: "wait_1" },
    { id: "e3", source: "wait_1", target: "send_2" },
    { id: "e4", source: "send_2", target: "wait_2" },
    { id: "e5", source: "wait_2", target: "send_3" },
    { id: "e6", source: "send_3", target: "wait_3" },
    { id: "e7", source: "wait_3", target: "send_4" },
    { id: "e8", source: "send_4", target: "wait_4" },
    { id: "e9", source: "wait_4", target: "send_5" },
    { id: "e10", source: "send_5", target: "end_1" },
  ],
};

// ─── Automation 3: Re-engagement Sequence ───────────────────────

const reEngagementFlow = {
  nodes: [
    {
      id: "trigger_1",
      type: "trigger",
      position: { x: 0, y: 0 },
      data: {
        triggerType: "tag_added",
        config: { tag: "inactive_30d" },
      },
    },
    // Email 1 — Nhẹ nhàng quay lại
    {
      id: "send_1",
      type: "sendEmail",
      position: { x: 0, y: 100 },
      data: {
        subject: "{{name}}, lâu rồi không thấy bạn \u{1F44B}",
        fromName: "Lê Đăng Khương",
        htmlContent: emailTemplate(`
      <h1>Lâu rồi không gặp, {{name}}! \u{1F44B}</h1>
      <p>Tôi nhận ra bạn chưa ghé thăm dangkhuong.com một thời gian rồi — và tôi hiểu, cuộc sống ai cũng bận.</p>
      <p>Nhưng tôi muốn bạn biết: <span class="highlight">cánh cửa luôn mở cho bạn</span>.</p>
      <p>Trong khi bạn vắng, chúng tôi đã cập nhật khá nhiều điều mới:</p>
      <ul style="color:#9ca3af; font-size:14px; line-height:2; padding-left:20px; margin:0 0 20px;">
        <li>✨ Bài học mới được cập nhật hàng tuần</li>
        <li>\u{1F3AE} Hệ thống XP và Leaderboard hoàn toàn mới</li>
        <li>\u{1F4AC} Cộng đồng ngày càng sôi động với 600+ thành viên</li>
      </ul>
      <p>Quay lại xem có gì mới nhé — không áp lực, tùy bạn!</p>
      <a href="${BASE_URL}/dashboard" class="btn">Quay lại xem gì mới →</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">Nếu bạn không muốn nhận email nữa, bạn có thể hủy đăng ký ở link bên dưới. Không sao cả!</p>
      <p style="margin:8px 0 0; font-size:13px; color:#6b7280;">— Lê Đăng Khương</p>
    `),
      },
    },
    // Wait 3 days
    {
      id: "wait_1",
      type: "wait",
      position: { x: 0, y: 200 },
      data: { days: 3, hours: 0, minutes: 0 },
    },
    // Email 2 — Social proof / FOMO
    {
      id: "send_2",
      type: "sendEmail",
      position: { x: 0, y: 300 },
      data: {
        subject: "Trong khi bạn vắng, 3 học viên đã đạt kết quả này...",
        fromName: "Lê Đăng Khương",
        htmlContent: emailTemplate(`
      <h1>Cộng đồng đang tiến bước \u{1F3C3}</h1>
      <p>Xin chào {{name}},</p>
      <p>Trong khi bạn vắng, nhiều học viên trong cộng đồng đã đạt được kết quả ấn tượng:</p>
      <div style="background:#222;border:1px solid #333;border-radius:8px;padding:20px;margin:20px 0;">
        <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #333;">
          <div style="color:#D4A843;font-size:13px;margin-bottom:4px;">\u{1F3C6} Thành tích 1</div>
          <div style="color:#fff;font-size:14px;">Anh Minh T. — hoàn thành toàn bộ khóa học và xây được website bán hàng đầu tiên</div>
        </div>
        <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #333;">
          <div style="color:#D4A843;font-size:13px;margin-bottom:4px;">\u{1F3C6} Thành tích 2</div>
          <div style="color:#fff;font-size:14px;">Chị Hương L. — thu về 15 triệu doanh thu đầu tiên sau 2 tháng áp dụng</div>
        </div>
        <div>
          <div style="color:#D4A843;font-size:13px;margin-bottom:4px;">\u{1F3C6} Thành tích 3</div>
          <div style="color:#fff;font-size:14px;">Bạn Đức N. — leo lên Top 3 Leaderboard chỉ trong 3 tuần</div>
        </div>
      </div>
      <p>Bạn cũng có thể đạt được kết quả tương tự — chỉ cần quay lại và bắt đầu lại.</p>
      <a href="${BASE_URL}/community" class="btn">Xem cộng đồng →</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">— Lê Đăng Khương</p>
    `),
      },
    },
    // Wait 4 days
    {
      id: "wait_2",
      type: "wait",
      position: { x: 0, y: 400 },
      data: { days: 4, hours: 0, minutes: 0 },
    },
    // Email 3 — Flash offer
    {
      id: "send_3",
      type: "sendEmail",
      position: { x: 0, y: 500 },
      data: {
        subject: "\u{1F525} Flash offer 48h — giảm 50% khóa học mới nhất",
        fromName: "Lê Đăng Khương",
        htmlContent: emailTemplate(`
      <h1>\u{1F525} Ưu đãi đặc biệt cho bạn!</h1>
      <p>Xin chào {{name}},</p>
      <p>Tôi muốn dành cho bạn một ưu đãi đặc biệt — vì tôi tin rằng đôi khi chỉ cần <span class="highlight">một cú hích nhỏ</span> để bắt đầu lại.</p>
      <div style="background:linear-gradient(135deg,#1a1207,#1a1a1a);border:2px solid #D4A843;border-radius:12px;padding:28px;margin:20px 0;text-align:center;">
        <div style="color:#D4A843;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Flash Offer — Chỉ 48 giờ</div>
        <div style="color:#fff;font-weight:700;font-size:36px;margin-bottom:8px;">Giảm 50%</div>
        <div style="color:#9ca3af;font-size:14px;margin-bottom:16px;">Khóa học mới nhất — áp dụng cho bạn duy nhất</div>
        <div style="background:#D4A843;color:#000;display:inline-block;padding:4px 12px;border-radius:4px;font-weight:600;font-size:12px;">⏰ Hết hạn trong 48 giờ</div>
      </div>
      <p>Đây là ưu đãi dành riêng cho những ai đã từng là một phần của cộng đồng. Tôi muốn bạn quay lại — và bắt đầu lại với mức đầu tư thấp nhất.</p>
      <a href="${BASE_URL}/pricing" class="btn">Nhận ưu đãi 50% →</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">Ưu đãi sẽ tự động hết hạn sau 48 giờ. Không gia hạn.</p>
      <p style="margin:8px 0 0; font-size:13px; color:#6b7280;">— Lê Đăng Khương</p>
    `),
      },
    },
    // End
    {
      id: "end_1",
      type: "end",
      position: { x: 0, y: 600 },
      data: {},
    },
  ],
  edges: [
    { id: "e1", source: "trigger_1", target: "send_1" },
    { id: "e2", source: "send_1", target: "wait_1" },
    { id: "e3", source: "wait_1", target: "send_2" },
    { id: "e4", source: "send_2", target: "wait_2" },
    { id: "e5", source: "wait_2", target: "send_3" },
    { id: "e6", source: "send_3", target: "end_1" },
  ],
};

// ─── Automation 4: Event/Webinar Sequence ───────────────────────

const eventWebinarFlow = {
  nodes: [
    {
      id: "trigger_1",
      type: "trigger",
      position: { x: 0, y: 0 },
      data: {
        triggerType: "tag_added",
        config: { tag: "event_registered" },
      },
    },
    // Email 1 — Xác nhận đăng ký
    {
      id: "send_1",
      type: "sendEmail",
      position: { x: 0, y: 100 },
      data: {
        subject: "✅ Đã xác nhận — bạn đã đăng ký buổi Zoom thành công!",
        fromName: "Lê Đăng Khương",
        htmlContent: emailTemplate(`
      <h1>Đăng ký thành công! ✅</h1>
      <p>Xin chào {{name}},</p>
      <p>Chúc mừng! Bạn đã đăng ký thành công buổi <span class="highlight">Zoom live</span> cùng Lê Đăng Khương.</p>
      <div style="background:#222;border:1px solid #333;border-radius:8px;padding:20px;margin:20px 0;">
        <div style="color:#fff;font-weight:600;font-size:16px;margin-bottom:12px;">\u{1F4CB} Thông tin buổi Zoom</div>
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
          <span style="color:#6b7280;font-size:13px;">Thời gian</span>
          <span style="color:#fff;font-size:13px;">Thứ 6 tuần này, 20:00</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
          <span style="color:#6b7280;font-size:13px;">Thời lượng</span>
          <span style="color:#fff;font-size:13px;">90 phút</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#6b7280;font-size:13px;">Nền tảng</span>
          <span style="color:#fff;font-size:13px;">Zoom Meeting</span>
        </div>
      </div>
      <p>Link Zoom sẽ được gửi vào email nhắc nhở trước buổi học 1 ngày. Trong lúc chờ, hãy vào nhóm Zalo để nhận tài liệu chuẩn bị:</p>
      <a href="https://zalo.me/g/mwrjxixtjhe0aed8fkdf" class="btn">Vào nhóm Zalo →</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">Giữ email này để tham khảo. Hẹn gặp bạn ở buổi Zoom!</p>
      <p style="margin:8px 0 0; font-size:13px; color:#6b7280;">— Lê Đăng Khương</p>
    `),
      },
    },
    // Wait 5 days (default — approximately 1 day before event)
    {
      id: "wait_1",
      type: "wait",
      position: { x: 0, y: 200 },
      data: { days: 5, hours: 0, minutes: 0 },
    },
    // Email 2 — Nhắc nhở ngày mai
    {
      id: "send_2",
      type: "sendEmail",
      position: { x: 0, y: 300 },
      data: {
        subject: "⏰ Nhắc nhở: Zoom live NGÀY MAI lúc 20h!",
        fromName: "Lê Đăng Khương",
        htmlContent: emailTemplate(`
      <h1>Ngày mai gặp nhau nhé! ⏰</h1>
      <p>Xin chào {{name}},</p>
      <p>Nhắc bạn: buổi <span class="highlight">Zoom live</span> sẽ diễn ra vào <span class="highlight">NGÀY MAI lúc 20:00</span>!</p>
      <div style="background:#222;border:2px solid #D4A843;border-radius:8px;padding:20px;margin:20px 0;">
        <div style="color:#fff;font-weight:600;font-size:16px;margin-bottom:16px;">\u{1F4DD} Checklist chuẩn bị</div>
        <ul style="color:#9ca3af;font-size:14px;line-height:2.2;padding-left:20px;margin:0;">
          <li>✅ Cài đặt app Zoom (hoặc dùng trên trình duyệt)</li>
          <li>✅ Kiểm tra micro và camera</li>
          <li>✅ Chuẩn bị giấy bút ghi chú</li>
          <li>✅ Tham gia đúng giờ 20:00 để không bỏ lỡ</li>
        </ul>
      </div>
      <p>Lưu link Zoom bên dưới — bạn sẽ cần nó vào ngày mai:</p>
      <a href="${BASE_URL}/weballinone" class="btn">Lưu link Zoom →</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">Hẹn gặp bạn ngày mai lúc 20:00!</p>
      <p style="margin:8px 0 0; font-size:13px; color:#6b7280;">— Lê Đăng Khương</p>
    `),
      },
    },
    // Wait 2 days (after event)
    {
      id: "wait_2",
      type: "wait",
      position: { x: 0, y: 400 },
      data: { days: 2, hours: 0, minutes: 0 },
    },
    // Email 3 — Replay + Tài liệu
    {
      id: "send_3",
      type: "sendEmail",
      position: { x: 0, y: 500 },
      data: {
        subject: "\u{1F4F9} Replay + Tài liệu buổi Zoom đã sẵn sàng",
        fromName: "Lê Đăng Khương",
        htmlContent: emailTemplate(`
      <h1>Replay đã sẵn sàng! \u{1F4F9}</h1>
      <p>Xin chào {{name}},</p>
      <p>Cảm ơn bạn đã tham gia (hoặc đăng ký) buổi Zoom live vừa rồi! Đây là tất cả tài liệu bạn cần:</p>
      <div style="background:#222;border:1px solid #333;border-radius:8px;padding:20px;margin:20px 0;">
        <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #333;">
          <div style="color:#D4A843;font-size:13px;margin-bottom:6px;">\u{1F3AC} Video Replay</div>
          <div style="color:#9ca3af;font-size:14px;">Xem lại toàn bộ buổi Zoom — không giới hạn thời gian</div>
        </div>
        <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #333;">
          <div style="color:#D4A843;font-size:13px;margin-bottom:6px;">\u{1F4C4} Tài liệu & Slide</div>
          <div style="color:#9ca3af;font-size:14px;">Download slide trình bày và tài liệu bổ sung</div>
        </div>
        <div>
          <div style="color:#D4A843;font-size:13px;margin-bottom:6px;">\u{1F4DD} Tóm tắt nội dung chính</div>
          <div style="color:#9ca3af;font-size:14px;">Các điểm quan trọng nhất từ buổi Zoom, ghi chú sẵn cho bạn</div>
        </div>
      </div>
      <a href="${BASE_URL}/courses" class="btn">Xem replay →</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">Nếu bạn có câu hỏi thêm sau khi xem replay, đừng ngần ngại reply email này nhé!</p>
      <p style="margin:8px 0 0; font-size:13px; color:#6b7280;">— Lê Đăng Khương</p>
    `),
      },
    },
    // Wait 2 days
    {
      id: "wait_3",
      type: "wait",
      position: { x: 0, y: 600 },
      data: { days: 2, hours: 0, minutes: 0 },
    },
    // Email 4 — Ưu đãi cho attendees
    {
      id: "send_4",
      type: "sendEmail",
      position: { x: 0, y: 700 },
      data: {
        subject: "\u{1F4B0} Ưu đãi đặc biệt cho người tham dự — chỉ 48h",
        fromName: "Lê Đăng Khương",
        htmlContent: emailTemplate(`
      <h1>\u{1F4B0} Ưu đãi dành riêng cho bạn!</h1>
      <p>Xin chào {{name}},</p>
      <p>Cảm ơn bạn đã tham gia buổi Zoom vừa rồi! Như đã hứa, đây là <span class="highlight">ưu đãi đặc biệt dành riêng cho người tham dự</span>.</p>
      <div style="background:linear-gradient(135deg,#1a1207,#1a1a1a);border:2px solid #D4A843;border-radius:12px;padding:28px;margin:20px 0;text-align:center;">
        <div style="color:#D4A843;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Exclusive Attendee Offer</div>
        <div style="color:#fff;font-weight:700;font-size:28px;margin-bottom:8px;">Giá đặc biệt chỉ cho bạn</div>
        <div style="color:#9ca3af;font-size:14px;margin-bottom:16px;">Truy cập toàn bộ hệ thống Web All-In-One</div>
        <div style="background:#ef4444;color:#fff;display:inline-block;padding:4px 12px;border-radius:4px;font-weight:600;font-size:12px;">⏰ Hết hạn trong 48 giờ</div>
      </div>
      <p>Ưu đãi này <span style="color:#ef4444;font-weight:600;">chỉ kéo dài 48 giờ</span> và không áp dụng lại. Nếu bạn đã sẵn sàng đầu tư cho bản thân, đây là thời điểm tốt nhất.</p>
      <p>Bao gồm:</p>
      <ul style="color:#9ca3af; font-size:14px; line-height:2; padding-left:20px; margin:0 0 20px;">
        <li>Truy cập trọn đời tất cả khóa học hiện tại và tương lai</li>
        <li>Cộng đồng VIP với hỗ trợ ưu tiên</li>
        <li>Tài liệu, template, và công cụ AI độc quyền</li>
        <li>Buổi Zoom 1-1 với Lê Đăng Khương</li>
      </ul>
      <a href="${BASE_URL}/weballinone" class="btn">Nhận ưu đãi →</a>
      <div class="divider"></div>
      <p style="margin:0; font-size:13px; color:#6b7280;">Sau 48 giờ, giá sẽ trở lại bình thường. Không gia hạn, không ngoại lệ.</p>
      <p style="margin:8px 0 0; font-size:13px; color:#6b7280;">— Lê Đăng Khương</p>
    `),
      },
    },
    // End
    {
      id: "end_1",
      type: "end",
      position: { x: 0, y: 800 },
      data: {},
    },
  ],
  edges: [
    { id: "e1", source: "trigger_1", target: "send_1" },
    { id: "e2", source: "send_1", target: "wait_1" },
    { id: "e3", source: "wait_1", target: "send_2" },
    { id: "e4", source: "send_2", target: "wait_2" },
    { id: "e5", source: "wait_2", target: "send_3" },
    { id: "e6", source: "send_3", target: "wait_3" },
    { id: "e7", source: "wait_3", target: "send_4" },
    { id: "e8", source: "send_4", target: "end_1" },
  ],
};

// ─── Automation definitions ─────────────────────────────────────

const AUTOMATIONS = [
  {
    name: "Welcome Sequence",
    description:
      "Chuỗi 5 email chào mừng người dùng mới: giới thiệu platform, câu chuyện cá nhân, bài học miễn phí, social proof, và mời Zoom.",
    status: "active",
    trigger_type: "tag_added",
    trigger_config: { tag: "new_user" },
    flow_definition: welcomeFlow,
  },
  {
    name: "Post-Purchase Sequence",
    description:
      "Chuỗi 5 email sau khi mua hàng: hướng dẫn bắt đầu, nhắc nhở học, giới thiệu cộng đồng, upsell combo, và mời affiliate.",
    status: "active",
    trigger_type: "purchase",
    trigger_config: {},
    flow_definition: postPurchaseFlow,
  },
  {
    name: "Re-engagement Sequence",
    description:
      "Chuỗi 3 email tái kích hoạt người dùng không hoạt động 30 ngày: nhẹ nhàng quay lại, social proof, và flash offer 50%.",
    status: "active",
    trigger_type: "tag_added",
    trigger_config: { tag: "inactive_30d" },
    flow_definition: reEngagementFlow,
  },
  {
    name: "Event/Webinar Sequence",
    description:
      "Chuỗi 4 email cho sự kiện Zoom: xác nhận đăng ký, nhắc nhở 1 ngày trước, gửi replay + tài liệu, và ưu đãi 48h cho attendees.",
    status: "active",
    trigger_type: "tag_added",
    trigger_config: { tag: "event_registered" },
    flow_definition: eventWebinarFlow,
  },
];

// ─── Main: upsert automations ───────────────────────────────────

async function main() {
  console.log("=== Setup Email Automations ===\n");

  // Fetch existing automations to check for duplicates
  const { data: existing, error: fetchError } = await supabase
    .from("email_automations")
    .select("id, name");

  if (fetchError) {
    console.error("Failed to fetch existing automations:", fetchError.message);
    process.exit(1);
  }

  const existingNames = new Set((existing || []).map((a) => a.name));
  let created = 0;
  let skipped = 0;

  for (const automation of AUTOMATIONS) {
    if (existingNames.has(automation.name)) {
      console.log(`  SKIP  "${automation.name}" — already exists`);
      skipped++;
      continue;
    }

    const { data, error } = await supabase
      .from("email_automations")
      .insert({
        name: automation.name,
        description: automation.description,
        status: automation.status,
        trigger_type: automation.trigger_type,
        trigger_config: automation.trigger_config,
        flow_definition: automation.flow_definition,
        enrolled_count: 0,
        completed_count: 0,
        active_count: 0,
      })
      .select("id, name")
      .single();

    if (error) {
      console.error(`  FAIL  "${automation.name}" — ${error.message}`);
    } else {
      console.log(`  OK    "${data.name}" — id: ${data.id}`);
      created++;
    }
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
