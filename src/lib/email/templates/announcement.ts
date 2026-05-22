/**
 * Announcement Email Template
 * Dark theme with gold accents, matching the transactional email style.
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export function announcementEmailHtml(
  content: string,
  siteName: string,
  baseUrl: string
): string {
  const siteDomain = (() => {
    try {
      return new URL(baseUrl).hostname;
    } catch {
      return "dangkhuong.com";
    }
  })();

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
    .announcement-content { color:#d1d5db; font-size:15px; line-height:1.8; margin:0 0 24px; white-space:pre-wrap; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="logo">
      <div class="logo-icon">LĐK</div>
      <div class="logo-text">${escapeHtml(siteName)}</div>
    </div>
    <div class="card">
      <h1>Thông báo mới từ <span class="highlight">${escapeHtml(siteName)}</span></h1>
      <div class="divider"></div>
      <div class="announcement-content">${escapeHtml(content)}</div>
      <a href="${escapeHtml(baseUrl)}/community" class="btn">Xem cộng đồng →</a>
      <div class="divider"></div>
      <p style="margin:0; color:#6b7280; font-size:13px;">Bạn nhận email này vì bạn là học viên tại ${escapeHtml(siteName)}.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} ${escapeHtml(siteName)} &middot; <a href="${escapeHtml(baseUrl)}" style="color:#4b5563;">${escapeHtml(siteDomain)}</a><br/>
      <a href="${escapeHtml(baseUrl)}/unsubscribe" style="color:#4b5563;">Huỷ đăng ký</a>
    </div>
  </div>
</body>
</html>`;
}
