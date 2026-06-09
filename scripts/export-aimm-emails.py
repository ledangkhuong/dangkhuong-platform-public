"""
Export every email in the AI Make More Money & Freedom automation
into a Word document with the FULL rendered copy for each tier — no
"giống Free" / "block X" pointers, no descriptive placeholders.

v4 changes:
- Recap-per-session emails (formerly Email 8/9/10) removed entirely.
  Funnel is now Welcome → 3× D-1 → 3× T-1h → Event Complete = 8 emails.
- Each email × each tier (FREE / VIP / VVIP) gets its full ready-to-
  paste copy laid out in the doc. Subject, body, every block, every
  button label and link spelled out.
- Placeholder is {{name}} — matches the in-house email campaign tool
  variable syntax.
"""
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from docx import Document
from docx.shared import RGBColor, Pt, Inches

OUTPUT = r"C:\Users\Admin\Downloads\AI-Make-More-Money-Email-Automation-v4.docx"

GOLD = RGBColor(0xD4, 0xA8, 0x43)
GREEN = RGBColor(0x22, 0xC5, 0x5E)
GRAY = RGBColor(0x6B, 0x72, 0x80)
BLUE = RGBColor(0x00, 0x68, 0xFF)
BLACK = RGBColor(0x0A, 0x0A, 0x0A)
ORANGE = RGBColor(0xF5, 0x9E, 0x0B)

doc = Document()
style = doc.styles['Normal']
style.font.name = 'Calibri'
style.font.size = Pt(11)

# ─── Render helpers ────────────────────────────────────────────────

def H1(text, color=GOLD):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.bold = True
    r.font.size = Pt(20)
    r.font.color.rgb = color

def H2(text, color=GOLD):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.bold = True
    r.font.size = Pt(15)
    r.font.color.rgb = color

def H3(text, color=BLACK):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.bold = True
    r.font.size = Pt(12.5)
    r.font.color.rgb = color

def label(text, color=GRAY):
    p = doc.add_paragraph()
    r = p.add_run(text.upper())
    r.bold = True
    r.font.size = Pt(9)
    r.font.color.rgb = color
    p.paragraph_format.space_after = Pt(2)

def body(text):
    p = doc.add_paragraph()
    p.add_run(text)

def bold(text):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.bold = True

def bullet(text):
    doc.add_paragraph(text, style='List Bullet')

def divider():
    p = doc.add_paragraph()
    r = p.add_run("─" * 70)
    r.font.color.rgb = GRAY

def section_break(title, color=GOLD):
    doc.add_page_break()
    H1(title, color)

def callout(title, content, color=GOLD):
    p = doc.add_paragraph()
    r = p.add_run(f"📌 {title}\n")
    r.bold = True
    r.font.color.rgb = color
    p.add_run(content)
    p.paragraph_format.left_indent = Inches(0.15)

def cta_button(label_text, link):
    p = doc.add_paragraph()
    r = p.add_run(f"  [ {label_text} ]  ")
    r.bold = True
    r.font.size = Pt(11)
    r.font.color.rgb = BLACK
    p.add_run(f"  →  {link}").font.size = Pt(10)

# ─── Session config ────────────────────────────────────────────────

SESSIONS = {
    1: {
        "title": "Tư Duy Đúng & 10 Nguồn Thu Nhập Từ AI 2026",
        "bullets": [
            "Tư duy đúng để kiếm tiền bằng AI — vì sao đây là thời điểm vàng",
            "Toàn cảnh 10 nguồn thu nhập đến từ AI và bạn nên bắt đầu từ đâu",
            "Lộ trình kiếm 10 nguồn thu nhập trên internet, từ con số 0",
        ],
    },
    2: {
        "title": "Video & Kênh Triệu View — Kiếm Tiền Từ Affiliate",
        "bullets": [
            "Cách tạo video AI hấp dẫn và xây kênh triệu view, không cần quay dựng",
            "Kiếm tiền Affiliate ở 4 ngách hot: KOL AI · Tiếng Anh · Sức khỏe · Sách",
            "Công thức biến lượt xem thành hoa hồng đều đặn",
        ],
    },
    3: {
        "title": "Chuyển Đổi Khách Thành Tiền & Hệ Thống Tự Động",
        "bullets": [
            "Bí mật chuyển đổi danh sách khách hàng thành tiền",
            "Cách xây dựng sản phẩm số từ chính chuyên môn của bạn",
            "Dựng Website All-in-One bán hàng tự động với AI Agent — bạn ngủ, hệ thống vẫn bán",
        ],
    },
}

