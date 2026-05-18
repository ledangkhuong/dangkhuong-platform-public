/**
 * Abandoned Cart Recovery Email Template
 * Professional dark-themed template matching the brand.
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export function generateAbandonedCartEmail(
  userName: string,
  productName: string,
  productSlug: string,
  totalAmount: number,
): { subject: string; html: string } {
  const formattedAmount = totalAmount.toLocaleString("vi-VN") + "₫";
  const courseUrl = `https://dangkhuong.com/courses/${encodeURIComponent(productSlug)}`;

  const subject = "Bạn quên chưa hoàn tất đơn hàng! 🛒";

  const html = `<!DOCTYPE html>
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
    .btn { display:inline-block; padding:14px 32px; background:#D4A843; color:#fff; border-radius:8px; text-decoration:none; font-weight:700; font-size:15px; }
    .btn:hover { background:#B8922E; }
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
      <h1>Đơn hàng của bạn đang chờ hoàn tất! ⏳</h1>
      <p>Xin chào <span class="highlight">${escapeHtml(userName)}</span>,</p>
      <p>Chúng tôi nhận thấy bạn đã đăng ký khoá học <strong style="color:#fff;">${escapeHtml(productName)}</strong> nhưng chưa hoàn tất thanh toán.</p>
      <div style="background:#222;border:1px solid rgba(212,168,67,0.2);border-radius:8px;padding:16px;margin:20px 0;">
        <div style="color:#6b7280;font-size:12px;margin-bottom:4px;">Khoá học</div>
        <div style="color:#fff;font-weight:600;font-size:15px;margin-bottom:12px;">${escapeHtml(productName)}</div>
        <div style="color:#6b7280;font-size:12px;margin-bottom:4px;">Số tiền</div>
        <div style="color:#D4A843;font-weight:700;font-size:18px;">${escapeHtml(formattedAmount)}</div>
      </div>
      <p>Hoàn tất thanh toán ngay để bắt đầu học và không bỏ lỡ kiến thức quan trọng!</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${escapeHtml(courseUrl)}" class="btn">Hoàn tất đơn hàng →</a>
      </div>
      <p style="font-size:13px;color:#6b7280;text-align:center;">
        ⚡ Đơn hàng sẽ hết hạn trong 24 giờ. Hãy hoàn tất sớm nhất có thể!
      </p>
      <div class="divider"></div>
      <p style="margin:0;font-size:13px;color:#6b7280;">Nếu bạn gặp vấn đề trong quá trình thanh toán, reply email này để được hỗ trợ ngay.</p>
      <p style="margin:8px 0 0; color:#6b7280; font-size:13px;">— Lê Đăng Khương</p>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} Lê Đăng Khương Academy · <a href="https://dangkhuong.com" style="color:#4b5563;">dangkhuong.com</a><br/>
      Bạn nhận email này vì đã tạo đơn hàng tại dangkhuong.com<br/>
      <a href="https://dangkhuong.com/unsubscribe" style="color:#4b5563;">Huỷ đăng ký</a>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}
