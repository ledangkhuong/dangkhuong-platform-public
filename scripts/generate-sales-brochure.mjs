import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  TableOfContents,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  LevelFormat,
  convertInchesToTwip,
  Tab,
  TabStopPosition,
  TabStopType,
  ExternalHyperlink,
} from "docx";
import * as fs from "fs";

// ─── Colors ───
const NAVY = "1a1a2e";
const GOLD = "D4A843";
const BLACK = "000000";
const WHITE = "FFFFFF";
const GRAY = "666666";
const LIGHT_GOLD = "FFF8E7";
const GREEN_BG = "E8F5E9";
const RED = "CC0000";

// ─── Helpers ───
function goldBorderBox(children) {
  return new Paragraph({
    border: {
      top: { style: BorderStyle.SINGLE, size: 6, color: GOLD },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD },
      left: { style: BorderStyle.SINGLE, size: 6, color: GOLD },
      right: { style: BorderStyle.SINGLE, size: 6, color: GOLD },
    },
    spacing: { before: 200, after: 200 },
    indent: { left: 360, right: 360 },
    children,
  });
}

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 200, after: 200 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 36,
        font: "Arial",
        color: NAVY,
      }),
    ],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 28,
        font: "Arial",
        color: NAVY,
      }),
    ],
  });
}

function bodyText(text, options = {}) {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    alignment: options.alignment || AlignmentType.LEFT,
    children: [
      new TextRun({
        text,
        size: 24,
        font: "Arial",
        color: options.color || BLACK,
        bold: options.bold || false,
        italics: options.italics || false,
        strike: options.strike || false,
      }),
    ],
  });
}

function pageBreakParagraph() {
  return new Paragraph({
    children: [new PageBreak()],
  });
}

function emptyParagraph(spacingBefore = 0) {
  return new Paragraph({
    spacing: { before: spacingBefore },
    children: [new TextRun({ text: "", size: 24, font: "Arial" })],
  });
}

function goldDivider() {
  return new Paragraph({
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 3, color: GOLD },
    },
    spacing: { before: 100, after: 100 },
    children: [],
  });
}

// Table cell helper
function makeCell(text, options = {}) {
  const {
    bold = false,
    color = BLACK,
    shading,
    width = 1500,
    alignment = AlignmentType.LEFT,
    font = "Arial",
    size = 20,
  } = options;

  const cellOptions = {
    width: { size: width, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment,
        children: [
          new TextRun({
            text,
            bold,
            size,
            font,
            color,
          }),
        ],
      }),
    ],
  };

  if (shading) {
    cellOptions.shading = {
      type: ShadingType.CLEAR,
      fill: shading,
      color: "auto",
    };
  }

  return new TableCell(cellOptions);
}

// ─── Numbering config for bullets ───
const numberingConfig = {
  config: [
    {
      reference: "bullet-list",
      levels: [
        {
          level: 0,
          format: LevelFormat.BULLET,
          text: "•",
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: {
              indent: { left: 720, hanging: 360 },
            },
          },
        },
      ],
    },
    {
      reference: "numbered-list",
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "%1.",
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: {
              indent: { left: 720, hanging: 360 },
            },
          },
        },
      ],
    },
    {
      reference: "bullet-gold",
      levels: [
        {
          level: 0,
          format: LevelFormat.BULLET,
          text: "•",
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: {
              indent: { left: 720, hanging: 360 },
            },
          },
        },
      ],
    },
    {
      reference: "bullet-red",
      levels: [
        {
          level: 0,
          format: LevelFormat.BULLET,
          text: "•",
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: {
              indent: { left: 720, hanging: 360 },
            },
          },
        },
      ],
    },
  ],
};

function bulletItem(text, reference = "bullet-list") {
  return new Paragraph({
    numbering: { reference, level: 0 },
    spacing: { before: 60, after: 60 },
    children: [
      new TextRun({
        text,
        size: 24,
        font: "Arial",
        color: BLACK,
      }),
    ],
  });
}