TIER_LABELS = {"free": "Vé FREE (0đ)", "vip": "Vé VIP (99k)", "vvip": "Vé VVIP (499k)"}
TIER_COLORS = {"free": GRAY, "vip": GOLD, "vvip": GREEN}
ZALO_URL = "https://zalo.me/g/l4qmpdq934rmst9xxnfj"
VIP_URL = "https://dangkhuong.com/courses/ai-make-more-money-vip"
VVIP_URL = "https://dangkhuong.com/courses/ai-make-more-money-vvip"
FREE_URL = "https://dangkhuong.com/courses/ai-make-more-money-free"

# ─── Reusable blocks (rendered fully each time) ────────────────────

def render_session_card(n):
    bold(f"📅 BUỔI {n} · 20:00 – 22:00")
    bold(SESSIONS[n]["title"])
    for b in SESSIONS[n]["bullets"]:
        bullet(b)
    body("")

def render_program_overview():
    bold("🎯 Tổng quan chương trình")
    body("3 buổi tối Zoom, mỗi buổi 20:00 – 22:00. Bạn sẽ đi qua trọn vẹn lộ trình: "
         "Tư duy đúng → Sản xuất nội dung → Chuyển đổi & tự động hoá — kiếm tiền "
         "bằng AI mà không cần giỏi công nghệ, không cần làm nhiều hơn.")
    body("")
    for n in [1, 2, 3]:
        render_session_card(n)

def render_zalo_block():
    bold("💬 Tham gia nhóm Zalo (quan trọng!)")
    body("Link Zoom 3 buổi sẽ được gửi qua nhóm Zalo trước mỗi buổi 30 phút.")
    cta_button("Vào nhóm Zalo ngay", ZALO_URL)
    body("")

def render_upgrade_block_for_free():
    bold("🚀 Nâng cấp để giữ trọn giá trị")
    body("Vé Free chỉ học trực tiếp. Muốn có trọn bộ tài liệu, slide PDF, "
         "ưu tiên Q&A — hoặc được Khương kèm 1-1? Hai lựa chọn dưới đây:")
    body("")
    bold("👉 Vé VIP — 99.000đ (≈ 1 ly cà phê)")
    bullet("Trọn bộ tài liệu, slide PDF + tài liệu bổ sung từng buổi")
    bullet("Ưu tiên đặt câu hỏi Q&A")
    cta_button("Lấy link mua Vé VIP — 99k", VIP_URL)
    body("")
    bold("👉 Vé VVIP — 499.000đ (giới hạn 50 suất)")
    bullet("Toàn bộ quyền lợi VIP")
    bullet("30 phút coaching 1-1 trực tiếp với Lê Đăng Khương")
    bullet("AI Agent Starter Kit (template database + prompt library + hướng dẫn)")
    cta_button("Lấy link mua Vé VVIP — 499k", VVIP_URL)
    body("")

def render_upgrade_block_for_vip():
    bold("💎 Muốn được Khương kèm 1-1?")
    body("Học viên VIP có quyền nâng cấp lên VVIP — bao gồm coaching 1-1 + "
         "AI Agent Starter Kit.")
    body("")
    bullet("30 phút coaching 1-1 trực tiếp với Lê Đăng Khương — phân tích case riêng của bạn")
    bullet("AI Agent Starter Kit — template database + prompt library + hướng dẫn dựng AI Agent đầu tiên")
    bullet("Ưu tiên Q&A số 1 — câu hỏi của bạn được trả lời trước")
    cta_button("Lấy link mua Vé VVIP — 499k", VVIP_URL)
    body("")

def render_tier_header(tier):
    p = doc.add_paragraph()
    r = p.add_run(f"  ▌  {TIER_LABELS[tier]}  ▐  ")
    r.bold = True
    r.font.size = Pt(13)
    r.font.color.rgb = TIER_COLORS[tier]
    body("")

# ─── Per-email renderers ───────────────────────────────────────────

