import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageBreak, PageNumber, LevelFormat,
  ExternalHyperlink, TableOfContents
} from "docx";
import fs from "fs";

// ── Styles & Config ──
const GOLD = "D4A843";
const DARK = "1a1a1a";
const GRAY = "6b7280";
const LIGHT_GOLD = "FEF9E7";
const LIGHT_GRAY = "F3F4F6";
const WHITE = "FFFFFF";
const PAGE_W = 12240;
const PAGE_H = 15840;
const CONTENT_W = 9360;

const border = { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorders = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
};
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, size: 36, font: "Arial", color: DARK })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, bold: true, size: 28, font: "Arial", color: DARK })],
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 24, font: "Arial", color: "374151" })],
  });
}
function p(text, opts = {}) {
  const runs = [];
  const parts = text.split(/(\*\*.*?\*\*)/g);
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true, size: 22, font: "Arial", color: opts.color || DARK }));
    } else {
      runs.push(new TextRun({ text: part, size: 22, font: "Arial", color: opts.color || DARK, ...(opts.italic ? { italics: true } : {}) }));
    }
  }
  return new Paragraph({ spacing: { after: 120 }, alignment: opts.align || AlignmentType.LEFT, children: runs });
}
function bullet(text, level = 0) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  const runs = parts.map(part => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return new TextRun({ text: part.slice(2, -2), bold: true, size: 22, font: "Arial" });
    }
    return new TextRun({ text: part, size: 22, font: "Arial" });
  });
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { after: 60 },
    children: runs,
  });
}
function numbered(text, level = 0) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  const runs = parts.map(part => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return new TextRun({ text: part.slice(2, -2), bold: true, size: 22, font: "Arial" });
    }
    return new TextRun({ text: part, size: 22, font: "Arial" });
  });
  return new Paragraph({
    numbering: { reference: "numbers", level },
    spacing: { after: 60 },
    children: runs,
  });
}
function tipBox(title, text) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [new TableRow({
      children: [new TableCell({
        borders: { ...noBorders, left: { style: BorderStyle.SINGLE, size: 12, color: GOLD } },
        shading: { fill: LIGHT_GOLD, type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 200, right: 200 },
        width: { size: CONTENT_W, type: WidthType.DXA },
        children: [
          new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 22, font: "Arial", color: "92400E" })] }),
          new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text, size: 20, font: "Arial", color: "78350F" })] }),
        ],
      })],
    })],
  });
}
function spacer() {
  return new Paragraph({ spacing: { after: 200 }, children: [] });
}
function makeTable(headers, rows, colWidths) {
  const headerRow = new TableRow({
    children: headers.map((h, i) => new TableCell({
      borders,
      shading: { fill: DARK, type: ShadingType.CLEAR },
      margins: cellMargins,
      width: { size: colWidths[i], type: WidthType.DXA },
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20, font: "Arial", color: WHITE })] })],
    })),
  });
  const dataRows = rows.map(row => new TableRow({
    children: row.map((cell, i) => new TableCell({
      borders,
      margins: cellMargins,
      width: { size: colWidths[i], type: WidthType.DXA },
      shading: { fill: WHITE, type: ShadingType.CLEAR },
      children: [new Paragraph({ children: [new TextRun({ text: cell, size: 20, font: "Arial" })] })],
    })),
  }));
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...dataRows],
  });
}

// ══════════════════════════════════════════════════
// NỘI DUNG TÀI LIỆU
// ══════════════════════════════════════════════════

const children = [];

