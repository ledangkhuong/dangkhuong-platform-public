import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}
const FROM = process.env.EMAIL_FROM || "Đăng Khương <no-reply@dangkhuong.com>";

// ─── Templates ───────────────────────────────────────────────────

function baseTemplate(content: string) {
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
    .logo-icon { width:36px; height:36px; border-radius:8px; background:linear-gradient(135deg,#22c55e,#16a34a); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:13px; }
    .logo-text { color:#fff; font-weight:700; font-size:16px; }
    h1 { color:#fff; font-size:22px; font-weight:700; margin:0 0 12px; line-height:1.3; }
    p { color:#9ca3af; font-size:14px; line-height:1.7; margin:0 0 16px; }
    .btn { display:inline-block; padding:12px 28px; background:#22c55e; color:#fff; border-radius:8px; text-decoration:none; font-weight:600; font-size:14px; }
    .divider { height:1px; background:#2a2a2a; margin:24px 0; }
    .footer { color:#4b5563; font-size:12px; text-align:center; margin-top:24px; line-height:1.6; }
    .highlight { color:#22c55e; font-weight:600; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="logo">
      <div class="logo-icon">ĐK</div>
      <div class="logo-text">Đăng Khương Academy</div>
    </div>
    <div class="card">
      ${content}
    </div>
    <div class="footer">
      © 2025 Đăng Khương Academy · <a href="https://dangkhuong.com" style="color:#4b5563;">dangkhuong.com</a><br/>
      Bạn nhận email này vì đã đăng ký tại dangkhuong.com<br/>
      <a href="https://dangkhuong.com/unsubscribe" style="color:#4b5563;">Huỷ đăng ký</a>
    </div>
  </div>
</body>
</html>`;
}

// ─── Email functions ───────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Chào mừng ${name} đến với Đăng Khương Academy! 🎉`,
    html: baseTemplate(`
      <h1>Chào mừng bạn, ${name}! 🚀</h1>
      <p>Tôi là <span class="highlight">Đăng Khương</span> — và tôi rất vui khi bạn tham gia cộng đồng.</p>
      <p>Đây là những gì bạn có thể làm ngay:</p>
      <ul style="color:#9ca3af; font-size:14px; line-height:2; padding-left:20px; margin:0 0 20px;">
        <li>📚 Bắt đầu khoá học miễn phí</li>
        <li>💬 Tham gia cộng đồng thảo luận</li>
        <li>🏆 Tích điểm XP và leo bảng xếp hạng</li>
        <li>📬 Nhận newsletter hàng tuần</li>
      </ul>
      <a href="https://dangkhuong.com/courses" class="btn">Bắt đầu học ngay →</a>
      <div class="divider"></div>
      <p style="margin:0;">Nếu bạn có bất kỳ câu hỏi nào, chỉ cần reply email này — tôi đọc tất cả.</p>
      <p style="margin:8px 0 0; color:#6b7280; font-size:13px;">— Đăng Khương</p>
    `),
  });
}

export async function sendPurchaseConfirmation(
  to: string,
  name: string,
  productName: string,
  amount: number,
  orderCode: string,
) {
  const formattedAmount = amount.toLocaleString("vi-VN") + "₫";
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `✅ Xác nhận thanh toán — ${productName}`,
    html: baseTemplate(`
      <h1>Thanh toán thành công! 🎉</h1>
      <p>Xin chào <span class="highlight">${name}</span>,</p>
      <p>Chúng tôi đã nhận được thanh toán của bạn và quyền truy cập đã được kích hoạt.</p>
      <div style="background:#222;border:1px solid #333;border-radius:8px;padding:16px;margin:20px 0;">
        <div style="color:#6b7280;font-size:12px;margin-bottom:4px;">Sản phẩm</div>
        <div style="color:#fff;font-weight:600;font-size:15px;margin-bottom:12px;">${productName}</div>
        <div style="color:#6b7280;font-size:12px;margin-bottom:4px;">Số tiền</div>
        <div style="color:#22c55e;font-weight:700;font-size:18px;margin-bottom:12px;">${formattedAmount}</div>
        <div style="color:#6b7280;font-size:12px;margin-bottom:4px;">Mã đơn hàng</div>
        <div style="color:#9ca3af;font-family:monospace;font-size:13px;">DK${orderCode}</div>
      </div>
      <a href="https://dangkhuong.com/courses" class="btn">Vào học ngay →</a>
      <div class="divider"></div>
      <p style="margin:0;font-size:13px;color:#6b7280;">Giữ email này làm biên lai. Nếu có vấn đề gì, reply email này để được hỗ trợ trong 24h.</p>
    `),
  });
}

export async function sendWeeklyNewsletter(
  to: string,
  name: string,
  subject: string,
  body: string,
) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject,
    html: baseTemplate(`
      <h1>${subject}</h1>
      <p>Xin chào <span class="highlight">${name}</span>,</p>
      ${body}
      <div class="divider"></div>
      <p style="margin:0;font-size:13px;color:#6b7280;">— Đăng Khương<br/>
      <a href="https://dangkhuong.com" style="color:#22c55e;">dangkhuong.com</a></p>
    `),
  });
}

export async function sendLessonCompleteNudge(
  to: string,
  name: string,
  nextLessonTitle: string,
  courseUrl: string,
) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `🔥 Tiếp tục đà học tập — bài tiếp theo đang chờ bạn!`,
    html: baseTemplate(`
      <h1>Bạn đang làm rất tốt, ${name}! 💪</h1>
      <p>Bạn đã hoàn thành bài học trước. Tiếp tục ngay để giữ đà học tập!</p>
      <div style="background:#222;border:1px solid rgba(34,197,94,0.2);border-radius:8px;padding:16px;margin:20px 0;">
        <div style="color:#6b7280;font-size:12px;margin-bottom:6px;">Bài tiếp theo</div>
        <div style="color:#fff;font-weight:600;">${nextLessonTitle}</div>
      </div>
      <a href="${courseUrl}" class="btn">Tiếp tục học →</a>
      <div class="divider"></div>
      <p style="margin:0;font-size:13px;color:#6b7280;">
        Nhất quán mỗi ngày — đó là bí quyết thực sự. Chỉ 20 phút hôm nay!
      </p>
    `),
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetLink: string,
) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `🔑 Đặt lại mật khẩu — Đăng Khương Academy`,
    html: baseTemplate(`
      <h1>Đặt lại mật khẩu</h1>
      <p>Xin chào <span class="highlight">${name}</span>,</p>
      <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Bấm nút bên dưới để tạo mật khẩu mới:</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${resetLink}" class="btn">Đặt lại mật khẩu →</a>
      </div>
      <p style="font-size:13px;color:#6b7280;">Link này sẽ hết hạn sau 1 giờ. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
      <div class="divider"></div>
      <p style="margin:0;font-size:12px;color:#4b5563;">Nếu nút không hoạt động, copy và dán link sau vào trình duyệt:<br/>
      <a href="${resetLink}" style="color:#22c55e;word-break:break-all;font-size:11px;">${resetLink}</a></p>
    `),
  });
}

