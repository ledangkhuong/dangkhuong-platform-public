"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

/* ─── Data ───────────────────────────────────────────── */

const FAQ_ITEMS = [
  {
    question: "Em không giỏi tiếng Anh có học được không?",
    answer:
      "Hoàn toàn được! Khóa học giảng bằng tiếng Việt 100%. Kịch bản tiếng Anh có ChatGPT viết hộ. Voiceover dùng AI giọng bản xứ – bạn không cần đọc.",
  },
  {
    question: "VEO 3.1 tốn nhiều tiền không?",
    answer:
      "Mua tài khoản Ultra làm không giới hạn với chi phí vài trăm ngàn/tháng. Với 1 video kiếm $300-1.000, đây là khoản đầu tư siêu hời.",
  },
  {
    question: "Máy tính em yếu có làm được không?",
    answer:
      "VEO chạy trên cloud Google – không cần máy mạnh. CapCut nhẹ – chạy mượt trên laptop văn phòng. Thậm chí làm được trên iPad.",
  },
  {
    question: "Em chưa biết gì về AI, edit video có theo kịp không?",
    answer:
      "Khóa học thiết kế cho người mới hoàn toàn. Gói Đồng Hành có mentor dắt tay đến khi bạn ra được video đầu tiên.",
  },
  {
    question: "Bao lâu thì ra được video đầu tiên?",
    answer:
      "Gói Standard: 1-3 ngày (tự học). Gói Đồng Hành: 4 tiếng (có hỗ trợ).",
  },
  {
    question: "Có bị YouTube đánh bản quyền AI không?",
    answer:
      "Không – nếu làm đúng quy trình. Kênh Emma 372K subs vẫn monetize bình thường suốt 1 năm qua.",
  },
  {
    question: "Chỉ có 2 video hướng dẫn – liệu có đủ không?",
    answer:
      "Đủ – vì đi thẳng vào quy trình thực chiến. Chất lượng > Số lượng. Cộng Prompt + Âm thanh có sẵn, bạn không cần thêm gì.",
  },
  {
    question: "Khóa học có cập nhật không?",
    answer:
      "Có. Truy cập trọn đời + cập nhật Prompt theo phiên bản VEO mới (đặc biệt Gói Đồng Hành).",
  },
  {
    question: "Em đã có kênh YouTube, học có hợp không?",
    answer:
      "Hoàn toàn hợp. Có thể tạo channel mới hoặc thêm series Slow English vào kênh hiện tại.",
  },
  {
    question: "Thanh toán như thế nào?",
    answer:
      "Thanh toán qua chuyển khoản ngân hàng hoặc ví điện tử. Mua trực tiếp trên dangkhuong.com.",
  },
];

/* ─── Component ──────────────────────────────────────── */

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section
      id="faq"
      className="relative overflow-hidden"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        {/* ── Title ── */}
        <h2 className="mb-12 text-center text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
          Câu Hỏi{" "}
          <span style={{ color: "#FBBF24" }}>Thường Gặp</span>
        </h2>

        {/* ── Accordion ── */}
        <div className="flex flex-col gap-3">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={index}
                className="rounded-xl"
                style={{
                  backgroundColor: "#111",
                  border: "1px solid #1f1f1f",
                }}
              >
                {/* Question button */}
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="text-base font-semibold text-white sm:text-lg">
                    {item.question}
                  </span>
                  <ChevronDown
                    className="h-5 w-5 flex-shrink-0 transition-transform duration-300"
                    style={{
                      color: "#FBBF24",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  />
                </button>

                {/* Answer panel with smooth expand/collapse */}
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    maxHeight: isOpen ? "500px" : "0px",
                    opacity: isOpen ? 1 : 0,
                  }}
                >
                  <div
                    className="px-6 pb-5 text-sm leading-relaxed sm:text-base"
                    style={{ color: "#d1d5db" }}
                  >
                    {item.answer}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
