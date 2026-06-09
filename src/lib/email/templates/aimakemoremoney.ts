/**
 * Email templates for the "AI Make More Money & Freedom" event series.
 *
 * Date-agnostic on purpose — Lê Đăng Khương runs this event repeatedly,
 * so the body text refers to "Buổi 1 / 2 / 3" and relative times
 * ("tối mai", "còn 1 tiếng") instead of hardcoded calendar dates. The
 * cron schedule (api/cron/aimakemoremoney) is the only place that
 * knows the actual run dates — update those when running a new cohort.
 *
 * Public API:
 *   - welcomeEmail(tier, name)
 *   - reminderD1Email(tier, name, sessionNum)
 *   - reminderT1hEmail(tier, name, sessionNum)
 *   - recapEmail(tier, name, sessionNum)
 *   - eventCompleteEmail(tier, name)
 *
 * Each returns { subject, html }. The `name` parameter is injected
 * directly (HTML-escaped) — there is no `{name}` placeholder string in
 * the rendered output.
 */

export type AimmTier = "free" | "vip" | "vvip";
export type SessionNum = 1 | 2 | 3;

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://dangkhuong.com";
const ZALO_GROUP = "https://zalo.me/g/l4qmpdq934rmst9xxnfj";
const DASHBOARD = `${BASE_URL}/dashboard`;
const SESSION_TIME = "20:00 – 22:00";
const COURSE_SLUGS = {
  free: "ai-make-more-money-free",
  vip: "ai-make-more-money-vip",
  vvip: "ai-make-more-money-vvip",
} as const;
// Upgrade buttons go straight to the actual course / checkout page
// (instead of the landing-page #tickets anchor) so the customer is one
// click away from buying the upgrade tier.
const VIP_COURSE_URL = `${BASE_URL}/courses/${COURSE_SLUGS.vip}`;
const VVIP_COURSE_URL = `${BASE_URL}/courses/${COURSE_SLUGS.vvip}`;

const SESSIONS: Record<
  SessionNum,
  { title: string; bullets: string[] }