export async function sendEventReminder(
  to: string,
  name: string,
  eventTitle: string,
  eventTime: string,
  joinUrl: string,
) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `⏰ Nhắc nhở: "${eventTitle}" bắt đầu trong 1 tiếng!`,
    html: baseTemplate(`
      <h1>Sắp đến giờ rồi! ⏰</h1>
      <p>Xin chào <span class="highlight">${name}</span>,</p>
      <p>Sự kiện bạn đã đăng ký sắp bắt đầu:</p>
      <div style="background:#222;border:1px solid #333;border-radius:8px;padding:16px;margin:20px 0;">
        <div style="color:#fff;font-weight:600;font-size:15px;margin-bottom:8px;">${eventTitle}</div>
        <div style="color:#22c55e;font-size:13px;">🕐 ${eventTime}</div>
      </div>
      <a href="${joinUrl}" class="btn">Tham gia ngay →</a>
      <div class="divider"></div>
      <p style="margin:0;font-size:13px;color:#6b7280;">Hẹn gặp bạn ở đó!</p>
    `),
  });
}

export async function sendAffiliateCommissionEmail(
  to: string,
  name: string,
  productName: string,
  commissionAmount: number,
) {
  const formatted = commissionAmount.toLocaleString("vi-VN") + "₫";
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Bạn vừa nhận hoa hồng ${formatted} — Đăng Khương Academy`,
    html: baseTemplate(`
      <h1>Chúc mừng, ${name}!</h1>
      <p>Một khách hàng vừa mua <span class="highlight">${productName}</span> qua link giới thiệu của bạn.</p>
      <div style="background:#222;border:1px solid rgba(34,197,94,0.2);border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
        <div style="color:#6b7280;font-size:12px;margin-bottom:6px;">Hoa hồng nhận được</div>
        <div style="color:#22c55e;font-weight:700;font-size:26px;">${formatted}</div>
      </div>
      <p>Khoản hoa hồng đang chờ duyệt. Bạn có thể theo dõi chi tiết tại trang Affiliate.</p>
      <a href="https://dangkhuong.com/dashboard/affiliate" class="btn">Xem Affiliate Dashboard →</a>
      <div class="divider"></div>
      <p style="margin:0;font-size:13px;color:#6b7280;">Tiếp tục chia sẻ link giới thiệu để nhận thêm hoa hồng!</p>
    `),
  });
}

export async function sendVerificationEmail(to: string, name: string, confirmUrl: string) {
  const html = baseTemplate(`
    <h1>Xin chào ${name}! 👋</h1>
    <p>Cảm ơn bạn đã đăng ký tài khoản tại <span class="highlight">Đăng Khương Academy</span>.</p>
    <p>Vui lòng nhấn nút bên dưới để xác thực địa chỉ email và kích hoạt tài khoản của bạn:</p>
    <p style="text-align:center; margin:24px 0;">
      <a href="${confirmUrl}" class="btn">Xác thực tài khoản</a>
    </p>
    <p style="font-size:12px; color:#6b7280;">Nếu nút không hoạt động, bạn có thể copy đường link sau vào trình duyệt:<br/>
    <a href="${confirmUrl}" style="color:#22c55e; word-break:break-all; font-size:11px;">${confirmUrl}</a></p>
    <div class="divider"></div>
    <p style="font-size:12px; color:#6b7280; margin:0;">Link xác thực có hiệu lực trong 24 giờ. Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.</p>
  `);

  return getResend().emails.send({
    from: FROM,
    to,
    subject: "Xác thực tài khoản Đăng Khương Academy",
    html,
  });
}