def render_welcome(tier):
    render_tier_header(tier)
    label("Subject (tiêu đề email)")
    body("🎉 Chào mừng {{name}} — đăng ký AI Make More Money & Freedom thành công")
    body("")
    label("Body (toàn bộ nội dung email)")
    body("Chào {{name}}, chào mừng đến với AI Make More Money & Freedom 🚀")
    body("")
    if tier == "free":
        body("Vé Free cho bạn quyền tham gia trực tiếp cả 3 buổi Zoom + nhận quà "
             "cẩm nang trị giá 2.990.000đ.")
        body("")
        body("⚠️ Lưu ý: vé Free chỉ học trực tiếp — nếu bỏ lỡ buổi nào, bạn sẽ mất buổi đó.")
    elif tier == "vip":
        body("Vé VIP của bạn đã được kích hoạt. Bạn có quyền truy cập trọn bộ "
             "tài liệu + slide PDF từng buổi + ưu tiên đặt câu hỏi trong Q&A "
             "— tất cả nằm trong trang khoá học của bạn.")
    else:  # vvip
        body("Vé VVIP — suất gần Thầy Khương nhất — đã được kích hoạt. Bạn có "
             "toàn bộ quyền lợi của VIP + 30 phút coaching 1-1 trực tiếp với "
             "Lê Đăng Khương + AI Agent Starter Kit.")
        body("")
        body("📅 Link đặt lịch coaching 1-1 sẽ được gửi qua email riêng sau Buổi 3. "
             "Hãy giữ lịch trống tuần sau!")
    body("")
    render_program_overview()
    render_zalo_block()
    if tier == "free":
        render_upgrade_block_for_free()
    elif tier == "vip":
        render_upgrade_block_for_vip()
    label("CTA cuối thư")
    course_url = {"free": FREE_URL, "vip": VIP_URL, "vvip": VVIP_URL}[tier]
    cta_button("Vào trang khoá học của tôi", course_url)
    body("")
    label("Kết thư")
    body("Có vấn đề gì? Trả lời thẳng email này — em sẽ hỗ trợ trong 24h.")

def render_d1(tier, n):
    render_tier_header(tier)
    label("Subject")
    body(f"⏰ Tối mai 20:00 — Buổi {n}: {SESSIONS[n]['title']}")
    body("")
    label("Body (toàn bộ nội dung email)")
    body(f"{{{{name}}}}, tối mai 20:00 mình gặp nhau ở Zoom 🎯")
    body("")
    body(f"Buổi {n} / 3 của chương trình AI Make More Money & Freedom diễn ra "
         f"tối mai, 20:00 – 22:00.")
    body("")
    render_session_card(n)
    if n < 3:
        bold("Để bạn nắm trọn lộ trình, đây là toàn bộ 3 buổi:")
        body("")
        for i in [1, 2, 3]:
            render_session_card(i)
    bold("📝 Chuẩn bị trước buổi học")
    bullet("Notebook + bút để ghi chú")
    bullet("Máy tính có kết nối Internet ổn định")
    bullet("Tinh thần học hỏi mở & sẵn sàng áp dụng ngay")
    body("")
    render_zalo_block()
    if tier == "free":
        render_upgrade_block_for_free()
    elif tier == "vip":
        render_upgrade_block_for_vip()
    label("Kết thư")
    body("Link Zoom sẽ được gửi qua nhóm Zalo + email TRƯỚC buổi 30 phút. "
         "Đảm bảo bạn đã vào nhóm Zalo!")

def render_t1h(tier, n):
    render_tier_header(tier)
    label("Subject")
    body(f"🔥 Còn 1 tiếng nữa — Buổi {n}: {SESSIONS[n]['title']}")
    body("")
    label("Body (toàn bộ nội dung email)")
    body(f"{{{{name}}}}, còn 1 tiếng nữa — Buổi {n} bắt đầu! ⚡")
    body("")
    body(f"Đúng 20:00 tối nay, mình sẽ cùng nhau khai mạc Buổi {n}.")
    body("")
    render_session_card(n)
    bold("✅ Checklist 5 phút trước buổi")
    bullet("Vào nhóm Zalo — link Zoom được pin ở đầu nhóm")
    bullet("Tắt thông báo & chuẩn bị nơi yên tĩnh")
    bullet("Test mic + camera Zoom")
    bullet("Có sẵn notebook để ghi chú")
    body("")
    label("CTA chính")
    cta_button("Vào nhóm Zalo lấy link Zoom", ZALO_URL)
    body("")
    body("Lưu ý: email T-1h KHÔNG có block nâng cấp — focus 100% vào việc giúp "
         "khách vào học đúng giờ.")