> = {
  1: {
    title: "Tư Duy Đúng & 10 Nguồn Thu Nhập Từ AI 2026",
    bullets: [
      "Tư duy đúng để kiếm tiền bằng AI — vì sao đây là thời điểm vàng",
      "Toàn cảnh 10 nguồn thu nhập đến từ AI và bạn nên bắt đầu từ đâu",
      "Lộ trình kiếm 10 nguồn thu nhập trên internet, từ con số 0",
    ],
  },
  2: {
    title: "Video & Kênh Triệu View — Kiếm Tiền Từ Affiliate",
    bullets: [
      "Cách tạo video AI hấp dẫn và xây kênh triệu view, không cần quay dựng",
      "Kiếm tiền Affiliate ở 4 ngách hot: KOL AI · Tiếng Anh · Sức khỏe · Sách",
      "Công thức biến lượt xem thành hoa hồng đều đặn",
    ],
  },
  3: {
    title: "Chuyển Đổi Khách Thành Tiền & Hệ Thống Tự Động",
    bullets: [
      "Bí mật chuyển đổi danh sách khách hàng thành tiền",
      "Cách xây dựng sản phẩm số từ chính chuyên môn của bạn",
      "Dựng Website All-in-One bán hàng tự động với AI Agent — bạn ngủ, hệ thống vẫn bán",
    ],
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

/** Compact session row — used in pinned lists. */
function sessionRow(num: SessionNum, opts?: { highlight?: boolean }): string {
  const s = SESSIONS[num];
  const bg = opts?.highlight
    ? "background:rgba(212,168,67,0.08);border:1px solid rgba(212,168,67,0.3);"
    : "background:#111;border:1px solid #2a2a2a;";
  return `<div style="${bg}border-radius:10px;padding:14px 16px;margin-bottom:10px;">
    <div style="color:#D4A843;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;">BUỔI ${num} · ${SESSION_TIME}</div>
    <div style="color:#fff;font-weight:700;font-size:15px;margin-top:4px;">${escapeHtml(s.title)}</div>
  </div>`;
}

/** Expanded session row — includes the curriculum bullets. */
function sessionRowExpanded(num: SessionNum, opts?: { highlight?: boolean }): string {
  const s = SESSIONS[num];
  const bg = opts?.highlight
    ? "background:rgba(212,168,67,0.08);border:1px solid rgba(212,168,67,0.3);"
    : "background:#111;border:1px solid #2a2a2a;";
  const bulletsHtml = s.bullets
    .map(
      (b) =>
        `<li style="color:#cbd5e1;font-size:13px;line-height:1.7;margin-bottom:4px;">${escapeHtml(b)}</li>`
    )
    .join("");
  return `<div style="${bg}border-radius:10px;padding:14px 16px;margin-bottom:12px;">
    <div style="color:#D4A843;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;">BUỔI ${num} · ${SESSION_TIME}</div>
    <div style="color:#fff;font-weight:700;font-size:15px;margin:4px 0 8px;">${escapeHtml(s.title)}</div>
    <ul style="margin:0;padding-left:20px;">${bulletsHtml}</ul>
  </div>`;
}

/** Full program curriculum — used inside welcome + D-1 emails. */
function programOverviewBlock(highlightSession?: SessionNum): string {
  return `<div style="color:#fff;font-weight:700;font-size:14px;margin-bottom:10px;">🎯 Nội dung 3 buổi</div>
    ${sessionRowExpanded(1, { highlight: highlightSession === 1 })}
    ${sessionRowExpanded(2, { highlight: highlightSession === 2 })}
    ${sessionRowExpanded(3, { highlight: highlightSession === 3 })}`;
}

function zaloCallout(): string {
  return `<div style="background:rgba(0,104,255,0.08);border:1px solid rgba(0,104,255,0.3);border-radius:10px;padding:14px 16px;margin:18px 0;">
    <div style="color:#fff;font-weight:700;font-size:14px;margin-bottom:6px;">💬 Tham gia nhóm Zalo (quan trọng!)</div>
    <div style="color:#9ca3af;font-size:13px;line-height:1.6;margin-bottom:10px;">Link Zoom 3 buổi sẽ được gửi qua nhóm Zalo trước mỗi buổi 30 phút.</div>
    ${ctaButton(ZALO_GROUP, "Vào nhóm Zalo ngay", "#0068ff")}
  </div>`;
}

/** Tier-upgrade CTA block — shown for FREE and VIP. Empty for VVIP. */
function upgradeBlock(currentTier: AimmTier): string {
  if (currentTier === "vvip") return "";

  if (currentTier === "free") {
    return `<div style="background:rgba(212,168,67,0.06);border:1px solid rgba(212,168,67,0.3);border-radius:10px;padding:16px 18px;margin:18px 0;">
      <div style="color:#D4A843;font-weight:800;font-size:15px;margin-bottom:8px;">🚀 Nâng cấp để giữ trọn giá trị</div>
      <div style="color:#9ca3af;font-size:13px;line-height:1.7;margin-bottom:12px;">Vé Free chỉ học trực tiếp. Muốn xem lại bất cứ lúc nào hoặc được Khương kèm 1-1? Hai lựa chọn dưới đây:</div>
      <div style="margin-bottom:14px;">
        <div style="color:#fff;font-weight:700;font-size:13px;margin-bottom:4px;">Vé VIP — 99.000đ <span style="color:#9ca3af;font-weight:400;">(≈ 1 ly cà phê)</span></div>
        <ul style="margin:0 0 10px;padding-left:18px;color:#cbd5e1;font-size:12.5px;line-height:1.7;">
          <li>Tài liệu, slide PDF + bộ tài liệu bổ sung từng buổi</li>
          <li>Ưu tiên đặt câu hỏi Q&amp;A</li>
        </ul>
        ${ctaButton(VIP_COURSE_URL, "Lấy link mua Vé VIP — 99k")}
      </div>
      <div>
        <div style="color:#fff;font-weight:700;font-size:13px;margin-bottom:4px;">Vé VVIP — 499.000đ <span style="color:#9ca3af;font-weight:400;">(giới hạn 50 suất)</span></div>
        <ul style="margin:0 0 10px;padding-left:18px;color:#cbd5e1;font-size:12.5px;line-height:1.7;">
          <li>Toàn bộ quyền lợi VIP</li>
          <li>30 phút coaching 1-1 trực tiếp với Khương</li>
          <li>AI Agent Starter Kit (template + prompt + hướng dẫn)</li>
        </ul>
        ${ctaButton(VVIP_COURSE_URL, "Lấy link mua Vé VVIP — 499k", "#22c55e")}
      </div>
    </div>`;
  }

  // VIP → upsell VVIP only
  return `<div style="background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.3);border-radius:10px;padding:16px 18px;margin:18px 0;">
    <div style="color:#22c55e;font-weight:800;font-size:15px;margin-bottom:8px;">💎 Muốn được Khương kèm 1-1?</div>
    <div style="color:#9ca3af;font-size:13px;line-height:1.7;margin-bottom:12px;">Học viên VIP có quyền nâng cấp lên VVIP — bao gồm coaching 1-1 + AI Agent Starter Kit.</div>
    <ul style="margin:0 0 12px;padding-left:18px;color:#cbd5e1;font-size:12.5px;line-height:1.7;">
      <li><strong style="color:#fff;">30 phút coaching 1-1</strong> trực tiếp với Lê Đăng Khương — phân tích case riêng của bạn</li>
      <li><strong style="color:#fff;">AI Agent Starter Kit</strong> — template database + prompt library + hướng dẫn dựng AI Agent đầu tiên</li>
      <li>Ưu tiên Q&amp;A số 1 — câu hỏi của bạn được trả lời trước</li>
    </ul>
    ${ctaButton(VVIP_COURSE_URL, "Lấy link mua Vé VVIP — 499k", "#22c55e")}
  </div>`;
}

/* ─── 1. Welcome (sent immediately on registration) ──────────── */

export function welcomeEmail(
  tier: AimmTier,
  name: string
): { subject: string; html: string } {
  const subject = `🎉 Chào mừng ${name} — đăng ký AI Make More Money & Freedom thành công`;
  const courseUrl = `${BASE_URL}/courses/${COURSE_SLUGS[tier]}`;

  const tierIntro: Record<AimmTier, string> = {
    free: `
      <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 12px;">Vé Free cho bạn quyền tham gia <strong style="color:#fff;">trực tiếp cả 3 buổi Zoom</strong> + nhận quà cẩm nang trị giá <span style="color:#22c55e;font-weight:600;">2.990.000đ</span>.</p>
      <p style="color:#facc15;font-size:13px;line-height:1.7;margin:0 0 12px;"><strong>⚠️ Lưu ý:</strong> vé Free <strong>chỉ học trực tiếp</strong> — nếu bỏ lỡ buổi nào, bạn sẽ mất buổi đó.</p>
    `,
    vip: `
      <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 12px;">Vé VIP của bạn đã được kích hoạt. Bạn có quyền truy cập <strong style="color:#fff;">trọn bộ tài liệu + slide PDF từng buổi</strong> + ưu tiên đặt câu hỏi trong Q&amp;A — tất cả nằm trong trang khoá học của bạn.</p>
    `,
    vvip: `
      <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 12px;">Vé VVIP — suất gần Thầy Khương nhất — đã được kích hoạt. Bạn có toàn bộ quyền lợi của VIP + <strong style="color:#22c55e;">30 phút coaching 1-1 trực tiếp</strong> với Lê Đăng Khương + AI Agent Starter Kit.</p>
      <p style="color:#9ca3af;font-size:13px;line-height:1.7;margin:0 0 12px;"><strong style="color:#D4A843;">📅 Link đặt lịch coaching 1-1</strong> sẽ được gửi qua email riêng sau Buổi 3. Hãy giữ lịch trống tuần sau!</p>
    `,
  };

  const content = `
    <div style="margin-bottom:16px;">${tierBadge(tier)}</div>
    <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 14px;line-height:1.3;">Chào ${escapeHtml(name)}, chào mừng đến với <span style="color:#D4A843;">AI Make More Money &amp; Freedom</span> 🚀</h1>
    ${tierIntro[tier]}
    ${divider()}
    <div style="color:#fff;font-weight:800;font-size:16px;margin:0 0 8px;">🎯 Tổng quan chương trình</div>
    <p style="color:#9ca3af;font-size:13.5px;line-height:1.7;margin:0 0 16px;">3 buổi tối Zoom, mỗi buổi <strong style="color:#fff;">${SESSION_TIME}</strong>. Bạn sẽ đi qua trọn vẹn lộ trình: <strong style="color:#D4A843;">Tư duy đúng → Sản xuất nội dung → Chuyển đổi &amp; tự động hoá</strong> — kiếm tiền bằng AI mà không cần giỏi công nghệ, không cần làm nhiều hơn.</p>
    ${programOverviewBlock()}
    ${zaloCallout()}
    ${upgradeBlock(tier)}
    <div style="text-align:center;margin-top:20px;">
      ${ctaButton(courseUrl, "Vào trang khoá học của tôi")}
    </div>
    <p style="color:#6b7280;font-size:12px;line-height:1.6;margin-top:20px;text-align:center;">Có vấn đề gì? Trả lời thẳng email này — em sẽ hỗ trợ trong 24h.</p>
  `;
  return {
    subject,
    html: wrap(content, `Đăng ký thành công ${TIER_LABEL[tier]} — 3 buổi Zoom`),
  };
}

/* ─── 2. D-1 Reminder (12:00 the day before each session) ────── */

export function reminderD1Email(
  tier: AimmTier,
  name: string,
  sessionNum: SessionNum
): { subject: string; html: string } {
  const s = SESSIONS[sessionNum];
  const subject = `⏰ Tối mai 20:00 — Buổi ${sessionNum}: ${s.title}`;

  const content = `
    <div style="margin-bottom:16px;">${tierBadge(tier)}</div>
    <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 14px;line-height:1.3;">${escapeHtml(name)}, <span style="color:#D4A843;">tối mai 20:00</span> mình gặp nhau ở Zoom 🎯</h1>
    <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 16px;">Buổi <strong style="color:#D4A843;">${sessionNum} / 3</strong> của chương trình AI Make More Money &amp; Freedom diễn ra <strong style="color:#fff;">tối mai, ${SESSION_TIME}</strong>.</p>
    ${sessionRowExpanded(sessionNum, { highlight: true })}
    ${
      sessionNum < 3
        ? `<p style="color:#6b7280;font-size:12.5px;line-height:1.6;margin:0 0 16px;">Để bạn nắm trọn lộ trình, đây là toàn bộ 3 buổi:</p>${programOverviewBlock(sessionNum)}`
        : ""
    }
    <div style="color:#fff;font-weight:700;font-size:14px;margin:18px 0 10px;">📝 Chuẩn bị trước buổi học</div>
    <ul style="color:#9ca3af;font-size:13px;line-height:1.7;margin:0 0 16px;padding-left:20px;">
      <li>Notebook + bút để ghi chú</li>
      <li>Máy tính có kết nối Internet ổn định</li>
      <li>Tinh thần học hỏi mở &amp; sẵn sàng áp dụng ngay</li>
    </ul>
    ${zaloCallout()}
    ${upgradeBlock(tier)}
    <p style="color:#6b7280;font-size:13px;line-height:1.6;margin-top:18px;"><strong style="color:#facc15;">Link Zoom</strong> sẽ được gửi qua nhóm Zalo + email <strong style="color:#fff;">trước buổi 30 phút</strong>. Đảm bảo bạn đã vào nhóm Zalo!</p>
  `;
  return {
    subject,
    html: wrap(content, `Buổi ${sessionNum} diễn ra tối mai 20:00`),
  };
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
    <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 16px;">Đúng <strong style="color:#fff;">20:00 tối nay</strong>, mình sẽ cùng nhau khai mạc Buổi ${sessionNum}.</p>
    ${sessionRowExpanded(sessionNum, { highlight: true })}
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
  return {
    subject,
    html: wrap(content, `Buổi ${sessionNum} bắt đầu lúc 20:00 — còn 1h`),
  };
}

/* ─── 4. Recap (after each session, ~22:30) ───────────────────── */
//
// Note: the "Video xem lại sẽ có trong 24h" promise block was removed
// per anh Khương's feedback — recap emails no longer make replay
// commitments. Recap is now: appreciation → next session preview →
// upgrade CTA (FREE/VIP only) → closing (session 3 only).

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

  const nextSessionBlock = !isLast
    ? `<div style="color:#fff;font-weight:700;font-size:14px;margin:18px 0 10px;">👉 Buổi tiếp theo</div>${sessionRowExpanded(
        (sessionNum + 1) as SessionNum,
        { highlight: true }
      )}`
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
    ${nextSessionBlock}
    ${tier !== "vvip" && !isLast ? upgradeBlock(tier) : ""}
    ${closingBlock}
  `;
  return {
    subject,
    html: wrap(content, `Cảm ơn đã tham gia Buổi ${sessionNum}`),
  };
}

/* ─── 5. Event Complete (D+1 morning) ────────────────────────── */

export function eventCompleteEmail(
  tier: AimmTier,
  name: string
): { subject: string; html: string } {
  const subject = `🎁 ${name}, đây là bước tiếp theo của bạn sau AI Make More Money`;
  const courseUrl = `${BASE_URL}/courses/${COURSE_SLUGS[tier]}`;

  const upgradeOrCompletion: Record<AimmTier, string> = {
    free: `
      <h2 style="color:#fff;font-size:18px;font-weight:800;margin:18px 0 10px;">🚀 Bạn muốn đi sâu hơn?</h2>
      <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 14px;">Vé Free chỉ học trực tiếp. Nếu bạn muốn <strong style="color:#fff;">trọn bộ tài liệu + slide PDF</strong> và ưu tiên Q&amp;A để áp dụng sâu hơn, hãy nâng cấp lên VIP.</p>
      ${upgradeBlock("free")}
    `,
    vip: `
      <h2 style="color:#fff;font-size:18px;font-weight:800;margin:18px 0 10px;">💼 Trang khoá học VIP của bạn</h2>
      <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 14px;">Toàn bộ tài liệu, slide PDF và bộ tài liệu bổ sung từng buổi đã có sẵn trong trang khoá học VIP — mở ra bất cứ lúc nào để tra cứu lại.</p>
      <div style="text-align:center;margin:18px 0;">${ctaButton(courseUrl, "Mở khoá VIP của tôi")}</div>
      ${upgradeBlock("vip")}
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
    ${upgradeOrCompletion[tier]}
    ${divider()}
    <p style="color:#6b7280;font-size:13px;line-height:1.6;text-align:center;">Cảm ơn bạn đã tin tưởng và đồng hành cùng KOHADA 💛<br/>— Lê Đăng Khương</p>
  `;
  return {
    subject,
    html: wrap(content, `Bước tiếp theo sau AI Make More Money`),
  };
}