function numberedItem(text, reference = "numbered-list") {
  return new Paragraph({
    numbering: { reference, level: 0 },
    spacing: { before: 60, after: 60 },
    children: [
      new TextRun({
        text,
        size: 24,
        font: "Arial",
        color: BLACK,
      }),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════
// PAGE 1: COVER
// ═══════════════════════════════════════════════════════════════
const coverPage = [
  emptyParagraph(600),
  emptyParagraph(600),
  emptyParagraph(600),
  emptyParagraph(600),
  emptyParagraph(400),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
    children: [
      new TextRun({
        text: "SỞ HỮU NỀN TẢNG KINH DOANH SỐ ALL-IN-ONE",
        bold: true,
        size: 48,
        font: "Arial",
        color: GOLD,
      }),
    ],
  }),
  emptyParagraph(100),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 100 },
    children: [
      new TextRun({
        text: "Hệ thống website chuyên nghiệp dành cho chuyên gia, trainer & creator",
        size: 28,
        font: "Arial",
        color: NAVY,
      }),
    ],
  }),
  emptyParagraph(100),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 100 },
    children: [
      new TextRun({
        text: "Xây dựng bằng AI Agent — Sở hữu 100% mã nguồn",
        size: 24,
        font: "Arial",
        color: GRAY,
      }),
    ],
  }),
  emptyParagraph(600),
  emptyParagraph(600),
  emptyParagraph(600),
  emptyParagraph(400),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({
        text: "dangkhuong.com",
        bold: true,
        size: 32,
        font: "Arial",
        color: GOLD,
      }),
    ],
  }),
  pageBreakParagraph(),
];

// ═══════════════════════════════════════════════════════════════
// PAGE 2: TABLE OF CONTENTS
// ═══════════════════════════════════════════════════════════════
const tocPage = [
  heading1("Mục Lục"),
  goldDivider(),
  new TableOfContents("Mục Lục", {
    hyperlink: true,
    headingStyleRange: "1-2",
  }),
  pageBreakParagraph(),
];

// ═══════════════════════════════════════════════════════════════
// PAGE 3: VAN DE CUA CHUYEN GIA
// ═══════════════════════════════════════════════════════════════
const page3 = [
  heading1("Bạn Đang Trả Tiền Cho Bao Nhiêu Công Cụ?"),
  goldDivider(),
  bodyText(
    "Hầu hết chuyên gia, trainer và creator đang sử dụng từ 5–7 công cụ riêng biệt để vận hành kinh doanh online: Kajabi cho khóa học, Mailchimp cho email marketing, HubSpot cho CRM, WordPress cho blog, Circle cho cộng đồng, ClickFunnels cho landing pages, Google Analytics cho theo dõi hiệu suất."
  ),
  emptyParagraph(100),
  bodyText(
    "Chi phí hàng tháng: $500–$650/tháng = 150–195 triệu VNĐ/năm.",
    { bold: true }
  ),
  emptyParagraph(100),
  bodyText("Những vấn đề bạn đang gặp phải:", { bold: true }),
  bulletItem(
    "Không sở hữu data — nền tảng đóng là mất tất cả"
  ),
  bulletItem(
    "Phụ thuộc nền tảng — tăng giá bất ngờ, thay đổi chính sách"
  ),
  bulletItem(
    "Dữ liệu phân tán — không biết khách hàng nào cần chăm sóc"
  ),
  bulletItem(
    "Giới hạn tùy biến — không thể tùy chỉnh theo ý muốn"
  ),
  bulletItem(
    "Không kết nối — mỗi tool một nơi, dữ liệu không chạy về một chỗ"
  ),
  pageBreakParagraph(),
];

