/**
 * Transactional Email Functions — powered by AWS SES
 * (Chuyển từ Resend sang SES để tránh quota limit)
 */
import { sendEmail as sesSendEmail } from "./ses";

// ─── Utilities ──────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ─── Config ─────────────────────────────────────────────────────

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://dangkhuong.com";
}

function getSiteDomain(): string {
  try { return new URL(getBaseUrl()).hostname; } catch { return "dangkhuong.com"; }
}

function getSiteName(): string {
  return process.env.EMAIL_FROM_NAME || "Lê Đăng Khương Academy";
}

// ─── Templates ───────────────────────────────────────────────────

function baseTemplate(content: string) {
  const baseUrl = getBaseUrl();
  const siteDomain = getSiteDomain();
  const siteName = getSiteName();
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
    .btn { display:inline-block; padding:12px 28px; background:#D4A843; color:#fff; border-radius:8px; text-decoration:none; font-weight:600; font-size:14px; }
    .divider { height:1px; background:#2a2a2a; margin:24px 0; }
    .footer { color:#4b5563; font-size:12px; text-align:center; margin-top:24px; line-height:1.6; }
    .highlight { color:#D4A843; font-weight:600; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="logo">
      <div class="logo-icon">LĐK</div>
      <div class="logo-text">Lê Đăng Khương Academy</div>
    </div>
    <div class="card">
      ${content}
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} ${siteName} · <a href="${baseUrl}" style="color:#4b5563;">${siteDomain}</a><br/>
      Bạn nhận email này vì đã đăng ký tại ${siteDomain}<br/>
      <a href="${baseUrl}/unsubscribe" style="color:#4b5563;">Huỷ đăng ký</a>
    </div>
  </div>
</body>
</html>`;
}

// ─── Email functions ───────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
  return sesSendEmail(
    to,
    `Chào mừng ${escapeHtml(name)} đến với Lê Đăng Khương Academy! 🎉`,
    baseTemplate(`
      <h1>Chào mừng bạn, ${escapeHtml(name)}! 🚀</h1>
      <p>Tôi là <span class="highlight">Lê Đăng Khương</span> — và tôi rất vui khi bạn tham gia cộng đồng.</p>
      <p>Đăng nhập vào <span class="highlight">dangkhuong.com</span> với tài khoản là <strong>Email</strong> và <strong>mật khẩu</strong> bạn vừa đăng ký để bắt đầu học ngay.</p>
      <p>Đây là những gì bạn có thể làm:</p>
      <ul style="color:#9ca3af; font-size:14px; line-height:2; padding-left:20px; margin:0 0 20px;">
        <li>📚 Vào khóa học và xem video bài giảng</li>
        <li>💬 Tham gia cộng đồng thảo luận</li>
        <li>🏆 Tích điểm XP và leo bảng xếp hạng</li>
        <li>📬 Nhận newsletter hàng tuần</li>
      </ul>
      <a href="${getBaseUrl()}/login" class="btn">Đăng nhập học ngay →</a>
      <div class="divider"></div>
      <p style="margin:0;">Nếu bạn có bất kỳ câu hỏi nào, chỉ cần reply email này — tôi đọc tất cả.</p>
      <p style="margin:8px 0 0; color:#6b7280; font-size:13px;">— Lê Đăng Khương</p>
    `),
  );
}

export type PurchaseConfirmationOptions = {
  isPhysical?: boolean;
  shippingTrackingUrl?: string;
  orderType?: "course" | "physical" | "mixed";
  shippingFee?: number;
  estimatedDelivery?: string;
};

export async function sendPurchaseConfirmation(
  to: string,
  name: string,
  productName: string,
  amount: number,
  orderCode: string,
  options: PurchaseConfirmationOptions = {},
) {
  const formattedAmount = amount.toLocaleString("vi-VN") + "₫";
  const {
    isPhysical,
    shippingTrackingUrl,
    orderType,
    shippingFee,
    estimatedDelivery,
  } = options;

  const hasPhysical =
    isPhysical === true || orderType === "physical" || orderType === "mixed";

  // ─── Shipping/tracking section (only for physical/mixed orders) ───
  let shippingSection = "";
  if (hasPhysical) {
    const trackingBlock = shippingTrackingUrl
      ? `
        <div style="color:#6b7280;font-size:12px;margin-bottom:4px;">Mã theo dõi</div>
        <div style="margin-bottom:12px;">
          <a href="${escapeHtml(shippingTrackingUrl)}" style="color:#D4A843;font-weight:600;font-size:14px;text-decoration:underline;word-break:break-all;">
            ${escapeHtml(shippingTrackingUrl)}
          </a>
        </div>`
      : `
        <div style="color:#9ca3af;font-size:13px;line-height:1.6;margin-bottom:12px;">
          📦 Mã tracking sẽ được gửi sau khi đơn hàng được pickup bởi đơn vị vận chuyển. Bạn sẽ nhận email cập nhật ngay khi có.
        </div>`;

    const shippingFeeLine =
      typeof shippingFee === "number" && shippingFee >= 0
        ? `
        <div style="color:#6b7280;font-size:12px;margin-bottom:4px;">Phí vận chuyển</div>
        <div style="color:#fff;font-weight:600;font-size:14px;margin-bottom:12px;">${escapeHtml(shippingFee.toLocaleString("vi-VN") + "₫")}</div>`
        : "";

    const etaLine = estimatedDelivery
      ? `
        <div style="color:#6b7280;font-size:12px;margin-bottom:4px;">Dự kiến giao hàng</div>
        <div style="color:#fff;font-weight:600;font-size:14px;margin-bottom:12px;">${escapeHtml(estimatedDelivery)}</div>`
      : "";

    shippingSection = `
      <div style="background:#1d1f1d;border:1px solid rgba(212,168,67,0.25);border-radius:8px;padding:16px;margin:20px 0;">
        <div style="color:#D4A843;font-weight:700;font-size:14px;margin-bottom:12px;">🚚 Theo dõi đơn hàng</div>
        ${trackingBlock}
        ${shippingFeeLine}
        ${etaLine}
      </div>`;
  }

  // ─── CTA: course vs physical-only ───
  const ctaHref =
    orderType === "physical"
      ? `${getBaseUrl()}/account/orders`
      : `${getBaseUrl()}/courses`;
  const ctaLabel =
    orderType === "physical"
      ? "Xem đơn hàng →"
      : orderType === "mixed"
        ? "Vào học & xem đơn →"
        : "Vào học ngay →";

  const accessLine =
    orderType === "physical"
      ? "Chúng tôi đã nhận được thanh toán của bạn — đơn hàng đang được xử lý và giao đến địa chỉ của bạn."
      : orderType === "mixed"
        ? "Chúng tôi đã nhận được thanh toán của bạn — quyền truy cập khoá học đã kích hoạt và sản phẩm vật lý đang được chuẩn bị giao đến bạn."
        : "Chúng tôi đã nhận được thanh toán của bạn và quyền truy cập đã được kích hoạt.";

  return sesSendEmail(
    to,
    `✅ Xác nhận thanh toán — ${escapeHtml(productName)}`,
    baseTemplate(`
      <h1>Thanh toán thành công! 🎉</h1>
      <p>Xin chào <span class="highlight">${escapeHtml(name)}</span>,</p>
      <p>${accessLine}</p>
      <div style="background:#222;border:1px solid #333;border-radius:8px;padding:16px;margin:20px 0;">
        <div style="color:#6b7280;font-size:12px;margin-bottom:4px;">Sản phẩm</div>
        <div style="color:#fff;font-weight:600;font-size:15px;margin-bottom:12px;">${escapeHtml(productName)}</div>
        <div style="color:#6b7280;font-size:12px;margin-bottom:4px;">Số tiền</div>
        <div style="color:#D4A843;font-weight:700;font-size:18px;margin-bottom:12px;">${escapeHtml(formattedAmount)}</div>
        <div style="color:#6b7280;font-size:12px;margin-bottom:4px;">Mã đơn hàng</div>
        <div style="color:#9ca3af;font-family:monospace;font-size:13px;">DK${escapeHtml(orderCode)}</div>
      </div>
      ${shippingSection}
      <a href="${ctaHref}" class="btn">${ctaLabel}</a>
      <div class="divider"></div>
      <p style="margin:0;font-size:13px;color:#6b7280;">Giữ email này làm biên lai. Nếu có vấn đề gì, reply email này để được hỗ trợ trong 24h.</p>
    `),
  );
}

export async function sendWeeklyNewsletter(
  to: string,
  name: string,
  subject: string,
  body: string,
) {
  return sesSendEmail(
    to,
    subject,
    baseTemplate(`
      <h1>${escapeHtml(subject)}</h1>
      <p>Xin chào <span class="highlight">${escapeHtml(name)}</span>,</p>
      ${body}
      <div class="divider"></div>
      <p style="margin:0;font-size:13px;color:#6b7280;">— Lê Đăng Khương<br/>
      <a href="${getBaseUrl()}" style="color:#D4A843;">${getSiteDomain()}</a></p>
    `),
  );
}

export async function sendLessonCompleteNudge(
  to: string,
  name: string,
  nextLessonTitle: string,
  courseUrl: string,
) {
  return sesSendEmail(
    to,
    `🔥 Tiếp tục đà học tập — bài tiếp theo đang chờ bạn!`,
    baseTemplate(`
      <h1>Bạn đang làm rất tốt, ${escapeHtml(name)}! 💪</h1>
      <p>Bạn đã hoàn thành bài học trước. Tiếp tục ngay để giữ đà học tập!</p>
      <div style="background:#222;border:1px solid rgba(212,168,67,0.2);border-radius:8px;padding:16px;margin:20px 0;">
        <div style="color:#6b7280;font-size:12px;margin-bottom:6px;">Bài tiếp theo</div>
        <div style="color:#fff;font-weight:600;">${escapeHtml(nextLessonTitle)}</div>
      </div>
      <a href="${escapeHtml(courseUrl)}" class="btn">Tiếp tục học →</a>
      <div class="divider"></div>
      <p style="margin:0;font-size:13px;color:#6b7280;">
        Nhất quán mỗi ngày — đó là bí quyết thực sự. Chỉ 20 phút hôm nay!
      </p>
    `),
  );
}

/**
 * Email gửi cho khách hàng vừa CK thành công NHƯNG chưa có tài khoản trước đó.
 * Sepay webhook auto-tạo account → email này thông báo + đính kèm link set password.
 */
export async function sendAutoAccountEmail(
  to: string,
  name: string,
  setPasswordLink: string,
  productName: string,
  orderCode: string,
) {
  return sesSendEmail(
    to,
    `🎉 Tài khoản mới của bạn — Đặt mật khẩu để vào học`,
    baseTemplate(`
      <h1>Chào mừng bạn đến với Lê Đăng Khương Academy! 🎉</h1>
      <p>Xin chào <span class="highlight">${escapeHtml(name)}</span>,</p>
      <p>Cảm ơn bạn đã đăng ký khoá <strong>${escapeHtml(productName)}</strong>!
      Chúng tôi đã <strong>tự động tạo tài khoản</strong> cho bạn vì bạn chưa đăng ký trước khi thanh toán.</p>

      <div style="background:#fef3c7;border-left:4px solid #D4A843;padding:14px 18px;border-radius:8px;margin:20px 0;">
        <p style="margin:0 0 6px;font-size:13px;color:#92400e;"><strong>Thông tin tài khoản của bạn:</strong></p>
        <p style="margin:4px 0;font-size:14px;color:#1f2937;">📧 Email đăng nhập: <strong>${escapeHtml(to)}</strong></p>
        <p style="margin:4px 0;font-size:14px;color:#1f2937;">🧾 Mã đơn hàng: <strong>${escapeHtml(orderCode)}</strong></p>
      </div>

      <p><strong>Bước 1:</strong> Bấm nút bên dưới để đặt mật khẩu cho tài khoản:</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${escapeHtml(setPasswordLink)}" class="btn">🔑 Đặt mật khẩu để đăng nhập →</a>
      </div>

      <p><strong>Bước 2:</strong> Sau khi đặt mật khẩu xong, đăng nhập tại
      <a href="${escapeHtml(getBaseUrl())}/login" style="color:#D4A843;">${escapeHtml(getBaseUrl())}/login</a>
      bằng email <strong>${escapeHtml(to)}</strong> và mật khẩu bạn vừa đặt.</p>

      <p><strong>Bước 3:</strong> Vào khoá học bạn vừa mua và bắt đầu học! 🚀</p>

      <div class="divider"></div>
      <p style="font-size:12px;color:#6b7280;">Link đặt mật khẩu hết hạn sau 1 giờ. Nếu hết hạn, vào
      <a href="${escapeHtml(getBaseUrl())}/forgot-password" style="color:#D4A843;">${escapeHtml(getBaseUrl())}/forgot-password</a>
      để gửi lại link mới.</p>
      <p style="margin:8px 0 0;font-size:12px;color:#4b5563;">Nếu nút không hoạt động, copy link sau vào trình duyệt:<br/>
      <a href="${escapeHtml(setPasswordLink)}" style="color:#D4A843;word-break:break-all;font-size:11px;">${escapeHtml(setPasswordLink)}</a></p>
    `),
  );
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetLink: string,
) {
  return sesSendEmail(
    to,
    `🔑 Đặt lại mật khẩu — Lê Đăng Khương Academy`,
    baseTemplate(`
      <h1>Đặt lại mật khẩu</h1>
      <p>Xin chào <span class="highlight">${escapeHtml(name)}</span>,</p>
      <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Bấm nút bên dưới để tạo mật khẩu mới:</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${escapeHtml(resetLink)}" class="btn">Đặt lại mật khẩu →</a>
      </div>
      <p style="font-size:13px;color:#6b7280;">Link này sẽ hết hạn sau 1 giờ. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
      <div class="divider"></div>
      <p style="margin:0;font-size:12px;color:#4b5563;">Nếu nút không hoạt động, copy và dán link sau vào trình duyệt:<br/>
      <a href="${escapeHtml(resetLink)}" style="color:#D4A843;word-break:break-all;font-size:11px;">${escapeHtml(resetLink)}</a></p>
    `),
  );
}

export async function sendEventReminder(
  to: string,
  name: string,
  eventTitle: string,
  eventTime: string,
  joinUrl: string,
) {
  return sesSendEmail(
    to,
    `⏰ Nhắc nhở: "${escapeHtml(eventTitle)}" bắt đầu trong 1 tiếng!`,
    baseTemplate(`
      <h1>Sắp đến giờ rồi! ⏰</h1>
      <p>Xin chào <span class="highlight">${escapeHtml(name)}</span>,</p>
      <p>Sự kiện bạn đã đăng ký sắp bắt đầu:</p>
      <div style="background:#222;border:1px solid #333;border-radius:8px;padding:16px;margin:20px 0;">
        <div style="color:#fff;font-weight:600;font-size:15px;margin-bottom:8px;">${escapeHtml(eventTitle)}</div>
        <div style="color:#D4A843;font-size:13px;">🕐 ${escapeHtml(eventTime)}</div>
      </div>
      <a href="${escapeHtml(joinUrl)}" class="btn">Tham gia ngay →</a>
      <div class="divider"></div>
      <p style="margin:0;font-size:13px;color:#6b7280;">Hẹn gặp bạn ở đó!</p>
    `),
  );
}

export async function sendAffiliateCommissionEmail(
  to: string,
  name: string,
  productName: string,
  commissionAmount: number,
) {
  const formatted = commissionAmount.toLocaleString("vi-VN") + "₫";
  return sesSendEmail(
    to,
    `Bạn vừa nhận hoa hồng ${escapeHtml(formatted)} — Lê Đăng Khương Academy`,
    baseTemplate(`
      <h1>Chúc mừng, ${escapeHtml(name)}!</h1>
      <p>Một khách hàng vừa mua <span class="highlight">${escapeHtml(productName)}</span> qua link giới thiệu của bạn.</p>
      <div style="background:#222;border:1px solid rgba(212,168,67,0.2);border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
        <div style="color:#6b7280;font-size:12px;margin-bottom:6px;">Hoa hồng nhận được</div>
        <div style="color:#D4A843;font-weight:700;font-size:26px;">${escapeHtml(formatted)}</div>
      </div>
      <p>Khoản hoa hồng đang chờ duyệt. Bạn có thể theo dõi chi tiết tại trang Affiliate.</p>
      <a href="${getBaseUrl()}/dashboard/affiliate" class="btn">Xem Affiliate Dashboard →</a>
      <div class="divider"></div>
      <p style="margin:0;font-size:13px;color:#6b7280;">Tiếp tục chia sẻ link giới thiệu để nhận thêm hoa hồng!</p>
    `),
  );
}

export async function sendLoginNotificationEmail(
  to: string,
  name: string,
  ip: string,
  userAgent: string,
  loginTime: string,
) {
  // Parse browser/OS from user-agent (simplified)
  let browser = "Không xác định";
  let os = "Không xác định";

  if (userAgent) {
    if (userAgent.includes("Chrome")) browser = "Chrome";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Safari")) browser = "Safari";
    else if (userAgent.includes("Edge")) browser = "Edge";

    if (userAgent.includes("Windows")) os = "Windows";
    else if (userAgent.includes("Mac")) os = "macOS";
    else if (userAgent.includes("Linux")) os = "Linux";
    else if (userAgent.includes("Android")) os = "Android";
    else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";
  }

  return sesSendEmail(
    to,
    `🔐 Đăng nhập mới vào tài khoản của bạn`,
    baseTemplate(`
      <h1>Phát hiện đăng nhập mới 🔐</h1>
      <p>Xin chào <span class="highlight">${escapeHtml(name)}</span>,</p>
      <p>Tài khoản của bạn vừa được đăng nhập thành công từ một thiết bị:</p>
      <div style="background:#222;border:1px solid #333;border-radius:8px;padding:16px;margin:20px 0;">
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
          <span style="color:#6b7280;font-size:12px;">Thời gian</span>
          <span style="color:#fff;font-size:13px;">${escapeHtml(loginTime)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
          <span style="color:#6b7280;font-size:12px;">Trình duyệt</span>
          <span style="color:#fff;font-size:13px;">${escapeHtml(browser)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
          <span style="color:#6b7280;font-size:12px;">Hệ điều hành</span>
          <span style="color:#fff;font-size:13px;">${escapeHtml(os)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#6b7280;font-size:12px;">Địa chỉ IP</span>
          <span style="color:#9ca3af;font-family:monospace;font-size:13px;">${escapeHtml(ip)}</span>
        </div>
      </div>
      <p>Nếu đây là bạn, không cần làm gì thêm.</p>
      <p style="color:#ef4444;font-weight:600;">Nếu không phải bạn, hãy đổi mật khẩu ngay:</p>
      <a href="${getBaseUrl()}/forgot-password" class="btn">Đổi mật khẩu →</a>
      <div class="divider"></div>
      <p style="margin:0;font-size:12px;color:#4b5563;">Email này được gửi tự động mỗi khi có đăng nhập mới để bảo vệ tài khoản của bạn.</p>
    `),
  );
}

export async function sendVerificationEmail(to: string, name: string, confirmUrl: string) {
  const html = baseTemplate(`
    <h1>Xin chào ${escapeHtml(name)}! 👋</h1>
    <p>Cảm ơn bạn đã đăng ký tài khoản tại <span class="highlight">Lê Đăng Khương Academy</span>.</p>
    <p>Vui lòng nhấn nút bên dưới để xác thực địa chỉ email và kích hoạt tài khoản của bạn:</p>
    <p style="text-align:center; margin:24px 0;">
      <a href="${escapeHtml(confirmUrl)}" class="btn">Xác thực tài khoản</a>
    </p>
    <p style="font-size:12px; color:#6b7280;">Nếu nút không hoạt động, bạn có thể copy đường link sau vào trình duyệt:<br/>
    <a href="${escapeHtml(confirmUrl)}" style="color:#D4A843; word-break:break-all; font-size:11px;">${escapeHtml(confirmUrl)}</a></p>
    <div class="divider"></div>
    <p style="font-size:12px; color:#6b7280; margin:0;">Link xác thực có hiệu lực trong 24 giờ. Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.</p>
  `);

  return sesSendEmail(
    to,
    "Xác thực tài khoản Lê Đăng Khương Academy",
    html,
  );
}

export async function sendEnrollmentWelcomeEmail(
  to: string,
  name: string,
  courseName: string,
  courseSlug: string,
) {
  const courseUrl = `${getBaseUrl()}/courses/${courseSlug}`;
  return sesSendEmail(
    to,
    `Chào mừng bạn đến với khoá học ${escapeHtml(courseName)}! 🎓`,
    baseTemplate(`
      <h1>Chào mừng bạn đến với khoá học! 🎓</h1>
      <p>Xin chào <span class="highlight">${escapeHtml(name)}</span>,</p>
      <p>Chúc mừng bạn đã đăng ký thành công khoá học <strong style="color:#fff;">${escapeHtml(courseName)}</strong>!</p>
      <p>Quyền truy cập của bạn đã được kích hoạt. Bắt đầu học ngay để nắm vững kiến thức và kỹ năng mới.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${escapeHtml(courseUrl)}" style="display:inline-block;padding:14px 32px;background:#FFD814;color:#0a0a0a;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Bắt đầu học ngay →</a>
      </div>
      <div class="divider"></div>
      <p style="margin:0;font-size:13px;color:#6b7280;">Nếu bạn có bất kỳ câu hỏi nào, chỉ cần reply email này — chúng tôi sẽ hỗ trợ bạn.</p>
      <p style="margin:8px 0 0; color:#6b7280; font-size:13px;">— Lê Đăng Khương</p>
    `),
  );
}

export async function sendQuestionReplyEmail(
  to: string,
  name: string,
  questionContent: string,
  replyContent: string,
  staffName: string,
  courseName?: string,
) {
  const courseContext = courseName
    ? `<div style="color:#6b7280;font-size:12px;margin-bottom:6px;">Khoá học: <span style="color:#3b82f6;">${escapeHtml(courseName)}</span></div>`
    : "";

  return sesSendEmail(
    to,
    `Câu hỏi của bạn đã được trả lời — ${getSiteName()}`,
    baseTemplate(`
      <h1>Câu hỏi của bạn đã được trả lời! 💬</h1>
      <p>Xin chào <span class="highlight">${escapeHtml(name)}</span>,</p>
      <p>Đội ngũ hỗ trợ đã phản hồi câu hỏi của bạn:</p>
      <div style="background:#222;border:1px solid #333;border-radius:8px;padding:16px;margin:20px 0;">
        ${courseContext}
        <div style="color:#6b7280;font-size:12px;margin-bottom:6px;">Câu hỏi của bạn</div>
        <div style="color:#9ca3af;font-size:14px;line-height:1.6;margin-bottom:16px;border-left:3px solid #333;padding-left:12px;">${escapeHtml(questionContent).substring(0, 300)}${questionContent.length > 300 ? "..." : ""}</div>
        <div style="height:1px;background:#333;margin:12px 0;"></div>
        <div style="color:#D4A843;font-size:12px;margin-bottom:6px;">Phản hồi từ ${escapeHtml(staffName)}</div>
        <div style="color:#fff;font-size:14px;line-height:1.6;">${escapeHtml(replyContent)}</div>
      </div>
      <p>Nếu bạn cần thêm hỗ trợ, hãy đặt câu hỏi trực tiếp trong bài học hoặc reply email này.</p>
      <a href="${getBaseUrl()}/courses" class="btn">Tiếp tục học →</a>
      <div class="divider"></div>
      <p style="margin:0;font-size:13px;color:#6b7280;">— ${getSiteName()}</p>
    `),
  );
}

export async function sendCourseCompletionEmail(
  to: string,
  name: string,
  courseName: string,
  courseSlug: string,
) {
  const certificateUrl = `${getBaseUrl()}/certificate/${courseSlug}`;
  return sesSendEmail(
    to,
    `Chúc mừng! Bạn đã hoàn thành khoá học ${escapeHtml(courseName)} 🏆`,
    baseTemplate(`
      <h1>Chúc mừng, ${escapeHtml(name)}! 🏆</h1>
      <p>Bạn đã hoàn thành <strong style="color:#fff;">tất cả bài học</strong> trong khoá học <span class="highlight">${escapeHtml(courseName)}</span>.</p>
      <p>Đây là một thành tích tuyệt vời — hãy tự hào về bản thân mình!</p>
      <div style="background:#222;border:1px solid rgba(212,168,67,0.2);border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
        <div style="font-size:40px;margin-bottom:8px;">🎉</div>
        <div style="color:#D4A843;font-weight:700;font-size:18px;">Hoàn thành xuất sắc!</div>
        <div style="color:#9ca3af;font-size:13px;margin-top:4px;">${escapeHtml(courseName)}</div>
      </div>
      <p>Chứng chỉ hoàn thành khoá học của bạn đã sẵn sàng:</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${escapeHtml(certificateUrl)}" style="display:inline-block;padding:14px 32px;background:#FFD814;color:#0a0a0a;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Xem chứng chỉ →</a>
      </div>
      <div class="divider"></div>
      <p style="margin:0;font-size:13px;color:#6b7280;">Tiếp tục hành trình học tập — khám phá thêm các khoá học khác tại <a href="${getBaseUrl()}/courses" style="color:#D4A843;">${getSiteDomain()}/courses</a></p>
    `),
  );
}
