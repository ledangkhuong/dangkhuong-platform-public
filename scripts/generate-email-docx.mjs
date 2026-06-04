import { Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak, Header, Footer, PageNumber, TableOfContents, AlignmentType } from "docx";
import fs from "fs";

const raw = fs.readFileSync("email-review.txt", "utf-8");

// Parse emails from the text file
const emailBlocks = raw.split(/={50,}\n/).filter(b => b.trim());
const emails = [];
for (let i = 0; i < emailBlocks.length; i += 2) {
  const headerLine = emailBlocks[i].trim();
  const body = emailBlocks[i + 1]?.trim() || "";
  const subjectMatch = headerLine.match(/Subject:\s*(.+)/);
  const numMatch = headerLine.match(/Email\s+(\d+)/);
  if (subjectMatch) {
    emails.push({
      num: numMatch ? parseInt(numMatch[1]) : i / 2 + 1,
      subject: subjectMatch[1].trim(),
      body: body,
    });
  }
}

// Group into sequences
const sequences = [
  { title: "Welcome Sequence", subtitle: "Chuoi 5 email chao mung nguoi dung moi", emails: emails.slice(0, 5), trigger: "Trigger: Tag 'new_user' duoc gan" },
  { title: "Post-Purchase Sequence", subtitle: "Chuoi 5 email sau khi mua hang", emails: emails.slice(5, 10), trigger: "Trigger: Sau khi thanh toan thanh cong" },
  { title: "Re-engagement Sequence", subtitle: "Chuoi 3 email tai kich hoat nguoi dung", emails: emails.slice(10, 13), trigger: "Trigger: Tag 'inactive_30d' duoc gan" },
  { title: "Event/Webinar Sequence", subtitle: "Chuoi 4 email su kien Zoom", emails: emails.slice(13, 17), trigger: "Trigger: Tag 'event_registered' duoc gan" },
];

const waitDays = [
  [0, 1, 2, 2, 2],      // Welcome
  [0, 3, 4, 7, 16],     // Post-Purchase
  [0, 3, 4],             // Re-engagement
  [0, 5, 2, 2],          // Event
];

// Build document
const children = [];

// Title page
children.push(
  new Paragraph({ spacing: { before: 4000 }, children: [] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: "NỘI DUNG EMAIL AUTOMATION", bold: true, size: 48, font: "Arial", color: "D4A843" })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [new TextRun({ text: "Lê Đăng Khương Academy", size: 28, font: "Arial", color: "666666" })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: "dangkhuong.com", size: 24, font: "Arial", color: "999999" })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
    children: [new TextRun({ text: `4 Sequences • 17 Emails • Storytelling Style`, size: 22, font: "Arial", color: "999999" })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: `Ngày tạo: 30/05/2026`, size: 20, font: "Arial", color: "AAAAAA" })],
  }),
  new Paragraph({ children: [new PageBreak()] }),
);

// Table of Contents
children.push(
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Mục Lục")] }),
  new TableOfContents("TOC", { hyperlink: true, headingStyleRange: "1-3" }),
  new Paragraph({ children: [new PageBreak()] }),
);

// Each sequence
for (let si = 0; si < sequences.length; si++) {
  const seq = sequences[si];

  // Sequence heading
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 100 },
      children: [new TextRun(`${si + 1}. ${seq.title}`)],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: seq.subtitle, italics: true, size: 22, color: "888888" })],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: seq.trigger, size: 20, color: "D4A843", bold: true })],
    }),
    new Paragraph({
      spacing: { after: 300 },
      children: [new TextRun({ text: `Tổng: ${seq.emails.length} emails`, size: 20, color: "888888" })],
    }),
  );

  // Each email in sequence
  for (let ei = 0; ei < seq.emails.length; ei++) {
    const email = seq.emails[ei];
    const wait = waitDays[si][ei];

    // Wait indicator
    if (wait > 0) {
      children.push(
        new Paragraph({
          spacing: { before: 200, after: 200 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `--- Chờ ${wait} ngày ---`, size: 20, color: "D4A843", italics: true })],
        }),
      );
    }

    // Email heading
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
        children: [new TextRun(`Email ${email.num}: ${email.subject}`)],
      }),
    );

    // Email body - split into paragraphs
    const lines = email.body.split("\n").filter(l => l.trim());
    for (const line of lines) {
      const trimmed = line.trim();

      // CTA buttons
      if (["Đăng nhập ngay", "Đọc thêm về hành trình của tôi", "Xem bài học này",
           "Vào cộng đồng xem thêm", "Đăng ký Zoom 100K", "Vào khóa học ngay",
           "Tiếp tục học", "Vào cộng đồng", "Xem combo ưu đãi", "Tham gia affiliate",
           "Quay lại xem gì mới", "Xem cộng đồng", "Nhận ưu đãi 50%",
           "Vào nhóm Zalo chuẩn bị", "Lưu link Zoom", "Xem replay ngay", "Nhận ưu đãi"
          ].includes(trimmed)) {
        children.push(
          new Paragraph({
            spacing: { before: 200, after: 200 },
            children: [new TextRun({ text: `[ ${trimmed} ]`, bold: true, size: 24, color: "D4A843" })],
          }),
        );
      } else if (trimmed.startsWith("P.S.") || trimmed.startsWith("-- Le Dang Khuong")) {
        children.push(
          new Paragraph({
            spacing: { before: 100, after: 60 },
            children: [new TextRun({ text: trimmed, italics: true, size: 20, color: "888888" })],
          }),
        );
      } else {
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [new TextRun({ text: trimmed, size: 22 })],
          }),
        );
      }
    }

    // Separator between emails
    if (ei < seq.emails.length - 1) {
      children.push(
        new Paragraph({
          spacing: { before: 300, after: 300 },
          border: { bottom: { style: "single", size: 6, color: "D4A843", space: 1 } },
          children: [],
        }),
      );
    }
  }

  // Page break between sequences
  if (si < sequences.length - 1) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: "D4A843" },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 },
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "Email Automation — Lê Đăng Khương Academy", size: 16, color: "AAAAAA", font: "Arial" })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Trang ", size: 16, color: "AAAAAA" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "AAAAAA" }),
          ],
        })],
      }),
    },
    children,
  }],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync("Email-Automation-Content.docx", buffer);
console.log("Done! File: Email-Automation-Content.docx (" + Math.round(buffer.length / 1024) + " KB)");