// ═══════════════════════════════════════════════════════════════
// PAGE 4-5: GIAI PHAP
// ═══════════════════════════════════════════════════════════════
const modules = [
  {
    title: "1. Bán khóa học online",
    desc: "Chapters, lessons, video YouTube, quiz, chứng chỉ hoàn thành. Học viên thanh toán xong được cấp quyền tự động.",
  },
  {
    title: "2. CRM & Pipeline bán hàng",
    desc: "Quản lý contacts, deals, journey 7 giai đoạn (visitor → lead → contacted → qualified → negotiation → customer → advocate). Phân công sale, theo dõi hiệu suất.",
  },
  {
    title: "3. Email Marketing & Automation",
    desc: "Campaigns, flow builder trực quan, 4 sequences tự động (Welcome, Post-Purchase, Re-engagement, Event). 17 email storytelling sẵn.",
  },
  {
    title: "4. Marketing Analytics",
    desc: "7 dashboard: Tổng quan, Kênh marketing, Chiến dịch, Phễu chuyển đổi, Landing pages, Nguồn khách, Tạo link UTM.",
  },
  {
    title: "5. Affiliate System",
    desc: "Hoa hồng 20% (tùy chỉnh 1–50%), tracking 90 ngày, dashboard riêng cho affiliate, thanh toán tự động.",
  },
  {
    title: "6. Community & Gamification",
    desc: "Forum 5 kênh, XP system, leaderboard, streak tracking. Học viên tương tác và hỗ trợ nhau.",
  },
  {
    title: "7. Blog & SEO",
    desc: "Editor, categories, tags, RSS feed, JSON-LD schema, OpenGraph. Kéo traffic miễn phí từ Google.",
  },
  {
    title: "8. Landing Pages",
    desc: "8 templates sẵn, form đăng ký, QR thanh toán, popup thành công với Zalo group.",
  },
  {
    title: "9. Mã giảm giá",
    desc: "Tạo coupon (% hoặc cố định), giới hạn lượt dùng, đơn tối thiểu, hết hạn. Validate + claim tự động.",
  },
  {
    title: "10. Thanh toán Việt Nam",
    desc: "Sepay + PayOS, QR code, auto-confirm 60 giây, hỗ trợ 16+ ngân hàng VN.",
  },
  {
    title: "11. Events & Webinar",
    desc: "Quản lý sự kiện, RSVP, hỗ trợ Zoom/Google Meet/Facebook Live, nhắc nhở tự động.",
  },
  {
    title: "12. Admin Panel",
    desc: "Quản lý đơn hàng, users, khóa học, analytics, coupon, blog, pixel — tất cả trong một dashboard.",
  },
  {
    title: "13. Meta Pixel & CAPI",
    desc: "Facebook Pixel + Conversions API, event tracking, dedup, test event code.",
  },
  {
    title: "14. Bảo mật cấp doanh nghiệp",
    desc: "Content Security Policy, Row Level Security, rate limiting, audit logging, 7 security headers.",
  },
  {
    title: "15. Responsive Design",
    desc: "Mobile-first, dark theme chuyên nghiệp, 50+ trang tối ưu trên mọi thiết bị.",
  },
];

const page4_5 = [
  heading1("Một Hệ Thống — Thay Thế Tất Cả"),
  goldDivider(),
  bodyText(
    "dangkhuong.com tích hợp 15 modules trong một nền tảng duy nhất. Bạn sở hữu 100% mã nguồn, không phụ thuộc bất kỳ SaaS nào."
  ),
  emptyParagraph(100),
  ...modules.flatMap((m) => [heading2(m.title), bodyText(m.desc)]),
  pageBreakParagraph(),
];

// ═══════════════════════════════════════════════════════════════
// PAGE 6: SO SANH CHI PHI
// ═══════════════════════════════════════════════════════════════

const colWidthsCost = [4500, 3000, 3500];
const totalCostWidth = colWidthsCost.reduce((a, b) => a + b, 0);

function costHeaderCell(text, width) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    shading: { type: ShadingType.CLEAR, fill: NAVY, color: "auto" },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text,
            bold: true,
            size: 22,
            font: "Arial",
            color: WHITE,
          }),
        ],
      }),
    ],
  });
}