// ── TRANG BÌA ──
children.push(
  new Paragraph({ spacing: { before: 3000 }, children: [] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: "TÀI LIỆU ĐÀO TẠO", size: 22, font: "Arial", color: GOLD, bold: true })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [new TextRun({ text: "XÂY DỰNG HỆ THỐNG WEBSITE", size: 48, font: "Arial", bold: true, color: DARK })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [new TextRun({ text: "ALL-IN-ONE", size: 56, font: "Arial", bold: true, color: GOLD })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [new TextRun({ text: "Từ Tư Duy Đến Hành Động", size: 28, font: "Arial", color: GRAY, italics: true })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: GOLD, space: 12 } },
    children: [new TextRun({ text: "Biên soạn bởi: Lê Đăng Khương", size: 22, font: "Arial", color: DARK })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new TextRun({ text: "Website mẫu: dangkhuong.com", size: 22, font: "Arial", color: GRAY })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Phiên bản 2.0 — Tháng 05/2026", size: 20, font: "Arial", color: GRAY })],
  }),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── MỤC LỤC ──
children.push(
  h1("Mục Lục"),
  new TableOfContents("Mục Lục", { hyperlink: true, headingStyleRange: "1-3" }),
  new Paragraph({ children: [new PageBreak()] }),
);

// ══════════════════════════════════════════════════
// PHẦN 1: TƯ DUY
// ══════════════════════════════════════════════════
children.push(
  h1("PHẦN 1: TƯ DUY — TẠI SAO CẦN WEBSITE ALL-IN-ONE?"),
  spacer(),
  h2("1.1 Vấn đề của hầu hết người kinh doanh online"),
  p("Hầu hết người kinh doanh online đang sử dụng **10-15 công cụ khác nhau** để vận hành business:"),
  spacer(),
  makeTable(
    ["Nhu cầu", "Công cụ thông thường", "Chi phí/tháng"],
    [
      ["Website/Landing page", "WordPress, Ladipage", "200k - 2tr"],
      ["Quản lý khóa học", "Teachable, Udemy", "500k - 3tr"],
      ["Email Marketing", "Mailchimp, GetResponse", "300k - 2tr"],
      ["CRM Quản lý khách", "HubSpot, Pipedrive", "500k - 5tr"],
      ["Thanh toán", "PayOS, Stripe", "Phí giao dịch"],
      ["Cộng đồng", "Facebook Group", "0 (nhưng không kiểm soát)"],
      ["Affiliate", "Plugin riêng", "200k - 1tr"],
      ["Phân tích", "Google Analytics", "0 (nhưng rời rạc)"],
    ],
    [2800, 3800, 2760]
  ),
  spacer(),
  p("**Tổng chi phí:** 1.7tr - 14tr/tháng, chưa kể thời gian chuyển đổi giữa các nền tảng."),
  spacer(),
  tipBox("VẤN ĐỀ CHÍNH", "Dữ liệu khách hàng nằm rải rác trên nhiều nền tảng. Bạn không thể biết: ai đã mua gì, ai đang quan tâm sản phẩm nào, ai cần chăm sóc lại. Mất khách = Mất tiền."),
  spacer(),

  h2("1.2 Giải pháp: Website All-in-One"),
  p("Thay vì dùng 10 công cụ, bạn có **1 website duy nhất** làm tất cả:"),
  spacer(),
  bullet("**Bán khóa học** — Học viên đăng ký, thanh toán, học trực tiếp trên website"),
  bullet("**Thu email** — Thu thập email, gửi email tự động, chăm sóc khách hàng"),
  bullet("**Quản lý khách hàng (CRM)** — Biết khách ở đâu trong hành trình mua hàng"),
  bullet("**Cộng đồng** — Học viên trao đổi, hỏi đáp, chia sẻ ngay trên website"),
  bullet("**Affiliate** — Đối tác giới thiệu khách, tự động tính hoa hồng"),
  bullet("**Blog & SEO** — Viết bài chuẩn SEO, kéo traffic từ Google miễn phí"),
  bullet("**Phân tích** — Biết chính xác nguồn khách, tỉ lệ chuyển đổi, doanh thu"),
  spacer(),
  tipBox("LỢI THẾ CẠNH TRANH", "Tất cả dữ liệu nằm trong 1 hệ thống. Khi khách đọc blog → bạn biết. Khi khách xem khóa học → bạn biết. Khi khách bỏ giỏ hàng → bạn tự động gửi email nhắc. Đây là sức mạnh của ALL-IN-ONE."),
  spacer(),

  h2("1.3 Mô hình kinh doanh với website All-in-One"),
  p("Website All-in-One hỗ trợ **5 nguồn doanh thu** cùng lúc:"),
  spacer(),
  numbered("**Bán khóa học online** — Sản phẩm chính, lợi nhuận cao nhất"),
  numbered("**Bán tài liệu số (Ebook, Template)** — Sản phẩm chỉ tạo 1 lần, bán mãi mãi"),
  numbered("**Affiliate Marketing** — Đối tác giới thiệu, bạn chia hoa hồng tự động"),
  numbered("**Email Marketing** — Chăm sóc và bán hàng qua email (tỉ lệ chuyển đổi cao nhất)"),
  numbered("**Dịch vụ tư vấn/Coaching** — Bán gói cao cấp qua CRM"),
  spacer(),

  new Paragraph({ children: [new PageBreak()] }),

  // ══════════════════════════════════════════════════
  // PHẦN 2: KIẾN TRÚC HỆ THỐNG
  // ══════════════════════════════════════════════════
  h1("PHẦN 2: KIẾN TRÚC HỆ THỐNG"),
  spacer(),

  h2("2.1 Ví dụ: Xây website giống như xây một ngôi nhà"),
  p("Để dễ hiểu, hãy tưởng tượng website của bạn là **một ngôi nhà**. Mỗi thành phần công nghệ đóng vai trò như một phần của ngôi nhà:"),
  spacer(),
  makeTable(
    ["Phần của ngôi nhà", "Công nghệ", "Vai trò"],
    [
      ["Nền móng", "Supabase", "Lưu TẤT CẢ dữ liệu: học viên, khóa học, đơn hàng. Móng vững thì nhà mới chắc."],
      ["Khung nhà + Nội thất", "Next.js", "Bộ khung xử lý mọi thứ: hiển thị trang, thanh toán, quản lý user."],
      ["Mặt tiền & Địa chỉ", "Vercel", "Nơi đặt ngôi nhà lên internet để mọi người tìm thấy."],
      ["Hàng rào bảo vệ", "Cloudflare", "Bảo vệ khỏi kẻ xấu (hack). Làm đường vào nhà nhanh hơn (CDN)."],
      ["Hệ thống bưu điện", "Resend", "Gửi thư mời, thông báo, chăm sóc khách hàng."],
      ["Két thu tiền", "PayOS / SePay", "Nơi khách trả tiền, tự động đếm tiền, cấp quyền học."],
      ["Bảng tên nhà", "Domain", "Tên dễ nhớ (vd: nvacademy.com) thay vì dãy số IP."],
      ["Thợ sửa nhà AI", "Claude Code", "Nhân viên code AI, sửa/thêm tính năng theo yêu cầu bằng tiếng Việt."],
    ],
    [2200, 1600, 5560]
  ),
  spacer(),
  tipBox("ĐIỂM QUAN TRỌNG", "Giống như xây nhà, bạn KHÔNG cần biết cách đúc bê tông. Bạn chỉ cần biết TỪNG PHẦN làm gì và cách KẾT NỐI chúng. Còn muốn sửa chi tiết? Claude Code sẽ là thợ code AI giúp bạn."),
  spacer(),

  h2("2.2 Sơ đồ tổng thể hệ thống"),
  p("**Luồng khách hàng truy cập website:**"),
  spacer(),
  makeTable(
    ["Bước", "Điều gì xảy ra", "Ai xử lý"],
    [
      ["①", "Khách gõ yourdomain.com trên trình duyệt", "Domain (tên miền)"],
      ["②", "Yêu cầu đi qua Cloudflare → kiểm tra bảo mật + cache", "Cloudflare (hàng rào)"],
      ["③", "Cloudflare chuyển tiếp đến Vercel → trả trang web về", "Vercel + Next.js (nhà)"],
      ["④", "Khách đăng ký tài khoản → lưu vào database", "Supabase Auth (móng)"],
      ["⑤", "Khách xem khóa học, đọc blog → lấy dữ liệu", "Supabase Database (móng)"],
      ["⑥", "Khách thanh toán → tạo QR / chuyển khoản", "PayOS hoặc SePay (két tiền)"],
      ["⑦", "Thanh toán xong → webhook xác nhận → cấp quyền học", "Next.js API (bộ não)"],
      ["⑧", "Hệ thống gửi email xác nhận cho khách", "Resend (bưu điện)"],
      ["⑨", "Admin xem báo cáo doanh thu, quản lý học viên", "Admin Dashboard"],
    ],
    [600, 4760, 4000]
  ),
  spacer(),

  p("**Sơ đồ kết nối 4 lớp:**"),
  spacer(),
  makeTable(
    ["Lớp", "Thành phần", "Kết nối với"],
    [
      ["Lớp 1: Khách hàng", "Trình duyệt (Chrome, Safari...)", "→ Cloudflare"],
      ["Lớp 2: Bảo vệ", "Cloudflare (DNS + CDN + WAF)", "→ Vercel"],
      ["Lớp 3: Hiển thị", "Vercel (hosting Next.js)", "→ Supabase, PayOS, Resend"],
      ["Lớp 4: Dữ liệu", "Supabase (DB + Auth + Storage)", "← Vercel đọc/ghi"],
      ["Lớp 4: Thanh toán", "PayOS / SePay", "→ Webhook về Vercel"],
      ["Lớp 4: Email", "Resend", "← Vercel gọi API gửi"],
    ],
    [2000, 3860, 3500]
  ),
  spacer(),

  h2("2.3 Tổng quan công nghệ & chi phí"),
  makeTable(
    ["Thành phần", "Công nghệ", "Vai trò", "Chi phí"],
    [
      ["Frontend + Backend", "Next.js (Vercel)", "Giao diện + API", "0đ/tháng (Hobby)"],
      ["Database + Auth", "Supabase", "Lưu trữ + Đăng nhập", "0đ/tháng (Free tier)"],
      ["CDN + Bảo mật", "Cloudflare", "Tăng tốc + Chống hack", "0đ/tháng (Free plan)"],
      ["Email", "Resend", "Gửi email tự động", "0đ/tháng (3,000 email)"],
      ["Thanh toán", "PayOS / SePay", "Nhận tiền từ khách", "Phí giao dịch nhỏ"],
      ["Tên miền", "Namecheap / TMVN", "Địa chỉ website", "200k-500k/năm"],
      ["Code AI", "Claude Code", "Tùy chỉnh website", "~500k/tháng (API)"],
    ],
    [2000, 2200, 2400, 2760]
  ),
  spacer(),

  h2("2.4 Tại sao cần Cloudflare?"),
  p("Cloudflare đóng vai trò **hàng rào bảo vệ + đường cao tốc** cho website:"),
  spacer(),
  makeTable(
    ["Tính năng", "Giải thích", "Lợi ích"],
    [
      ["CDN", "Copy website ra 300+ server toàn cầu", "Nhanh gấp 2-5 lần"],
      ["DDoS Protection", "Tự động chặn request giả mạo", "Website không bị sập"],
      ["SSL/HTTPS", "Mã hóa dữ liệu, hiện ổ khóa xanh", "Google ưu tiên SEO"],
      ["DNS nhanh nhất", "Phân giải < 11ms (nhanh nhất thế giới)", "Vào web nhanh hơn"],
      ["Firewall (WAF)", "Chặn SQL injection, XSS", "Bảo vệ dữ liệu học viên"],
      ["Bot Protection", "Phân biệt người thật vs bot spam", "Giảm tải server"],
      ["Cache", "Lưu ảnh/CSS gần khách hàng", "Giảm 60-80% tải Vercel"],
    ],
    [2200, 4160, 3000]
  ),
  spacer(),
  tipBox("CLOUDFLARE FREE", "Gói miễn phí đã đủ cho 99% website. Không cần trả tiền trừ khi website có hàng triệu lượt/ngày."),
  spacer(),

  new Paragraph({ children: [new PageBreak()] }),

  // ══════════════════════════════════════════════════
  // PHẦN 3: HƯỚNG DẪN XÂY DỰNG — TỪNG BƯỚC MỘT
  // ══════════════════════════════════════════════════
  h1("PHẦN 3: XÂY DỰNG WEBSITE — TỪNG BƯỚC MỘT"),
  spacer(),
  p("Dưới đây là **8 bước** để xây dựng website từ con số 0 đến khi hoạt động hoàn chỉnh:"),
  spacer(),
  makeTable(
    ["Bước", "Việc cần làm", "Thời gian"],
    [
      ["Bước 1", "Mua tên miền (Domain)", "10 phút"],
      ["Bước 2", "Fork Source Code (GitHub)", "5 phút"],
      ["Bước 3", "Tạo Database (Supabase)", "15 phút"],
      ["Bước 4", "Deploy website (Vercel)", "10 phút"],
      ["Bước 5", "Cài Cloudflare + Kết nối Domain", "20 phút"],
      ["Bước 6", "Cài Email (Resend)", "15 phút"],
      ["Bước 7", "Cài Thanh toán (PayOS / SePay)", "15 phút"],
      ["Bước 8", "Thương hiệu + Tạo Admin", "10 phút"],
    ],
    [1500, 5360, 2500]
  ),
  spacer(),
  tipBox("TỔNG THỜI GIAN", "Khoảng 1.5 - 2 giờ nếu làm liền mạch. Không cần biết code. Chỉ cần làm theo từng bước."),
  spacer(),

  // ── BƯỚC 1: MUA DOMAIN ──
  h2("BƯỚC 1: Mua tên miền (Domain)"),
  spacer(),

  h3("Domain là gì?"),
  p("Domain (tên miền) là **địa chỉ** của website trên internet. Thay vì nhớ dãy số IP phức tạp (vd: 76.76.21.21), khách hàng chỉ cần gõ **nvacademy.com** để vào website của bạn."),
  spacer(),

  h3("Cách chọn tên miền tốt"),
  bullet("**Ngắn gọn, dễ nhớ** — tối đa 15 ký tự (vd: nvacademy.com)"),
  bullet("**Không dùng dấu gạch ngang** — khách hay quên (vd: nva-academy.com = tệ)"),
  bullet("**Không dùng số** — dễ nhầm lẫn (vd: nva123.com = tệ)"),
  bullet("**Ưu tiên .com** — phổ biến nhất, ai cũng nhớ"),
  bullet("**Dùng .vn** nếu chỉ bán tại Việt Nam — tạo cảm giác tin tưởng với khách Việt"),
  bullet("**Kiểm tra mạng xã hội** — tên miền nên trùng với tên Facebook, YouTube"),
  spacer(),

  h3("Mua domain quốc tế (.com, .net, .io) — Namecheap"),
  p("**Namecheap** là nhà cung cấp domain phổ biến nhất thế giới, giá rẻ và dễ dùng:"),
  spacer(),
  numbered("Vào **namecheap.com** → Tạo tài khoản"),
  numbered("Tìm kiếm tên miền muốn mua (vd: nvacademy.com)"),
  numbered("Chọn domain + thêm vào giỏ hàng"),
  numbered("Thanh toán bằng **PayPal, thẻ Visa/Mastercard, hoặc crypto**"),
  numbered("Domain kích hoạt ngay sau khi thanh toán"),
  spacer(),
  makeTable(
    ["Đuôi domain", "Giá/năm", "Phù hợp khi"],
    [
      [".com", "~$10 (~250k)", "Phổ biến nhất, dùng cho mọi mục đích"],
      [".net", "~$12 (~300k)", "Khi .com đã bị mua"],
      [".io", "~$35 (~875k)", "Thiên về công nghệ, startup"],
      [".co", "~$12 (~300k)", "Thay thế .com, ngắn gọn"],
      [".org", "~$10 (~250k)", "Tổ chức phi lợi nhuận, giáo dục"],
    ],
    [2000, 2500, 4860]
  ),
  spacer(),
  tipBox("WHOISGUARD MIỄN PHÍ", "Namecheap tặng kèm WhoisGuard — ẩn thông tin cá nhân (tên, email, SĐT) khỏi cơ sở dữ liệu WHOIS công khai. Bảo vệ bạn khỏi spam và quấy rối."),
  spacer(),

  h3("Mua domain Việt Nam (.vn) — Nhà cung cấp trong nước"),
  p("Domain **.vn** nên mua từ nhà cung cấp Việt Nam vì cần xác minh danh tính:"),
  spacer(),
  makeTable(
    ["Nhà cung cấp", "Website", "Giá .vn/năm", "Ghi chú"],
    [
      ["Tên Miền Việt Nam", "inet.vn", "350k - 500k", "Lớn nhất, uy tín nhất"],
      ["Nhân Hòa", "nhanhoa.com", "350k - 450k", "Lâu đời, hỗ trợ tốt"],
      ["Mắt Bão", "matbao.net", "350k - 500k", "Nhiều khuyến mãi"],
      ["P.A Vietnam", "pavietnam.vn", "350k - 450k", "Hỗ trợ doanh nghiệp"],
    ],
    [2200, 2000, 2000, 3160]
  ),
  spacer(),
  p("**Quy trình mua domain .vn:**"),
  numbered("Vào website nhà cung cấp → Tìm kiếm domain .vn"),
  numbered("Đặt mua + thanh toán (chuyển khoản, ví điện tử, thẻ)"),
  numbered("Gửi **CCCD/CMND** để xác minh (bắt buộc với .vn)"),
  numbered("Đợi 1-3 ngày làm việc để domain được kích hoạt"),
  spacer(),
  tipBox("KHI NÀO MUA .VN?", "Dùng .vn khi khách hàng 100% là người Việt Nam và bạn muốn tạo cảm giác thương hiệu Việt. Nếu có kế hoạch mở rộng quốc tế, nên mua .com."),
  spacer(),

  h3("So sánh tổng quan"),
  makeTable(
    ["Tiêu chí", "Namecheap (.com)", "Nhà cung cấp VN (.vn)"],
    [
      ["Giá", "~250k/năm", "350-500k/năm"],
      ["Thanh toán", "PayPal, Visa/Master, Crypto", "Chuyển khoản, ví VN"],
      ["Kích hoạt", "Ngay lập tức", "1-3 ngày (cần xác minh)"],
      ["Cần giấy tờ", "Không", "CCCD/CMND"],
      ["Bảo mật WHOIS", "Miễn phí (WhoisGuard)", "Có phí hoặc không có"],
      ["Phù hợp", "Quốc tế, đa mục đích", "Thị trường Việt Nam"],
    ],
    [2500, 3430, 3430]
  ),
  spacer(),

  new Paragraph({ children: [new PageBreak()] }),

  // ── BƯỚC 2: FORK SOURCE CODE ──
  h2("BƯỚC 2: Fork Source Code (GitHub)"),
  spacer(),
  p("**Fork** nghĩa là tạo 1 bản sao source code về tài khoản GitHub của bạn."),
  spacer(),
  h3("Tạo tài khoản GitHub (nếu chưa có)"),
  numbered("Vào **github.com/signup** → Đăng ký bằng email"),
  numbered("Xác nhận email → Đăng nhập"),
  spacer(),
  h3("Fork repo"),
  numbered("Vào repo do giảng viên cung cấp (link trong email invite)"),
  numbered("Click nút **Fork** (góc trên bên phải)"),
  numbered("Click **Create fork** — đợi 10 giây"),
  numbered("Bạn đã có repo riêng tại: github.com/[tên-bạn]/dangkhuong-platform"),
  spacer(),
  tipBox("BẢO MẬT", "KHÔNG chia sẻ link repo cho người khác. KHÔNG đăng code lên nơi công cộng. Vi phạm sẽ bị thu hồi quyền truy cập vĩnh viễn."),
  spacer(),

  // ── BƯỚC 3: TẠO DATABASE ──
  h2("BƯỚC 3: Tạo Database (Supabase)"),
  spacer(),
  h3("Tạo Supabase Project"),
  numbered("Vào **supabase.com** → Đăng nhập bằng **GitHub** (nhanh nhất)"),
  numbered("Click **New Project**"),
  numbered("Chọn region: **Southeast Asia (Singapore)**"),
  numbered("Đặt tên project (vd: my-academy)"),
  numbered("Đặt mật khẩu database (**GHI LẠI** mật khẩu này!)"),
  numbered("Đợi 2 phút để project khởi tạo"),
  spacer(),

  h3("Lấy credentials"),
  numbered("Vào **Settings** → **API**"),
  numbered("Copy **Project URL** → đây là NEXT_PUBLIC_SUPABASE_URL"),
  numbered("Copy **anon public key** → đây là NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  numbered("Copy **service_role key** → đây là SUPABASE_SERVICE_ROLE_KEY"),
  spacer(),
  tipBox("BẢO MẬT", "service_role key có quyền FULL ACCESS. KHÔNG BAO GIỜ chia sẻ key này."),
  spacer(),

  h3("Chạy Schema + Migrations"),
  numbered("Vào Supabase → **SQL Editor**"),
  numbered("Mở file **supabase/schema.sql** → Copy toàn bộ → Paste → **Run**"),
  numbered("Tiếp tục chạy các file trong **supabase/migrations/** theo thứ tự ngày"),
  spacer(),
  p("Nếu gặp lỗi \"already exists\" → Bỏ qua, chạy file tiếp theo.", { italic: true, color: GRAY }),
  spacer(),

  h3("Tạo Storage Buckets"),
  numbered("Vào Supabase → **Storage**"),
  numbered("Tạo bucket **thumbnails** (Public: ON) — Ảnh khóa học, blog"),
  numbered("Tạo bucket **community-images** (Public: ON) — Ảnh cộng đồng"),
  numbered("Tạo bucket **lesson-attachments** (Public: OFF) — File bài học"),
  spacer(),

  new Paragraph({ children: [new PageBreak()] }),

  // ── BƯỚC 4: DEPLOY LÊN VERCEL ──
  h2("BƯỚC 4: Deploy website lên Vercel"),
  spacer(),
  numbered("Vào **vercel.com** → Đăng nhập bằng **GitHub**"),
  numbered("Click **Add New Project** → **Import** repo vừa fork"),
  numbered("Framework: chọn **Next.js**"),
  numbered("Mở **Environment Variables** → Điền các biến sau:"),
  spacer(),
  makeTable(
    ["Tên biến", "Giá trị", "Bắt buộc"],
    [
      ["NEXT_PUBLIC_SUPABASE_URL", "https://xxx.supabase.co", "CÓ"],
      ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "eyJhbGci...", "CÓ"],
      ["SUPABASE_SERVICE_ROLE_KEY", "eyJhbGci...", "CÓ"],
      ["NEXT_PUBLIC_APP_URL", "https://yourdomain.com", "CÓ"],
      ["NEXT_PUBLIC_SITE_URL", "https://yourdomain.com", "CÓ"],
      ["NEXT_PUBLIC_SITE_NAME", "Tên Academy Của Bạn", "CÓ"],
      ["NEXT_PUBLIC_LICENSE_NAME", "Tên đầy đủ của bạn", "CÓ"],
      ["NEXT_PUBLIC_LICENSE_EMAIL", "Email đăng ký khóa học", "CÓ"],
    ],
    [3500, 3860, 2000]
  ),
  spacer(),
  numbered("Click **Deploy** → Đợi 2-3 phút"),
  numbered("Khi xong → bạn có URL: **your-project.vercel.app** (website đã chạy!)"),
  spacer(),
  tipBox("KIỂM TRA NGAY", "Mở URL Vercel cung cấp trên trình duyệt. Nếu thấy trang chủ hiện lên = thành công. Nếu lỗi, kiểm tra lại env vars (hay sai: thừa dấu cách, thiếu ký tự)."),
  spacer(),

  new Paragraph({ children: [new PageBreak()] }),

  // ── BƯỚC 5: CLOUDFLARE + KẾT NỐI DOMAIN ──
  h2("BƯỚC 5: Cài Cloudflare + Kết nối Domain"),
  spacer(),
  p("Bây giờ website đã chạy trên Vercel. Bước này sẽ **kết nối domain** (mua ở Bước 1) và **bảo vệ website** bằng Cloudflare."),
  spacer(),

  h3("5a. Đăng ký Cloudflare"),
  numbered("Vào **cloudflare.com** → Click **Sign Up** (miễn phí)"),
  numbered("Điền email + mật khẩu → Xác nhận email"),
  spacer(),

  h3("5b. Thêm domain vào Cloudflare"),
  numbered("Đăng nhập Cloudflare → Click **Add a Site**"),
  numbered("Nhập domain (vd: nvacademy.com) → Click **Add Site**"),
  numbered("Chọn gói **Free** → Click **Continue**"),
  numbered("Cloudflare tự quét DNS records → Kiểm tra → **Continue**"),
  spacer(),

  h3("5c. Đổi Nameservers (quan trọng nhất!)"),
  p("Cloudflare cung cấp **2 nameservers** mới. Bạn cần thay vào nơi mua domain:"),
  spacer(),

  p("**Nếu mua domain ở Namecheap:**"),
  numbered("Đăng nhập **Namecheap** → **Domain List** → **Manage**"),
  numbered("Mục **Nameservers** → Chọn **Custom DNS**"),
  numbered("Xóa cũ → Dán 2 nameservers Cloudflare (vd: ada.ns.cloudflare.com)"),
  numbered("Click **Save** → Đợi 15 phút - 24 giờ"),
  spacer(),

  p("**Nếu mua domain .vn (inet.vn, nhanhoa.com...):**"),
  numbered("Đăng nhập vào trang quản lý domain"),
  numbered("Tìm mục **DNS / Nameserver** (thường trong cài đặt domain)"),
  numbered("Thay nameservers hiện tại bằng 2 nameservers của Cloudflare"),
  numbered("Lưu lại → Đợi propagate (có thể mất vài giờ)"),
  spacer(),
  tipBox("SAU KHI ĐỔI NAMESERVERS", "TẤT CẢ DNS records sẽ quản lý trên Cloudflare. Từ giờ thêm/sửa DNS ở Cloudflare, KHÔNG phải ở nhà cung cấp domain nữa."),
  spacer(),

  h3("5d. Cấu hình DNS trỏ về Vercel"),
  numbered("Cloudflare → **DNS** → **Records** → Thêm:"),
  spacer(),
  makeTable(
    ["Type", "Name", "Content", "Proxy"],
    [
      ["A", "@", "76.76.21.21", "Proxied (đám mây cam)"],
      ["CNAME", "www", "cname.vercel-dns.com", "Proxied (đám mây cam)"],
    ],
    [1200, 1500, 3660, 3000]
  ),
  spacer(),

  h3("5e. Kết nối domain trên Vercel"),
  numbered("Vercel → Project → **Settings** → **Domains**"),
  numbered("Thêm: **nvacademy.com** và **www.nvacademy.com**"),
  numbered("Vercel xác nhận DNS đúng → Domain hoạt động!"),
  spacer(),

  h3("5f. Cấu hình SSL + Bảo mật"),
  p("**SSL:**"),
  numbered("Cloudflare → **SSL/TLS** → Chọn **Full (Strict)**"),
  numbered("Bật **Always Use HTTPS**"),
  numbered("Bật **Automatic HTTPS Rewrites**"),
  spacer(),
  p("**Tốc độ:**"),
  numbered("**Speed** → Bật **Auto Minify** (JS, CSS, HTML)"),
  numbered("Bật **Brotli compression**"),
  numbered("**Caching** → **Browser Cache TTL**: 1 month"),
  spacer(),
  p("**Bảo mật:**"),
  numbered("**Security** → **Security Level**: Medium"),
  numbered("Bật **Bot Fight Mode** (chặn bot tự động)"),
  spacer(),
  tipBox("ĐÁM MÂY CAM VS XÁM", "Cam (Proxied) = traffic qua Cloudflare → bảo vệ + tăng tốc. Xám (DNS only) = không bảo vệ. Luôn để cam cho website."),
  spacer(),

  new Paragraph({ children: [new PageBreak()] }),

  // ── BƯỚC 6: EMAIL RESEND ──
  h2("BƯỚC 6: Cài đặt Email (Resend)"),
  spacer(),
  p("Resend là nền tảng gửi email hiện đại, **miễn phí 3,000 email/tháng**, đơn giản và nhanh:"),
  spacer(),

  h3("6a. Đăng ký + Xác minh domain"),
  numbered("Vào **resend.com** → Click **Get Started** → Đăng ký bằng GitHub"),
  numbered("Resend Dashboard → **Domains** → **Add Domain** → Nhập domain"),
  numbered("Resend hiển thị **bản ghi DNS** cần thêm:"),
  spacer(),
  makeTable(
    ["Loại", "Tên bản ghi", "Giá trị"],
    [
      ["TXT", "resend._domainkey.yourdomain.com", "DKIM key (Resend cung cấp)"],
      ["TXT", "yourdomain.com", "SPF record (Resend cung cấp)"],
      ["MX", "send.yourdomain.com", "feedback-smtp.resend.com"],
    ],
    [1200, 3580, 4580]
  ),
  spacer(),
  numbered("Vào **Cloudflare** → DNS → Thêm các bản ghi trên"),
  numbered("Quay lại Resend → Click **Verify** → Xong trong vài phút"),
  spacer(),

  h3("6b. Lấy API Key + Cấu hình"),
  numbered("Resend → **API Keys** → **Create API Key** → Chọn **Full Access**"),
  numbered("Copy API Key (chỉ hiện 1 lần!)"),
  numbered("Thêm vào Vercel env vars:"),
  spacer(),
  makeTable(
    ["Tên biến", "Giá trị", "Mô tả"],
    [
      ["RESEND_API_KEY", "re_xxxxxxxxx", "API Key từ Resend"],
      ["EMAIL_FROM", "no-reply@yourdomain.com", "Email gửi đi (đã verify)"],
      ["EMAIL_FROM_NAME", "Tên Academy Của Bạn", "Tên hiển thị khi nhận email"],
    ],
    [3000, 3360, 3000]
  ),
  spacer(),
  tipBox("QUAN TRỌNG", "Nếu không xác minh domain, email bị vào spam. Đây là bước bắt buộc. Vì đã cài Cloudflare, thêm DNS records trực tiếp trên Cloudflare."),
  spacer(),

  h3("6c. Resend Free tier & lộ trình nâng cấp"),
  makeTable(
    ["Giai đoạn", "Nền tảng", "Phù hợp khi"],
    [
      ["Bắt đầu (0-500 học viên)", "Resend Free (3,000 email/tháng)", "Email xác nhận, thông báo cơ bản"],
      ["Tăng trưởng (500-2,000)", "Resend Pro ($20/tháng)", "Gửi nhiều hơn, analytics"],
      ["Scale (2,000+)", "Resend + Sender.net/Mailchimp", "Automation, campaign marketing"],
    ],
    [2500, 3200, 3660]
  ),
  spacer(),

  new Paragraph({ children: [new PageBreak()] }),

  // ── BƯỚC 7: THANH TOÁN ──
  h2("BƯỚC 7: Cài đặt Thanh toán"),
  spacer(),

  h3("7a. PayOS — Cổng thanh toán dễ nhất"),
  numbered("Vào **payos.vn** → Đăng ký tài khoản"),
  numbered("Xác minh CCCD + Tài khoản ngân hàng"),
  numbered("Tạo ứng dụng mới → Lấy: **Client ID**, **API Key**, **Checksum Key**"),
  numbered("Thêm vào Vercel env vars:"),
  spacer(),
  makeTable(
    ["Tên biến", "Mô tả"],
    [
      ["PAYOS_CLIENT_ID", "ID ứng dụng PayOS"],
      ["PAYOS_API_KEY", "API Key để tạo đơn hàng"],
      ["PAYOS_CHECKSUM_KEY", "Key xác minh webhook"],
    ],
    [4000, 5360]
  ),
  spacer(),
  numbered("Cài webhook: **https://yourdomain.com/api/payos/webhook**"),
  spacer(),

  h3("7b. SePay — Xác nhận chuyển khoản tự động (tùy chọn)"),
  numbered("Vào **sepay.vn** → Đăng ký → Kết nối tài khoản ngân hàng"),
  numbered("Lấy API Key → Thêm vào Vercel: SEPAY_API_KEY, SEPAY_BANK_ACCOUNT, SEPAY_BANK_CODE"),
  numbered("Cài webhook: **https://yourdomain.com/api/sepay/webhook**"),
  spacer(),

  // ── BƯỚC 8: THƯƠNG HIỆU + ADMIN ──
  h2("BƯỚC 8: Cài đặt Thương hiệu + Tạo Admin"),
  spacer(),
  h3("8a. Cài đặt thương hiệu qua env vars"),
  p("Tất cả thông tin thương hiệu cấu hình qua **Environment Variables** trên Vercel:"),
  spacer(),
  makeTable(
    ["Thông tin", "Tên biến", "Ví dụ"],
    [
      ["Tên Academy", "NEXT_PUBLIC_SITE_NAME", "NVA Academy"],
      ["Domain", "NEXT_PUBLIC_SITE_DOMAIN", "nvacademy.com"],
      ["Slogan", "NEXT_PUBLIC_SITE_TAGLINE", "Học để thành công"],
      ["Tên chủ sở hữu", "NEXT_PUBLIC_OWNER_NAME", "Nguyễn Văn A"],
      ["Màu thương hiệu", "NEXT_PUBLIC_COLOR_BRAND", "#FF6B35"],
      ["Facebook", "NEXT_PUBLIC_SOCIAL_FACEBOOK", "https://facebook.com/nva"],
      ["YouTube", "NEXT_PUBLIC_SOCIAL_YOUTUBE", "https://youtube.com/@nva"],
    ],
    [2500, 4360, 2500]
  ),
  spacer(),
  p("Sau khi thêm/sửa env vars → Vercel → Deployments → **Redeploy** để có hiệu lực."),
  spacer(),

  h3("8b. Tạo tài khoản Admin"),
  numbered("Truy cập website → Click **Đăng ký** → Tạo tài khoản"),
  numbered("Vào Supabase → **Table Editor** → Bảng **profiles**"),
  numbered("Tìm tài khoản vừa tạo → Đổi cột **role** thành **admin**"),
  numbered("Quay lại website → Vào **/admin** → Thấy Admin Dashboard!"),
  spacer(),
  tipBox("XIN CHÚC MỪNG!", "Website đã hoạt động hoàn chỉnh! Domain đã kết nối, Cloudflare bảo vệ, email và thanh toán sẵn sàng. Giờ hãy tạo khóa học đầu tiên."),
  spacer(),

  new Paragraph({ children: [new PageBreak()] }),

  // ══════════════════════════════════════════════════
  // PHẦN 4: TÙY CHỈNH BẰNG CLAUDE CODE
  // ══════════════════════════════════════════════════
  h1("PHẦN 4: TÙY CHỈNH WEBSITE BẰNG CLAUDE CODE"),
  spacer(),

  h2("4.1 Claude Code là gì?"),
  p("**Claude Code** là trợ lý lập trình AI của Anthropic — hoạt động như **một nhân viên code** làm việc 24/7, hiểu tiếng Việt, và thực hiện mọi thay đổi trên website theo yêu cầu của bạn."),
  spacer(),
  makeTable(
    ["So sánh", "Thuê Developer", "Tự học code", "Claude Code"],
    [
      ["Chi phí", "10-50tr/tháng", "0đ (nhưng mất thời gian)", "~500k/tháng (API)"],
      ["Tốc độ", "Vài ngày - vài tuần", "6-12 tháng để thành thạo", "Vài phút - vài giờ"],
      ["Giao tiếp", "Phải viết brief, họp, review", "Tự mình làm tất cả", "Nói tiếng Việt, làm ngay"],
      ["Chất lượng", "Phụ thuộc developer", "Phụ thuộc trình độ", "Code chuẩn, nhất quán"],
      ["Thời gian", "Giờ hành chính", "Khi bạn rảnh", "24/7, không cần chờ"],
    ],
    [1800, 2200, 2560, 2800]
  ),
  spacer(),
  tipBox("GÓC NHÌN THỰC TẾ", "Claude Code không thay thế developer chuyên nghiệp cho dự án phức tạp. Nhưng cho việc tùy chỉnh website: đổi giao diện, thêm trang, sửa nội dung, thêm tính năng nhỏ — Claude Code hoàn toàn đủ sức."),
  spacer(),

  h2("4.2 Claude Code làm được gì?"),
  spacer(),
  makeTable(
    ["Loại tùy chỉnh", "Ví dụ cụ thể", "Độ khó"],
    [
      ["Thay đổi giao diện", "Đổi màu header, font chữ, layout trang", "Dễ"],
      ["Thêm nội dung", "Thêm trang About, FAQ, điều khoản sử dụng", "Dễ"],
      ["Sửa component", "Thêm SĐT Zalo vào footer, đổi logo", "Dễ"],
      ["Thêm tính năng nhỏ", "Nút gọi Zalo, banner quảng cáo, popup", "Trung bình"],
      ["Sửa logic", "Thay đổi cách hiển thị giá, thêm discount", "Trung bình"],
      ["Tính năng mới", "Thêm trang Portfolio, hệ thống review", "Nâng cao"],
    ],
    [2500, 4360, 2500]
  ),
  spacer(),

  h2("4.3 Cài đặt Claude Code"),
  spacer(),
  p("**Yêu cầu:** Máy tính đã cài Node.js (bạn đã cài khi setup project)."),
  spacer(),

  h3("Bước 1: Cài Claude Code"),
  p("Mở Terminal (hoặc Command Prompt) và chạy:"),
  spacer(),
  p("**npm install -g @anthropic-ai/claude-code**", { color: "1a1a1a" }),
  spacer(),

  h3("Bước 2: Lấy API Key"),
  numbered("Vào **console.anthropic.com** → Đăng ký/đăng nhập"),
  numbered("Vào **API Keys** → **Create Key** → Copy key (bắt đầu bằng sk-ant-...)"),
  numbered("Nạp credit: tối thiểu $5 (~125k) — đủ dùng 1-2 tháng tùy mức sử dụng"),
  spacer(),

  h3("Bước 3: Clone repo về máy"),
  p("Mở Terminal, chạy lần lượt:"),
  spacer(),
  p("**git clone https://github.com/[tên-bạn]/dangkhuong-platform.git**"),
  p("**cd dangkhuong-platform**"),
  spacer(),

  h3("Bước 4: Khởi động Claude Code"),
  p("Trong thư mục project, chạy:"),
  spacer(),
  p("**claude**"),
  spacer(),
  p("Claude Code sẽ tự động đọc hiểu toàn bộ cấu trúc project. Lần đầu có thể mất 1-2 phút."),
  spacer(),

  h2("4.4 Cách sử dụng — Nói tiếng Việt, Claude Code làm"),
  spacer(),
  p("Sau khi Claude Code khởi động, bạn chỉ cần **mô tả bằng tiếng Việt** muốn thay đổi gì:"),
  spacer(),

  h3("Ví dụ 1: Đổi giao diện"),
  p("Bạn gõ: \"Đổi màu nền header từ trắng sang đen, chữ trắng\""),
  p("→ Claude Code tự tìm file header, sửa code, áp dụng thay đổi.", { italic: true, color: GRAY }),
  spacer(),

  h3("Ví dụ 2: Thêm thông tin"),
  p("Bạn gõ: \"Thêm số điện thoại Zalo 0901234567 vào footer, có icon Zalo\""),
  p("→ Claude Code thêm icon + link Zalo vào component footer.", { italic: true, color: GRAY }),
  spacer(),

  h3("Ví dụ 3: Thêm trang mới"),
  p("Bạn gõ: \"Tạo trang Giới thiệu (/about) với phần giới thiệu bản thân, đội ngũ, và mission\""),
  p("→ Claude Code tạo file mới, viết code hoàn chỉnh, có responsive.", { italic: true, color: GRAY }),
  spacer(),

  h3("Ví dụ 4: Sửa tính năng"),
  p("Bạn gõ: \"Thêm nút Mua ngay màu đỏ ở đầu trang khóa học, khi click thì cuộn xuống phần thanh toán\""),
  p("→ Claude Code tìm đúng component, thêm button với scroll behavior.", { italic: true, color: GRAY }),
  spacer(),

  h3("Ví dụ 5: Tùy chỉnh nâng cao"),
  p("Bạn gõ: \"Thêm countdown timer đếm ngược trên landing page, khi hết giờ thì ẩn nút giảm giá\""),
  p("→ Claude Code viết component mới và tích hợp vào landing page.", { italic: true, color: GRAY }),
  spacer(),

  h2("4.5 Quy trình: Chỉnh sửa → Tự động cập nhật website"),
  spacer(),
  p("Sau khi Claude Code thay đổi code, bạn cần **đẩy lên GitHub** để Vercel tự động cập nhật:"),
  spacer(),
  makeTable(
    ["Bước", "Bạn làm gì", "Điều gì xảy ra"],
    [
      ["①", "Mô tả yêu cầu bằng tiếng Việt", "Claude Code đọc hiểu project"],
      ["②", "Claude Code hiển thị thay đổi → bạn duyệt", "Code được sửa trên máy bạn"],
      ["③", "Chạy: git add . → git commit → git push", "Code đẩy lên GitHub"],
      ["④", "Tự động", "Vercel phát hiện code mới → Build → Deploy"],
      ["⑤", "Đợi 2-3 phút", "Website cập nhật với thay đổi mới!"],
    ],
    [800, 3760, 4800]
  ),
  spacer(),
  p("Hoặc bạn có thể nhờ Claude Code chạy lệnh git luôn:"),
  p("Gõ: \"Commit và push tất cả thay đổi lên GitHub với message: thêm nút Zalo vào footer\""),
  p("→ Claude Code tự chạy git add, commit, push.", { italic: true, color: GRAY }),
  spacer(),

  h2("4.6 Lưu ý quan trọng khi dùng Claude Code"),
  spacer(),
  bullet("**Luôn review code** trước khi push — đọc qua thay đổi Claude đề xuất"),
  bullet("**Backup trước khi sửa lớn** — tạo branch mới: git checkout -b thu-nghiem"),
  bullet("**Sửa ít = Sync fork dễ** — sửa càng nhiều, càng khó nhận update mới"),
  bullet("**Test trên máy trước** — chạy npm run dev để xem trước khi push"),
  bullet("**Không chia sẻ API key** — key Anthropic là của bạn, giữ bí mật"),
  spacer(),
  tipBox("MẸO HAY", "Nếu không muốn cài trên máy, bạn có thể dùng GitHub Codespaces (miễn phí 60 giờ/tháng) để chạy Claude Code trên trình duyệt. Không cần cài gì cả, chỉ cần internet."),
  spacer(),

  tipBox("KHI NÀO KHÔNG NÊN TỰ SỬA?", "Nếu bạn không chắc về thay đổi, hãy KHÔNG push lên GitHub. Thử trên máy trước (npm run dev). Nếu lỗi, gõ cho Claude Code: \"Undo tất cả thay đổi vừa rồi\". Luôn có thể quay lại."),
  spacer(),

  new Paragraph({ children: [new PageBreak()] }),

  // ══════════════════════════════════════════════════
  // PHẦN 5: VẬN HÀNH
  // ══════════════════════════════════════════════════
  h1("PHẦN 5: VẬN HÀNH HÀNG NGÀY"),
  spacer(),
  h2("5.1 Tạo khóa học mới"),
  numbered("Đăng nhập → Vào **/admin** → **Products** → **Tạo mới**"),
  numbered("Điền: Tên khóa học, Mô tả, Giá, Ảnh thumbnail"),
  numbered("Click **Chapters** → Tạo chương → Thêm **Lessons** (chỉ cần YouTube Video ID)"),
  numbered("Chuyển trạng thái → **Published**"),
  spacer(),
  tipBox("VIDEO ID", "Link: youtube.com/watch?v=abc123xyz → Video ID là: abc123xyz (phần sau dấu =)"),
  spacer(),

  h2("5.2 Quản lý đơn hàng"),
  p("Khi khách thanh toán, hệ thống **tự động**:"),
  bullet("Chuyển đơn **Pending** → **Paid** → Cấp quyền truy cập khóa học"),
  bullet("Gửi **email xác nhận** + Cộng **500 XP** (gamification)"),
  bullet("Tính **hoa hồng affiliate** (nếu có mã giới thiệu)"),
  spacer(),

  h2("5.3 Viết blog chuẩn SEO"),
  numbered("Vào **/admin/blog** → **Tạo bài mới**"),
  numbered("Viết tiêu đề hấp dẫn (chứa keyword) + nội dung tối thiểu 800 từ"),
  numbered("Thêm ảnh thumbnail + Điền **Focus Keyword**"),
  numbered("Xem **SEO Score** → Sửa cho đạt 80+ → **Published**"),
  spacer(),

  h2("5.4 Kiểm tra sức khỏe hệ thống"),
  p("Truy cập: **https://yourdomain.com/api/health** — tự động kiểm tra Database, Email, Thanh toán, Sản phẩm."),
  spacer(),

  new Paragraph({ children: [new PageBreak()] }),

  // ══════════════════════════════════════════════════
  // PHẦN 6: CẬP NHẬT
  // ══════════════════════════════════════════════════
  h1("PHẦN 6: CẬP NHẬT TÍNH NĂNG MỚI"),
  spacer(),
  h2("6.1 Khi giảng viên push update"),
  numbered("Vào GitHub → repo fork của bạn"),
  numbered("Thấy dòng **\"This branch is X commits behind\"**"),
  numbered("Click **Sync fork** → **Update branch**"),
  numbered("Vercel **tự động deploy** bản mới (2-3 phút)"),
  spacer(),
  tipBox("TẠI SAO KHÔNG LỖI?", "Vì customization nằm trong env vars trên Vercel, không nằm trong code. Khi Sync fork, code mới merge không bị conflict — trừ khi bạn tự sửa code (dùng Claude Code). Xem mục 6.2 nếu bị conflict."),
  spacer(),

  h2("6.2 Nếu bạn đã sửa code (dùng Claude Code) và bị conflict"),
  p("Khi bạn sửa code bằng Claude Code và giảng viên cũng update cùng file → sẽ bị **conflict**:"),
  spacer(),
  p("**Cách giải quyết đơn giản:**"),
  numbered("Mở Claude Code trong thư mục project"),
  numbered("Gõ: \"Tôi cần sync fork từ upstream, giải quyết conflict giữ lại thay đổi của tôi\""),
  numbered("Claude Code sẽ tự: fetch upstream → merge → resolve conflicts → push"),
  spacer(),
  p("**Cách giải quyết nhanh nhất** (nếu thay đổi ít):"),
  numbered("Trên GitHub: Delete fork → Fork lại từ đầu"),
  numbered("Dùng Claude Code sửa lại các thay đổi cũ (Claude nhớ những gì đã làm)"),
  numbered("Vercel tự deploy lại (env vars vẫn giữ nguyên)"),
  spacer(),

  h2("6.3 Nếu update cần chạy SQL mới"),
  numbered("Giảng viên thông báo tên file SQL cần chạy"),
  numbered("Vào Supabase → **SQL Editor** → Copy nội dung file → **Run**"),
  spacer(),

  new Paragraph({ children: [new PageBreak()] }),

  // ══════════════════════════════════════════════════
  // PHẦN 7: FAQ
  // ══════════════════════════════════════════════════
  h1("PHẦN 7: CÂU HỎI THƯỜNG GẶP (FAQ)"),
  spacer(),

  h3("Chi phí chạy website bao nhiêu?"),
  p("**Gần 0đ/tháng** khi bắt đầu: Vercel (0đ), Supabase (0đ), Resend (0đ), Cloudflare (0đ). Chỉ cần trả domain: 200-500k/năm."),
  spacer(),

  h3("Mua domain .com hay .vn?"),
  p("**.com** nếu muốn quốc tế hoặc phổ biến. **.vn** nếu chỉ bán tại Việt Nam và muốn thương hiệu Việt. Có thể mua cả hai rồi trỏ cùng 1 website."),
  spacer(),

  h3("Namecheap có hỗ trợ tiếng Việt không?"),
  p("Không, giao diện tiếng Anh. Nhưng thao tác đơn giản: tìm domain → thanh toán → xong. Nếu ngại tiếng Anh, mua .vn từ nhà cung cấp Việt Nam."),
  spacer(),

  h3("Domain mua rồi, đổi nhà cung cấp được không?"),
  p("**Được.** Domain là tài sản của bạn, có thể chuyển (transfer) sang nhà cung cấp khác bất kỳ lúc nào sau 60 ngày mua."),
  spacer(),

  h3("Claude Code có an toàn không?"),
  p("**Có.** Claude Code chạy trên máy bạn, code không gửi ra ngoài. API key là bí mật giữa bạn và Anthropic. Tất cả thay đổi đều hiển thị rõ để bạn review trước khi push."),
  spacer(),

  h3("Claude Code tốn bao nhiêu?"),
  p("Khoảng **$5-20/tháng** (~125k-500k) tùy mức sử dụng. Sửa nhỏ (đổi màu, thêm nội dung): ~$5. Sửa nhiều tính năng: ~$10-20. Rẻ hơn thuê developer hàng trăm lần."),
  spacer(),

  h3("Tôi không biết code, dùng Claude Code có được không?"),
  p("**Được.** Đó chính là mục đích của Claude Code: bạn mô tả bằng tiếng Việt, Claude Code viết code. Bạn chỉ cần biết chạy vài lệnh cơ bản (git push)."),
  spacer(),

  h3("Sửa code bằng Claude Code có ảnh hưởng Sync fork?"),
  p("**Có thể**, nếu sửa cùng file mà giảng viên cũng update. Giải pháp: sửa ít, hoặc dùng Claude Code giải quyết conflict (xem Phần 6.2)."),
  spacer(),

  h3("Website chậm / trắng trang?"),
  p("Supabase free tier ngủ sau 1 tuần không dùng. Vào Supabase Dashboard → click project → nó tỉnh lại. Hoặc upgrade Supabase Pro ($25/tháng)."),
  spacer(),

  h3("Cloudflare có bắt buộc không?"),
  p("Không bắt buộc nhưng **rất khuyến khích**. Miễn phí + bảo vệ + tăng tốc. Không có lý do để không dùng."),
  spacer(),

  h3("Đổi nameservers có ảnh hưởng email không?"),
  p("**Không**, nếu copy đúng tất cả DNS records sang Cloudflare. Cloudflare tự quét records cũ khi thêm domain."),
  spacer(),

  new Paragraph({ children: [new PageBreak()] }),

  // ══════════════════════════════════════════════════
  // PHẦN 8: CHECKLIST
  // ══════════════════════════════════════════════════
  h1("PHẦN 8: CHECKLIST TỔNG KẾT"),
  spacer(),
  p("Đánh dấu các bước đã hoàn thành:"),
  spacer(),

  h3("Bước 1: Mua Domain"),
  bullet("Chọn tên miền phù hợp (.com hoặc .vn)"),
  bullet("Mua domain tại Namecheap / inet.vn / nhanhoa.com"),
  bullet("Xác nhận email kích hoạt domain"),
  spacer(),

  h3("Bước 2-3: Code + Database"),
  bullet("Tạo tài khoản GitHub + Fork source code"),
  bullet("Tạo Supabase project + Chạy schema.sql + migrations"),
  bullet("Tạo 3 storage buckets"),
  spacer(),

  h3("Bước 4: Deploy Vercel"),
  bullet("Import repo → Điền env vars → Deploy thành công"),
  bullet("Website chạy trên your-project.vercel.app"),
  spacer(),

  h3("Bước 5: Cloudflare + Domain"),
  bullet("Đăng ký Cloudflare + Thêm domain"),
  bullet("Đổi nameservers về Cloudflare"),
  bullet("Thêm DNS records (A record + CNAME) trỏ về Vercel"),
  bullet("Kết nối domain trên Vercel"),
  bullet("Cấu hình SSL: Full (Strict) + Bật Bot Fight Mode"),
  spacer(),

  h3("Bước 6: Email"),
  bullet("Đăng ký Resend + Xác minh domain (thêm DNS trên Cloudflare)"),
  bullet("Lấy API Key + Thêm vào Vercel env vars"),
  spacer(),

  h3("Bước 7: Thanh toán"),
  bullet("Đăng ký PayOS + Cài webhook"),
  bullet("(Tùy chọn) Đăng ký SePay"),
  spacer(),

  h3("Bước 8: Thương hiệu + Admin"),
  bullet("Điền tất cả NEXT_PUBLIC_SITE_* env vars"),
  bullet("Tạo tài khoản → Set role admin trong Supabase"),
  spacer(),

  h3("Bonus: Claude Code"),
  bullet("Cài Claude Code (npm install -g @anthropic-ai/claude-code)"),
  bullet("Lấy API key từ console.anthropic.com"),
  bullet("Clone repo về máy + Chạy claude để tùy chỉnh"),
  spacer(),

  h3("Bắt đầu kinh doanh!"),
  bullet("Tạo khóa học đầu tiên"),
  bullet("Viết 3 bài blog SEO"),
  bullet("Cài email chào mừng học viên mới"),
  bullet("Chia sẻ link website!"),
  spacer(),

  tipBox("LỜI KHUYÊN CUỐI CÙNG",
    "Đừng cố làm hoàn hảo từ đầu. Bắt đầu với 1 khóa học, 1 landing page, 1 email. Khi có khách hàng đầu tiên, bạn sẽ biết cần làm gì tiếp. Còn cần sửa gì? Claude Code luôn sẵn sàng như một nhân viên code riêng của bạn. Hành động trước, hoàn thiện sau."),
);

// ══════════════════════════════════════════════════
// BUILD DOCUMENT
// ══════════════════════════════════════════════════
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: "Arial", size: 22 } },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: DARK },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: DARK },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "374151" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "•",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
      {
        reference: "numbers",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: PAGE_W, height: PAGE_H },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: "Tài Liệu Đào Tạo — Website All-in-One", size: 16, font: "Arial", color: GRAY, italics: true }),
          ],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB", space: 8 } },
          children: [
            new TextRun({ text: "Lê Đăng Khương Academy", size: 16, font: "Arial", color: GRAY }),
            new TextRun({ text: "  |  Trang ", size: 16, font: "Arial", color: GRAY }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, font: "Arial", color: GRAY }),
          ],
        })],
      }),
    },
    children,
  }],
});

const buffer = await Packer.toBuffer(doc);
const outputPath = "docs/TAI-LIEU-DAO-TAO-WEBSITE-ALL-IN-ONE.docx";
fs.writeFileSync(outputPath, buffer);
console.log(`Tạo tài liệu thành công: ${outputPath}`);
console.log(`Kích thước: ${(buffer.length / 1024).toFixed(0)} KB`);