def render_event_complete(tier):
    render_tier_header(tier)
    label("Subject")
    body("🎁 {{name}}, đây là bước tiếp theo của bạn sau AI Make More Money")
    body("")
    label("Body (mở thư chung)")
    body("Chào {{name}} — chương trình đã khép lại, nhưng hành trình của bạn "
         "VỪA BẮT ĐẦU ✨")
    body("")
    body("3 buổi vừa qua đã trao cho bạn bản đồ kiếm tiền bằng AI. Bước quan "
         "trọng nhất giờ là ÁP DỤNG NGAY TUẦN NÀY — đừng để kiến thức nằm im "
         "trên giấy.")
    body("")
    if tier == "free":
        bold("🚀 Bạn muốn đi sâu hơn?")
        body("Vé Free chỉ học trực tiếp. Nếu bạn muốn trọn bộ tài liệu + slide PDF "
             "và ưu tiên Q&A để áp dụng sâu hơn, hãy nâng cấp lên VIP.")
        body("")
        render_upgrade_block_for_free()
    elif tier == "vip":
        bold("💼 Trang khoá học VIP của bạn")
        body("Toàn bộ tài liệu, slide PDF và bộ tài liệu bổ sung từng buổi đã có "
             "sẵn trong trang khoá học VIP — mở ra bất cứ lúc nào để tra cứu lại.")
        cta_button("Mở khoá VIP của tôi", VIP_URL)
        body("")
        render_upgrade_block_for_vip()
    else:  # vvip
        bold("📅 Đặt lịch coaching 1-1 với Lê Đăng Khương")
        body("Đây là quyền lợi cao nhất của vé VVIP. 30 phút Zoom riêng với "
             "Thầy Khương — phân tích case của bạn, lộ trình áp dụng AI riêng, "
             "gỡ vướng mắc sâu.")
        body("")
        body("📌 Link Calendly đặt lịch: sẽ được gửi qua email riêng trong 24h. "
             "Lịch có giới hạn — book sớm để chọn được khung giờ ưng ý.")
        body("")
        cta_button("Tải AI Agent Starter Kit ngay", VVIP_URL)
        body("Bao gồm Template Database, Prompt Library & hướng dẫn dựng AI Agent "
             "đầu tiên trong 1 ngày.")
    divider()
    label("Kết thư (chung)")
    body("Cảm ơn bạn đã tin tưởng và đồng hành cùng KOHADA 💛")
    body("— Lê Đăng Khương")

# ════════════════════════════════════════════════════════════════
# COVER PAGE
# ════════════════════════════════════════════════════════════════
H1("🚀 AI MAKE MORE MONEY & FREEDOM", GOLD)
H2("Hệ thống Email Automation — Bản nội dung đầy đủ (v4)", BLACK)
body("")
label("Landing page")
body("https://dangkhuong.com/aimakemoremoney")
label("Zalo group")
body(ZALO_URL)
label("Lịch sự kiện (cấu hình trong cron)")
body("3 buổi liên tiếp · 20:00 – 22:00 mỗi buổi · Zoom")
body("Mỗi cohort mới: chỉ cần update ngày trong file cron, nội dung email "
     "tự dùng lại — không có ngày cụ thể nào trong copy.")
body("")
callout(
    "Biến hệ thống — placeholder {{name}}",
    "{{name}} là biến hệ thống — khi platform gửi email, nó tự thay bằng tên "
    "thật của khách trong database. Anh KHÔNG cần xoá hoặc đổi {{name}}. "
    "Ví dụ: khách tên 'Trần Thế Anh' sẽ nhận 'Chào Trần Thế Anh, ...'."
)
body("")
callout(
    "Cách dùng tài liệu",
    "Tài liệu này có FULL nội dung 8 email × 3 tier (FREE / VIP / VVIP). "
    "Anh review từng email, sửa text trực tiếp lên file Word, save và gửi lại "
    "em qua chat — em update code và push deploy.",
    BLUE,
)
body("")

label("📅 Lịch trình gửi 8 email (đã BỎ recap-per-session)")
sched_table = doc.add_table(rows=9, cols=3)
sched_table.style = 'Light Grid Accent 4'
hdr = sched_table.rows[0]
hdr.cells[0].text = "Email"
hdr.cells[1].text = "Thời điểm gửi"
hdr.cells[2].text = "Mô tả"
sched = [
    ("1. Welcome",      "Ngay khi đăng ký",            "Xác nhận + tổng quan 3 buổi + Zalo + upgrade CTA"),
    ("2. D-1 Buổi 1",   "Trưa 1 ngày trước Buổi 1",    "Nhắc tối mai 20:00 + nội dung Buổi 1 + nội dung 3 buổi"),
    ("3. D-1 Buổi 2",   "Trưa 1 ngày trước Buổi 2",    "Nhắc tối mai 20:00 + nội dung Buổi 2 + nội dung 3 buổi"),
    ("4. D-1 Buổi 3",   "Trưa 1 ngày trước Buổi 3",    "Nhắc tối mai 20:00 + nội dung Buổi 3"),
    ("5. T-1h Buổi 1",  "19:00 ngày diễn ra Buổi 1",   "Còn 1h nữa + checklist 5 phút"),
    ("6. T-1h Buổi 2",  "19:00 ngày diễn ra Buổi 2",   "Còn 1h nữa + checklist"),
    ("7. T-1h Buổi 3",  "19:00 ngày diễn ra Buổi 3",   "Còn 1h nữa + checklist"),
    ("8. Event Complete","Sáng D+1 (sau buổi cuối)",   "Bước tiếp theo + upsell theo tier"),
]
for i, row in enumerate(sched):
    r = sched_table.rows[i + 1]
    for j, cell_text in enumerate(row):
        r.cells[j].text = cell_text