const costTable = new Table({
  width: { size: totalCostWidth, type: WidthType.DXA },
  columnWidths: colWidthsCost,
  rows: [
    // Header row
    new TableRow({
      children: [
        costHeaderCell("Dịch vụ", colWidthsCost[0]),
        costHeaderCell("Chi phí/tháng", colWidthsCost[1]),
        costHeaderCell("Chi phí/năm", colWidthsCost[2]),
      ],
    }),
    // Data rows
    new TableRow({
      children: [
        makeCell("Kajabi (khóa học + marketing)", { width: colWidthsCost[0] }),
        makeCell("$199", { width: colWidthsCost[1], alignment: AlignmentType.CENTER }),
        makeCell("60.000.000đ", { width: colWidthsCost[2], alignment: AlignmentType.CENTER }),
      ],
    }),
    new TableRow({
      children: [
        makeCell("GoHighLevel (CRM + automation)", { width: colWidthsCost[0] }),
        makeCell("$297", { width: colWidthsCost[1], alignment: AlignmentType.CENTER }),
        makeCell("89.000.000đ", { width: colWidthsCost[2], alignment: AlignmentType.CENTER }),
      ],
    }),
    new TableRow({
      children: [
        makeCell("ActiveCampaign (email)", { width: colWidthsCost[0] }),
        makeCell("$49", { width: colWidthsCost[1], alignment: AlignmentType.CENTER }),
        makeCell("15.000.000đ", { width: colWidthsCost[2], alignment: AlignmentType.CENTER }),
      ],
    }),
    new TableRow({
      children: [
        makeCell("Circle (community)", { width: colWidthsCost[0] }),
        makeCell("$89", { width: colWidthsCost[1], alignment: AlignmentType.CENTER }),
        makeCell("27.000.000đ", { width: colWidthsCost[2], alignment: AlignmentType.CENTER }),
      ],
    }),
    new TableRow({
      children: [
        makeCell("Affiliatly (affiliate)", { width: colWidthsCost[0] }),
        makeCell("$16", { width: colWidthsCost[1], alignment: AlignmentType.CENTER }),
        makeCell("5.000.000đ", { width: colWidthsCost[2], alignment: AlignmentType.CENTER }),
      ],
    }),
    // TOTAL SaaS row - gold background
    new TableRow({
      children: [
        makeCell("TỔNG SaaS", {
          width: colWidthsCost[0],
          bold: true,
          shading: LIGHT_GOLD,
        }),
        makeCell("$650/tháng", {
          width: colWidthsCost[1],
          bold: true,
          shading: LIGHT_GOLD,
          alignment: AlignmentType.CENTER,
        }),
        makeCell("195.000.000đ/năm", {
          width: colWidthsCost[2],
          bold: true,
          shading: LIGHT_GOLD,
          alignment: AlignmentType.CENTER,
        }),
      ],
    }),
    // dangkhuong.com row - green background
    new TableRow({
      children: [
        makeCell("dangkhuong.com", {
          width: colWidthsCost[0],
          bold: true,
          color: NAVY,
          shading: GREEN_BG,
        }),
        makeCell("10–20M MỘT LẦN", {
          width: colWidthsCost[1],
          bold: true,
          color: NAVY,
          shading: GREEN_BG,
          alignment: AlignmentType.CENTER,
        }),
        makeCell("Hosting ~7.5M/năm", {
          width: colWidthsCost[2],
          bold: true,
          color: NAVY,
          shading: GREEN_BG,
          alignment: AlignmentType.CENTER,
        }),
      ],
    }),
  ],
});

const page6 = [
  heading1("So Sánh Chi Phí: SaaS vs Sở Hữu Code"),
  goldDivider(),
  bodyText(
    "Khi bạn thuê SaaS, bạn trả tiền mãi mãi mà không bao giờ sở hữu gì. Với dangkhuong.com, bạn đầu tư một lần và sở hữu vĩnh viễn."
  ),
  emptyParagraph(100),
  costTable,
  emptyParagraph(100),
  bodyText(
    "ROI: Hoàn vốn sau 1 tháng. Tiết kiệm 187 triệu đồng mỗi năm.",
    { bold: true }
  ),
  pageBreakParagraph(),
];

// ═══════════════════════════════════════════════════════════════
// PAGE 7: SO SANH TINH NANG
// ═══════════════════════════════════════════════════════════════

