/**
 * Email templates for the "AI Make More Money & Freedom" event
 * (3 Zoom sessions on 12-14/06/2026)
 *
 * Public API:
 *   - welcomeEmail(tier, name)
 *   - reminderD1Email(tier, name, sessionNum)
 *   - reminderT1hEmail(tier, name, sessionNum)
 *   - recapEmail(tier, name, sessionNum)
 *   - eventCompleteEmail(tier, name)
 *
 * Each returns { subject, html }.
 *
 * Design intent: dark theme matches dangkhuong.com / Lê Đăng Khương Academy
 * (gold #D4A843 accent, #0a0a0a bg, #1a1a1a card). Keep inline CSS only —
 * Gmail / Outlook strip <style> blocks unreliably.
 */

export type AimmTier = "free" | "vip" | "vvip";
export type SessionNum = 1 | 2 | 3;

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://dangkhuong.com";
const ZALO_GROUP = "https://zalo.me/g/l4qmpdq934rmst9xxnfj";
const LANDING = `${BASE_URL}/aimakemoremoney`;
const DASHBOARD = `${BASE_URL}/dashboard`;
const COURSE_SLUGS = {
  free: "ai-make-more-money-free",
  vip: "ai-make-more-money-vip",
  vvip: "ai-make-more-money-vvip",
} as const;

const SESSIONS: Record<
  SessionNum,
  { title: string; dayLabel: string; date: string; time: string }
> = {
  1: {
    title: "Tư Duy Đúng & 10 Nguồn Thu Nhập Từ AI 2026",
    dayLabel: "Thứ 6",
    date: "12/06/2026",
    time: "20:00 – 22:00",
  },
  2: {
    title: "Video & Kênh Triệu View — Kiếm Tiền Từ Affiliate",
    dayLabel: "Thứ 7",
    date: "13/06/2026",
    time: "20:00 – 22:00",
  },
  3: {
    title: "Chuyển Đổi Khách Thành Tiền & Hệ Thống Tự Động",
    dayLabel: "Chủ Nhật",
    date: "14/06/2026",
    time: "20:00 – 22:00",
  },
};