# ════════════════════════════════════════════════════════════════
# EMAIL 1: WELCOME — 3 tier full content
# ════════════════════════════════════════════════════════════════
section_break("📧 EMAIL 1: WELCOME")
label("Thời điểm gửi")
body("Ngay khi khách bấm đăng ký (gửi tự động qua API enroll)")
body("")

for tier in ["free", "vip", "vvip"]:
    H2(f"Nội dung gửi {TIER_LABELS[tier]}", TIER_COLORS[tier])
    render_welcome(tier)
    divider()

# ════════════════════════════════════════════════════════════════
# EMAIL 2-4: D-1 REMINDERS (3 buổi × 3 tier = 9 sections, full content each)
# ════════════════════════════════════════════════════════════════
for n in [1, 2, 3]:
    section_break(f"📧 EMAIL {1+n}: D-1 REMINDER — Buổi {n}")
    label("Thời điểm gửi")
    body(f"Trưa 1 ngày trước Buổi {n} (cụ thể: 12:00 ngày diễn ra Buổi {n} - 1)")
    body("")
    for tier in ["free", "vip", "vvip"]:
        H2(f"Nội dung gửi {TIER_LABELS[tier]}", TIER_COLORS[tier])
        render_d1(tier, n)
        divider()

# ════════════════════════════════════════════════════════════════
# EMAIL 5-7: T-1h REMINDERS (3 buổi × 3 tier)
# ════════════════════════════════════════════════════════════════
for n in [1, 2, 3]:
    section_break(f"📧 EMAIL {4+n}: T-1h REMINDER — Buổi {n}")
    label("Thời điểm gửi")
    body(f"19:00 ngày diễn ra Buổi {n} (1 tiếng trước giờ học)")
    body("")
    for tier in ["free", "vip", "vvip"]:
        H2(f"Nội dung gửi {TIER_LABELS[tier]}", TIER_COLORS[tier])
        render_t1h(tier, n)
        divider()

# ════════════════════════════════════════════════════════════════
# EMAIL 8: EVENT COMPLETE — 3 tier full content
# ════════════════════════════════════════════════════════════════
section_break("📧 EMAIL 8: EVENT COMPLETE")
label("Thời điểm gửi")
body("Sáng ngày sau Buổi 3 (mặc định 08:00)")
body("")
for tier in ["free", "vip", "vvip"]:
    H2(f"Nội dung gửi {TIER_LABELS[tier]}", TIER_COLORS[tier])
    render_event_complete(tier)
    divider()

# ════════════════════════════════════════════════════════════════
# APPENDIX
# ════════════════════════════════════════════════════════════════
section_break("📋 Hướng dẫn anh review & gửi lại", BLACK)
H3("Cách anh sửa nội dung")
bullet("Mở file Word, sửa trực tiếp text — KHÔNG cần đụng vào style/cấu trúc")
bullet("Sửa được: subject, lời mở thư, lời kết, CTA copy, bullet points, nội dung từng buổi, button label")
bullet("KHÔNG xoá: {{name}} placeholder, các link URL, button structure")
bullet("Gửi lại file qua chat — em sẽ tự convert thành code và push deploy")
body("")
H3("Về biến {{name}}")
body("{{name}} là biến hệ thống — đúng cú pháp mà platform email campaign của "
     "anh đang dùng. Khi gửi, hệ thống tự thay bằng tên thật từ database. "
     "Anh giữ nguyên {{name}} ở mọi vị trí trong email.")
body("")
H3("Chạy event cho cohort mới")
body("Update ngày trong file src/app/api/cron/aimakemoremoney/route.ts (SCHEDULE const). "
     "Nội dung email tự động dùng lại — không phải sửa gì.")

# Save
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
doc.save(OUTPUT)
print(f"✅ Saved: {OUTPUT}")
print(f"   File size: {os.path.getsize(OUTPUT) // 1024} KB")