const featureColWidths = [2800, 1700, 1500, 1600, 1900, 1700];
const totalFeatureWidth = featureColWidths.reduce((a, b) => a + b, 0);

function featureHeaderCell(text, width) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    shading: { type: ShadingType.CLEAR, fill: NAVY, color: "auto" },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text,
            bold: true,
            size: 18,
            font: "Arial",
            color: WHITE,
          }),
        ],
      }),
    ],
  });
}

function featureSectionCell(text) {
  return new TableRow({
    children: featureColWidths.map((w, i) =>
      new TableCell({
        width: { size: w, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        shading: { type: ShadingType.CLEAR, fill: "E8E8E8", color: "auto" },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: i === 0 ? text : "",
                bold: true,
                size: 18,
                font: "Arial",
                color: NAVY,
              }),
            ],
          }),
        ],
      })
    ),
  });
}

function yesNoCell(value, width) {
  if (value === "Có") {
    return makeCell("Có", {
      width,
      color: GOLD,
      bold: true,
      size: 18,
      alignment: AlignmentType.CENTER,
    });
  } else if (value === "Không") {
    return makeCell("Không", {
      width,
      color: GRAY,
      size: 18,
      alignment: AlignmentType.CENTER,
    });
  } else {
    return makeCell(value, {
      width,
      color: GRAY,
      size: 18,
      alignment: AlignmentType.CENTER,
    });
  }
}

function featureRow(feature, dk, kaj, teach, ghl, wp) {
  return new TableRow({
    children: [
      makeCell(feature, { width: featureColWidths[0], size: 18 }),
      yesNoCell(dk, featureColWidths[1]),
      yesNoCell(kaj, featureColWidths[2]),
      yesNoCell(teach, featureColWidths[3]),
      yesNoCell(ghl, featureColWidths[4]),
      yesNoCell(wp, featureColWidths[5]),
    ],
  });
}

const featureTable = new Table({
  width: { size: totalFeatureWidth, type: WidthType.DXA },
  columnWidths: featureColWidths,
  rows: [
    // Header
    new TableRow({
      children: [
        featureHeaderCell("Tính năng", featureColWidths[0]),
        featureHeaderCell("dangkhuong.com", featureColWidths[1]),
        featureHeaderCell("Kajabi", featureColWidths[2]),
        featureHeaderCell("Teachable", featureColWidths[3]),
        featureHeaderCell("GoHighLevel", featureColWidths[4]),
        featureHeaderCell("WordPress", featureColWidths[5]),
      ],
    }),
    // KHOA HOC
    featureSectionCell("KHÓA HỌC"),
    featureRow("Bán khóa học", "Có", "Có", "Có", "Không", "Có"),
    featureRow("Quiz & chứng chỉ", "Có", "Có", "Có", "Không", "Có"),
    // MARKETING
    featureSectionCell("MARKETING"),
    featureRow("Email automation", "Có", "Có", "Không", "Có", "Không"),
    featureRow("Marketing dashboard (7 trang)", "Có", "Có", "Không", "Có", "Không"),
    featureRow("UTM Builder", "Có", "Không", "Không", "Không", "Không"),
    featureRow("Meta Pixel + CAPI", "Có", "Không", "Không", "Có", "Không"),
    // CRM
    featureSectionCell("CRM"),
    featureRow("CRM & Pipeline", "Có", "Không", "Không", "Có", "Không"),
    featureRow("Journey stages", "Có", "Không", "Không", "Có", "Không"),
    // CONG DONG
    featureSectionCell("CỘNG ĐỒNG"),
    featureRow("Community + XP", "Có", "Có", "Không", "Không", "Không"),
    featureRow("Leaderboard", "Có", "Không", "Không", "Không", "Không"),
    // KHAC
    featureSectionCell("KHÁC"),
    featureRow("Affiliate", "Có", "Có", "Có", "Có", "Có"),
    featureRow("Blog SEO", "Có", "Có", "Không", "Có", "Có"),
    featureRow("Bảo mật (CSP, RLS)", "Có", "N/A", "N/A", "N/A", "Không"),
    featureRow("Sở hữu 100% code", "Có", "Không", "Không", "Không", "Có"),
    featureRow("Sở hữu data", "Có", "Không", "Không", "Không", "Có"),
    // TOTAL
    new TableRow({
      children: [
        makeCell("TỔNG", {
          width: featureColWidths[0],
          bold: true,
          size: 18,
          shading: LIGHT_GOLD,
        }),
        makeCell("43/44", {
          width: featureColWidths[1],
          bold: true,
          color: GOLD,
          size: 18,
          alignment: AlignmentType.CENTER,
          shading: LIGHT_GOLD,
        }),
        makeCell("25/44", {
          width: featureColWidths[2],
          bold: true,
          size: 18,
          alignment: AlignmentType.CENTER,
          shading: LIGHT_GOLD,
        }),
        makeCell("19/44", {
          width: featureColWidths[3],
          bold: true,
          size: 18,
          alignment: AlignmentType.CENTER,
          shading: LIGHT_GOLD,
        }),
        makeCell("27/44", {
          width: featureColWidths[4],
          bold: true,
          size: 18,
          alignment: AlignmentType.CENTER,
          shading: LIGHT_GOLD,
        }),
        makeCell("21/44", {
          width: featureColWidths[5],
          bold: true,
          size: 18,
          alignment: AlignmentType.CENTER,
          shading: LIGHT_GOLD,
        }),
      ],
    }),
  ],
});