const TIER_LABEL: Record<AimmTier, string> = {
  free: "Vé FREE",
  vip: "Vé VIP",
  vvip: "Vé VVIP",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/* ─── Shared chrome ────────────────────────────────────────────── */

function wrap(content: string, preheader: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <span style="display:none;font-size:1px;color:#0a0a0a;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</span>
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
      <div style="width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,#D4A843,#B8922E);color:#0a0a0a;font-weight:800;font-size:13px;display:inline-flex;align-items:center;justify-content:center;">LĐK</div>
      <div style="color:#fff;font-weight:700;font-size:16px;">Lê Đăng Khương Academy</div>
    </div>
    <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:14px;padding:28px 24px;">
      ${content}
    </div>
    <div style="color:#4b5563;font-size:12px;text-align:center;margin-top:20px;line-height:1.6;">
      © ${new Date().getFullYear()} Lê Đăng Khương Academy · <a href="${BASE_URL}" style="color:#4b5563;text-decoration:underline;">dangkhuong.com</a><br/>
      Bạn nhận email này vì đã đăng ký <strong>AI Make More Money &amp; Freedom</strong>.<br/>
      <a href="${BASE_URL}/unsubscribe" style="color:#4b5563;">Huỷ nhận email từ chương trình này</a>
    </div>
  </div>
</body>
</html>`;
}

function ctaButton(href: string, label: string, color = "#D4A843"): string {
  return `<a href="${href}" style="display:inline-block;background:${color};color:#0a0a0a;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;">${escapeHtml(label)}</a>`;
}

function sessionRow(num: SessionNum, opts?: { highlight?: boolean }): string {
  const s = SESSIONS[num];
  const bg = opts?.highlight
    ? "background:rgba(212,168,67,0.08);border:1px solid rgba(212,168,67,0.3);"
    : "background:#111;border:1px solid #2a2a2a;";
  return `<div style="${bg}border-radius:10px;padding:14px 16px;margin-bottom:10px;">
    <div style="color:#D4A843;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;">BUỔI ${num} · ${escapeHtml(s.dayLabel)} ${escapeHtml(s.date)} · ${escapeHtml(s.time)}</div>
    <div style="color:#fff;font-weight:700;font-size:15px;margin-top:4px;">${escapeHtml(s.title)}</div>
  </div>`;
}

function divider(): string {
  return `<div style="height:1px;background:#2a2a2a;margin:20px 0;"></div>`;
}

function tierBadge(tier: AimmTier): string {
  const colors: Record<AimmTier, string> = {
    free: "#6b7280",
    vip: "#D4A843",
    vvip: "#22c55e",
  };
  return `<span style="display:inline-block;padding:3px 10px;border-radius:99px;background:${colors[tier]}1f;color:${colors[tier]};border:1px solid ${colors[tier]}55;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;">${TIER_LABEL[tier]}</span>`;
}

function zaloCallout(): string {
  return `<div style="background:rgba(0,104,255,0.08);border:1px solid rgba(0,104,255,0.3);border-radius:10px;padding:14px 16px;margin:18px 0;">
    <div style="color:#fff;font-weight:700;font-size:14px;margin-bottom:6px;">💬 Tham gia nhóm Zalo (quan trọng!)</div>
    <div style="color:#9ca3af;font-size:13px;line-height:1.6;margin-bottom:10px;">Link Zoom 3 buổi sẽ được gửi qua nhóm Zalo trước mỗi buổi 30 phút.</div>
    ${ctaButton(ZALO_GROUP, "Vào nhóm Zalo ngay", "#0068ff")}
  </div>`;
}

/* ─── 1. Welcome (sent immediately on registration) ──────────── */

export function welcomeEmail(
  tier: AimmTier,
  name: string
): { subject: string; html: string } {
  const subject = `🎉 Chào mừng ${name} — đăng ký AI Make More Money & Freedom thành công`;
  const courseUrl = `${BASE_URL}/courses/${COURSE_SLUGS[tier]}`;

  const tierSpecific: Record<AimmTier, string> = {
    free: `
      <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 12px;">Vé Free cho bạn quyền tham gia <strong style="color:#fff;">trực tiếp cả 3 buổi Zoom</strong> + nhận quà cẩm nang trị giá <span style="color:#22c55e;font-weight:600;">2.990.000đ</span>.</p>
      <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 12px;"><strong style="color:#facc15;">⚠️ Lưu ý:</strong> vé Free <strong style="color:#fff;">không có video xem lại</strong> — nếu bỏ lỡ buổi nào, bạn sẽ mất buổi đó. Muốn xem replay vĩnh viễn, anh/chị có thể <a href="${LANDING}#tickets" style="color:#D4A843;text-decoration:underline;">nâng cấp lên VIP (99k)</a> hoặc VVIP (499k).</p>
    `,
    vip: `
      <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 12px;">Vé VIP của bạn đã được kích hoạt. Bạn có quyền truy cập <strong style="color:#fff;">video xem lại vĩnh viễn</strong> + bộ slide PDF từng buổi + ưu tiên đặt câu hỏi trong Q&amp;A.</p>
      <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 12px;">Sau mỗi buổi học, video replay sẽ được cập nhật trong vòng 24h vào trang khoá học của bạn.</p>
    `,
    vvip: `
      <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 12px;">Vé VVIP — suất gần Thầy Khương nhất — đã được kích hoạt. Bạn có toàn bộ quyền lợi của VIP + <strong style="color:#22c55e;">30 phút coaching 1-1 trực tiếp</strong> với Lê Đăng Khương + AI Agent Starter Kit.</p>
      <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 12px;"><strong style="color:#D4A843;">📅 Link đặt lịch coaching 1-1</strong> sẽ được gửi qua email riêng sau Buổi 3 (Chủ Nhật 14/06). Hãy giữ lịch trống tuần sau!</p>
    `,
  };

  const content = `
    <div style="margin-bottom:16px;">${tierBadge(tier)}</div>
    <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 14px;line-height:1.3;">Chào ${escapeHtml(name)}, chào mừng đến với <span style="color:#D4A843;">AI Make More Money &amp; Freedom</span> 🚀</h1>
    ${tierSpecific[tier]}
    ${divider()}
    <div style="color:#fff;font-weight:700;font-size:14px;margin-bottom:10px;">📅 Lịch 3 buổi học</div>
    ${sessionRow(1)}
    ${sessionRow(2)}
    ${sessionRow(3)}
    ${zaloCallout()}
    <div style="text-align:center;margin-top:20px;">
      ${ctaButton(courseUrl, "Vào trang khoá học của tôi")}
    </div>
    <p style="color:#6b7280;font-size:12px;line-height:1.6;margin-top:20px;text-align:center;">Có vấn đề gì? Trả lời thẳng email này — em sẽ hỗ trợ trong 24h.</p>
  `;
  return { subject, html: wrap(content, `Đăng ký thành công ${TIER_LABEL[tier]} — 3 buổi 12-14/06`) };
}

/* ─── 2. D-1 Reminder (12:00 the day before each session) ────── */

export function reminderD1Email(
  tier: AimmTier,
  name: string,
  sessionNum: SessionNum
): { subject: string; html: string } {
  const s = SESSIONS[sessionNum];
  const subject = `⏰ Ngày mai 20:00 — Buổi ${sessionNum}: ${s.title}`;

  const content = `
    <div style="margin-bottom:16px;">${tierBadge(tier)}</div>
    <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 14px;line-height:1.3;">${escapeHtml(name)}, ngày mai 20:00 mình gặp nhau ở Zoom 🎯</h1>
    <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 16px;">Buổi <strong style="color:#D4A843;">${sessionNum} / 3</strong> sẽ diễn ra tối <strong style="color:#fff;">${escapeHtml(s.dayLabel)}, ${escapeHtml(s.date)}</strong> lúc <strong style="color:#fff;">${escapeHtml(s.time)}</strong>.</p>
    ${sessionRow(sessionNum, { highlight: true })}
    <div style="color:#fff;font-weight:700;font-size:14px;margin:18px 0 10px;">📝 Chuẩn bị trước buổi học</div>
    <ul style="color:#9ca3af;font-size:13px;line-height:1.7;margin:0 0 16px;padding-left:20px;">
      <li>Notebook + bút để ghi chú</li>
      <li>Máy tính có kết nối Internet ổn định</li>
      <li>Tinh thần học hỏi mở &amp; sẵn sàng áp dụng ngay</li>
    </ul>
    ${zaloCallout()}
    <p style="color:#6b7280;font-size:13px;line-height:1.6;margin-top:18px;"><strong style="color:#facc15;">Link Zoom</strong> sẽ được gửi qua nhóm Zalo + email <strong style="color:#fff;">trước buổi 30 phút</strong>. Đảm bảo bạn đã vào nhóm Zalo!</p>
  `;
  return { subject, html: wrap(content, `Buổi ${sessionNum} diễn ra tối mai 20:00`) };
}

/* ─── 3. T-1h Reminder (19:00 the day of each session) ─────── */

export function reminderT1hEmail(
  tier: AimmTier,
  name: string,
  sessionNum: SessionNum
): { subject: string; html: string } {
  const s = SESSIONS[sessionNum];
  const subject = `🔥 Còn 1 tiếng nữa — Buổi ${sessionNum}: ${s.title}`;

  const content = `
    <div style="margin-bottom:16px;">${tierBadge(tier)}</div>
    <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 14px;line-height:1.3;">${escapeHtml(name)}, <span style="color:#D4A843;">còn 1 tiếng nữa</span> — Buổi ${sessionNum} bắt đầu! ⚡</h1>
    <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 16px;">Đúng <strong style="color:#fff;">20:00 tối nay</strong>, mình sẽ cùng nhau khai mạc Buổi ${sessionNum} trên Zoom.</p>
    ${sessionRow(sessionNum, { highlight: true })}
    <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.3);border-radius:10px;padding:14px 16px;margin:18px 0;">
      <div style="color:#fff;font-weight:700;font-size:14px;margin-bottom:6px;">✅ Checklist 5 phút trước buổi</div>
      <ul style="color:#9ca3af;font-size:13px;line-height:1.7;margin:0;padding-left:20px;">
        <li>Vào nhóm Zalo — link Zoom được pin ở đầu nhóm</li>
        <li>Tắt thông báo &amp; chuẩn bị nơi yên tĩnh</li>
        <li>Test mic + camera Zoom</li>
        <li>Có sẵn notebook để ghi chú</li>
      </ul>
    </div>
    <div style="text-align:center;margin-top:20px;">
      ${ctaButton(ZALO_GROUP, "Vào nhóm Zalo lấy link Zoom", "#0068ff")}
    </div>
  `;
  return { subject, html: wrap(content, `Buổi ${sessionNum} bắt đầu lúc 20:00 — còn 1h`) };
}

/* ─── 4. Recap (after each session, ~22:30) ───────────────────── */

export function recapEmail(
  tier: AimmTier,
  name: string,
  sessionNum: SessionNum
): { subject: string; html: string } {
  const s = SESSIONS[sessionNum];
  const isLast = sessionNum === 3;
  const subject = isLast
    ? `🎉 Đã xong 3 buổi — cảm ơn ${name} đã đồng hành!`
    : `💎 Cảm ơn ${name} — Buổi ${sessionNum} đã kết thúc, hẹn buổi tiếp theo`;

  const courseUrl = `${BASE_URL}/courses/${COURSE_SLUGS[tier]}`;

  const replayBlock =
    tier === "free"
      ? `<div style="background:rgba(212,168,67,0.06);border:1px solid rgba(212,168,67,0.25);border-radius:10px;padding:14px 16px;margin:18px 0;">
          <div style="color:#fff;font-weight:700;font-size:14px;margin-bottom:6px;">📺 Bỏ lỡ buổi? Muốn xem lại?</div>
          <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0 0 10px;">Vé Free không có replay. <strong style="color:#fff;">Nâng cấp lên VIP (99k)</strong> để có video xem lại vĩnh viễn cả 3 buổi + slide PDF.</p>
          ${ctaButton(`${LANDING}#tickets`, "Nâng cấp VIP — chỉ 99k")}
        </div>`
      : `<div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.3);border-radius:10px;padding:14px 16px;margin:18px 0;">
          <div style="color:#fff;font-weight:700;font-size:14px;margin-bottom:6px;">🎬 Video xem lại Buổi ${sessionNum}</div>
          <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0 0 10px;">Replay sẽ được cập nhật vào trang khoá học của bạn <strong style="color:#fff;">trong vòng 24h</strong>. Bạn xem lại vĩnh viễn — học bao nhiêu lần tuỳ thích.</p>
          ${ctaButton(courseUrl, "Mở khoá học của tôi")}
        </div>`;

  const nextSessionBlock = !isLast
    ? `<div style="color:#fff;font-weight:700;font-size:14px;margin:18px 0 10px;">👉 Buổi tiếp theo</div>${sessionRow((sessionNum + 1) as SessionNum, { highlight: true })}`
    : "";

  const closingBlock = isLast
    ? `<div style="margin:24px 0 0;text-align:center;">
        <h2 style="color:#D4A843;font-size:18px;font-weight:800;margin:0 0 8px;">🚀 Bắt đầu hành trình của bạn ngay tuần này!</h2>
        <p style="color:#9ca3af;font-size:13px;line-height:1.7;margin:0 0 14px;">3 buổi đã cho bạn bản đồ. Bước tiếp theo là <strong style="color:#fff;">áp dụng</strong>. Em hẹn gặp bạn trong cộng đồng — chia sẻ kết quả nhé!</p>
        ${ctaButton(DASHBOARD, "Vào dashboard của tôi")}
      </div>`
    : "";

  const content = `
    <div style="margin-bottom:16px;">${tierBadge(tier)}</div>
    <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 14px;line-height:1.3;">Cảm ơn ${escapeHtml(name)} đã tham gia <span style="color:#D4A843;">Buổi ${sessionNum}</span> 🙏</h1>
    <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 16px;">Hi vọng bạn đã có những insight giá trị từ buổi <strong style="color:#fff;">"${escapeHtml(s.title)}"</strong>.</p>
    ${replayBlock}
    ${nextSessionBlock}
    ${closingBlock}
  `;
  return { subject, html: wrap(content, `Cảm ơn đã tham gia Buổi ${sessionNum}`) };
}

/* ─── 5. Event Complete (D+1 morning) ────────────────────────── */

export function eventCompleteEmail(
  tier: AimmTier,
  name: string
): { subject: string; html: string } {
  const subject = `🎁 ${name}, đây là bước tiếp theo của bạn sau AI Make More Money`;
  const courseUrl = `${BASE_URL}/courses/${COURSE_SLUGS[tier]}`;

  const upgradeBlock: Record<AimmTier, string> = {
    free: `
      <h2 style="color:#fff;font-size:18px;font-weight:800;margin:18px 0 10px;">🚀 Muốn xem lại 3 buổi vừa qua?</h2>
      <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 14px;">Vé Free đã hết quyền truy cập video. Nếu bạn muốn <strong style="color:#fff;">xem lại + có slide PDF</strong> để học sâu hơn, hãy nâng cấp lên VIP.</p>
      <div style="text-align:center;margin:18px 0;">${ctaButton(`${LANDING}#tickets`, "Nâng cấp VIP — 99k")}</div>
      <p style="color:#6b7280;font-size:12px;text-align:center;line-height:1.6;">Hoặc <a href="${LANDING}#tickets" style="color:#D4A843;text-decoration:underline;">VVIP 499k</a> nếu muốn có thêm coaching 1-1 với Khương.</p>
    `,
    vip: `
      <h2 style="color:#fff;font-size:18px;font-weight:800;margin:18px 0 10px;">🎬 Toàn bộ replay đã sẵn sàng</h2>
      <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 14px;">Cả 3 buổi đã được upload đầy đủ vào trang khoá học VIP của bạn. Xem lại bất cứ lúc nào, slide PDF cũng có sẵn để tải.</p>
      <div style="text-align:center;margin:18px 0;">${ctaButton(courseUrl, "Mở khoá VIP của tôi")}</div>
      <div style="background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.25);border-radius:10px;padding:14px 16px;margin:18px 0;">
        <div style="color:#fff;font-weight:700;font-size:14px;margin-bottom:6px;">💡 Muốn được Khương kèm 1-1?</div>
        <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0 0 10px;">Học viên VIP có ưu đãi đặc biệt nâng cấp lên VVIP — bao gồm 30 phút coaching 1-1 + AI Agent Starter Kit. Reply email này để biết chi tiết.</p>
      </div>
    `,
    vvip: `
      <h2 style="color:#fff;font-size:18px;font-weight:800;margin:18px 0 10px;">📅 Đặt lịch coaching 1-1 với Lê Đăng Khương</h2>
      <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 14px;">Đây là quyền lợi cao nhất của vé VVIP. 30 phút Zoom riêng với Thầy Khương — phân tích case của bạn, lộ trình áp dụng AI riêng, gỡ vướng mắc sâu.</p>
      <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 14px;"><strong style="color:#D4A843;">📌 Link Calendly đặt lịch:</strong> sẽ được gửi qua email riêng trong 24h. Lịch có giới hạn — book sớm để chọn được khung giờ ưng ý.</p>
      <div style="text-align:center;margin:18px 0;">${ctaButton(courseUrl, "Tải AI Agent Starter Kit ngay")}</div>
      <p style="color:#6b7280;font-size:12px;text-align:center;line-height:1.6;">Bao gồm Template Database, Prompt Library &amp; hướng dẫn dựng AI Agent đầu tiên trong 1 ngày.</p>
    `,
  };

  const content = `
    <div style="margin-bottom:16px;">${tierBadge(tier)}</div>
    <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 14px;line-height:1.3;">Chào ${escapeHtml(name)} — chương trình đã khép lại, nhưng hành trình của bạn <span style="color:#D4A843;">vừa bắt đầu</span> ✨</h1>
    <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 12px;">3 buổi vừa qua đã trao cho bạn bản đồ kiếm tiền bằng AI. Bước quan trọng nhất giờ là <strong style="color:#fff;">áp dụng ngay tuần này</strong> — đừng để kiến thức nằm im trên giấy.</p>
    ${upgradeBlock[tier]}
    ${divider()}
    <p style="color:#6b7280;font-size:13px;line-height:1.6;text-align:center;">Cảm ơn bạn đã tin tưởng và đồng hành cùng KOHADA 💛<br/>— Lê Đăng Khương</p>
  `;
  return { subject, html: wrap(content, `Bước tiếp theo sau AI Make More Money`) };
}