const page7 = [
  heading1("So Sánh Tính Năng Chi Tiết"),
  goldDivider(),
  featureTable,
  pageBreakParagraph(),
];

// ═══════════════════════════════════════════════════════════════
// PAGE 8: CONG NGHE
// ═══════════════════════════════════════════════════════════════
const techItems = [
  {
    name: "Next.js 16",
    desc: " — React framework #1 thế giới, Server Components, Turbopack",
  },
  {
    name: "Supabase",
    desc: " — PostgreSQL + Auth + Realtime, open-source Firebase alternative",
  },
  {
    name: "Vercel",
    desc: " — Edge hosting, auto-deploy từ GitHub, SSL miễn phí, CDN toàn cầu",
  },
  {
    name: "Resend",
    desc: " — Email delivery hiện đại, DKIM tự động, 100 email/ngày miễn phí",
  },
  {
    name: "TypeScript",
    desc: " — Type-safe, dễ bảo trì, IDE support tốt nhất",
  },
  {
    name: "Tailwind CSS",
    desc: " — Responsive design, dark theme, utility-first",
  },
];

const page8 = [
  heading1("Xây Dựng Trên Công Nghệ Hàng Đầu"),
  goldDivider(),
  emptyParagraph(100),
  ...techItems.map(
    (item) =>
      new Paragraph({
        spacing: { before: 120, after: 120 },
        children: [
          new TextRun({
            text: item.name,
            bold: true,
            size: 26,
            font: "Arial",
            color: NAVY,
          }),
          new TextRun({
            text: item.desc,
            size: 24,
            font: "Arial",
            color: BLACK,
          }),
        ],
      })
  ),
  emptyParagraph(200),
  goldBorderBox([
    new TextRun({
      text: "Được xây dựng bằng AI Agent — quy trình mà bạn sẽ được học",
      bold: true,
      size: 24,
      font: "Arial",
      color: GOLD,
    }),
  ]),
  pageBreakParagraph(),
];

// ═══════════════════════════════════════════════════════════════
// PAGE 9: BAN NHAN DUOC GI
// ═══════════════════════════════════════════════════════════════
const deliverables = [
  "Full source code (GitHub private repo access)",
  "150.000+ dòng TypeScript production-ready",
  "50+ trang dashboard đã thiết kế",
  "8 landing page templates (đã tối ưu conversion)",
  "15 modules tích hợp liên kết",
  "Database migrations (tự động tạo schema)",
  "Hướng dẫn cài đặt + deploy lên Vercel",
  "Hướng dẫn cập nhật (UPDATE-GUIDE.md)",
  "17 email automation templates (storytelling 500–800 từ)",
  "7 marketing analytics dashboards",
  "Coupon system sẵn sàng sử dụng",
  "Thanh toán Việt Nam (Sepay + PayOS) đã tích hợp",
];

const page9 = [
  heading1("Trọn Bộ Giao Cho Bạn"),
  goldDivider(),
  emptyParagraph(100),
  ...deliverables.map((d) => numberedItem(d)),
  pageBreakParagraph(),
];

// ═══════════════════════════════════════════════════════════════
// PAGE 10: GIA & UU DAI
// ═══════════════════════════════════════════════════════════════
const page10 = [
  heading1("Đầu Tư Một Lần — Sở Hữu Vĩnh Viễn"),
  goldDivider(),
  emptyParagraph(200),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 100 },
    children: [
      new TextRun({
        text: "Giá thường: ",
        size: 24,
        font: "Arial",
        color: GRAY,
      }),
      new TextRun({
        text: "20.000.000đ",
        size: 24,
        font: "Arial",
        color: GRAY,
        strike: true,
      }),
    ],
  }),
  emptyParagraph(100),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 100 },
    children: [
      new TextRun({
        text: "EARLY BIRD: 10.000.000đ",
        bold: true,
        size: 48,
        font: "Arial",
        color: GOLD,
      }),
    ],
  }),
  emptyParagraph(100),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 100 },
    children: [
      new TextRun({
        text: "Bằng 1 tháng thuê SaaS — nhưng sở hữu vĩnh viễn",
        size: 24,
        font: "Arial",
        color: NAVY,
        italics: true,
      }),
    ],
  }),
  emptyParagraph(200),
  bodyText("Bao gồm trong giá:", { bold: true }),
  bulletItem("Toàn bộ source code 150.000+ dòng"),
  bulletItem("15 modules All-In-One"),
  bulletItem("Hướng dẫn cài đặt & deploy"),
  bulletItem("Cập nhật miễn phí (git pull)"),
  bulletItem("Hỗ trợ qua cộng đồng"),
  emptyParagraph(200),
  bodyText(
    "Không phí hàng tháng. Không phí ẩn. Không giới hạn học viên.",
    { bold: true }
  ),
  pageBreakParagraph(),
];

// ═══════════════════════════════════════════════════════════════
// PAGE 11: DANH CHO AI
// ═══════════════════════════════════════════════════════════════
const page11 = [
  heading1("Nền Tảng Này Dành Cho Bạn Nếu..."),
  goldDivider(),
  emptyParagraph(100),
  new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({
        text: "DÀNH CHO BẠN NẾU:",
        bold: true,
        size: 26,
        font: "Arial",
        color: GOLD,
      }),
    ],
  }),
  bulletItem(
    "Chuyên gia, trainer, coach muốn bán khóa học online"
  ),
  bulletItem(
    "Creator muốn xây thương hiệu cá nhân + cộng đồng"
  ),
  bulletItem(
    "Người bán sản phẩm số (ebook, template, phần mềm)"
  ),
  bulletItem(
    "Affiliate marketer muốn hệ thống riêng"
  ),
  bulletItem(
    "Agency muốn white-label cho khách hàng"
  ),
  bulletItem(
    "Developer muốn base code chất lượng cao"
  ),
  emptyParagraph(200),
  new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({
        text: "KHÔNG DÀNH CHO BẠN NẾU:",
        bold: true,
        size: 26,
        font: "Arial",
        color: RED,
      }),
    ],
  }),
  bulletItem(
    "Muốn kết quả mà không hành động"
  ),
  bulletItem(
    "Không sẵn sàng học công nghệ cơ bản"
  ),
  bulletItem(
    "Chỉ muốn cái vỏ website đẹp, không cần hệ thống"
  ),
  bulletItem(
    "Tìm cách \"làm giàu nhanh\" không cần nỗ lực"
  ),
  pageBreakParagraph(),
];

// ═══════════════════════════════════════════════════════════════
// PAGE 12: CTA
// ═══════════════════════════════════════════════════════════════
const page12 = [
  heading1("Bắt Đầu Ngay Hôm Nay"),
  goldDivider(),
  emptyParagraph(200),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 100 },
    children: [
      new TextRun({
        text: "Số lượng Early Bird có hạn",
        size: 28,
        font: "Arial",
        color: NAVY,
        bold: true,
      }),
    ],
  }),
  emptyParagraph(100),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 100 },
    children: [
      new TextRun({
        text: "10.000.000đ",
        bold: true,
        size: 52,
        font: "Arial",
        color: GOLD,
      }),
    ],
  }),
  emptyParagraph(100),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 100 },
    children: [
      new TextRun({
        text: "Liên hệ ngay để nhận quyền truy cập",
        size: 24,
        font: "Arial",
        color: NAVY,
      }),
    ],
  }),
  emptyParagraph(200),
  goldDivider(),
  emptyParagraph(100),
  new Paragraph({
    spacing: { before: 100, after: 60 },
    children: [
      new TextRun({
        text: "Website: ",
        bold: true,
        size: 24,
        font: "Arial",
        color: NAVY,
      }),
      new TextRun({
        text: "dangkhuong.com",
        size: 24,
        font: "Arial",
        color: GOLD,
      }),
    ],
  }),
  new Paragraph({
    spacing: { before: 60, after: 100 },
    children: [
      new TextRun({
        text: "Zalo Group: ",
        bold: true,
        size: 24,
        font: "Arial",
        color: NAVY,
      }),
      new TextRun({
        text: "zalo.me/g/mwrjxixtjhe0aed8fkdf",
        size: 24,
        font: "Arial",
        color: GOLD,
      }),
    ],
  }),
  emptyParagraph(200),
  goldBorderBox([
    new TextRun({
      text: "Mỗi ngày bạn chưa có hệ thống riêng, là một ngày bạn đang xây nhà trên đất người khác.",
      bold: true,
      size: 24,
      font: "Arial",
      color: NAVY,
      italics: true,
    }),
  ]),
  emptyParagraph(300),
  goldDivider(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 100 },
    children: [
      new TextRun({
        text: "dangkhuong.com | Lê Đăng Khương Academy",
        size: 20,
        font: "Arial",
        color: GRAY,
      }),
    ],
  }),
];

// ═══════════════════════════════════════════════════════════════
// DOCUMENT
// ═══════════════════════════════════════════════════════════════
const doc = new Document({
  numbering: numberingConfig,
  styles: {
    default: {
      document: {
        run: {
          font: "Arial",
          size: 24,
          color: BLACK,
        },
      },
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: {
          font: "Arial",
          size: 36,
          bold: true,
          color: NAVY,
        },
        paragraph: {
          spacing: { before: 240, after: 120 },
          outlineLevel: 0,
        },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: {
          font: "Arial",
          size: 28,
          bold: true,
          color: NAVY,
        },
        paragraph: {
          spacing: { before: 200, after: 100 },
          outlineLevel: 1,
        },
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: {
            width: 12240,
            height: 15840,
          },
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: "dangkhuong.com",
                  size: 18,
                  font: "Arial",
                  color: GOLD,
                  italics: true,
                }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  children: [PageNumber.CURRENT],
                  size: 18,
                  font: "Arial",
                  color: GRAY,
                }),
              ],
            }),
          ],
        }),
      },
      children: [
        ...coverPage,
        ...tocPage,
        ...page3,
        ...page4_5,
        ...page6,
        ...page7,
        ...page8,
        ...page9,
        ...page10,
        ...page11,
        ...page12,
      ],
    },
  ],
});

// ─── Generate ───
const outputPath = "D:\\AI Agent\\dangkhuong-platform\\Sales-Brochure-DangKhuong-Platform.docx";

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outputPath, buffer);

console.log(`Sales brochure generated successfully: ${outputPath}`);
console.log(`File size: ${(buffer.length / 1024).toFixed(1)} KB`);
