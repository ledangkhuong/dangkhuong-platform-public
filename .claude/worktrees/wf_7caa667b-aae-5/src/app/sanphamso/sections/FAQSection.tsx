"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { getZaloPhone } from "@/lib/site-config";

const FAQ_ITEMS = [
  {
    question: "Tôi không biết gì về công nghệ, có học được không?",
    answer:
      "Hoàn toàn có thể! Chương trình được thiết kế cho người MỚI BẮT ĐẦU. Thầy Khương sẽ hướng dẫn từng bước, có video minh họa chi tiết.",
  },
  {
    question: "Tôi không có vốn, có làm được không?",
    answer:
      "Đây là điểm mạnh của sản phẩm số! Bạn có thể bắt đầu với vốn gần như = 0. Chỉ cần laptop/điện thoại và internet.",
  },
  {
    question: "Học xong bao lâu thì có thu nhập?",
    answer:
      "Tùy mức độ áp dụng. Học viên chăm chỉ thường có doanh thu đầu tiên sau 30-60 ngày. Một số đã có 100 triệu/tháng sau 6 tháng.",
  },
  {
    question: "Khóa học diễn ra online hay offline?",
    answer:
      "100% ONLINE. Bạn có thể học mọi lúc, mọi nơi, học lại không giới hạn. Truy cập trọn đời.",
  },
  {
    question: "Sau khi đăng ký, tôi nhận được gì?",
    answer:
      "Bạn nhận ngay link truy cập khóa học, được add vào Group VIP và nhận đầy đủ 2 quà tặng qua email.",
  },
  {
    question: "Liên hệ hỗ trợ ở đâu?",
    answer:
      `📞 Hotline: ${getZaloPhone()} | 💬 Zalo: Liên hệ trực tiếp qua Zalo`,
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  const toggleItem = (index: number) => {
    setOpenIndex((prev) => (prev === index ? -1 : index));
  };

  return (
    <section
      className="relative overflow-hidden py-12 sm:py-20 md:py-28 px-4 sm:px-6"
      style={{ backgroundColor: "#0d0d0d" }}
    >
      <div className="mx-auto max-w-5xl">
        {/* Headline */}
        <h2
          className="mb-8 text-center text-2xl font-bold leading-tight sm:mb-14 sm:text-3xl md:mb-20 md:text-4xl lg:text-5xl"
          style={{ color: "#ffffff" }}
        >
          NHỮNG CÂU HỎI THƯỜNG GẶP
        </h2>

        {/* Accordion */}
        <div className="flex flex-col gap-4">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={index}
                className="rounded-xl"
                style={{
                  backgroundColor: "#111111",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {/* Question row */}
                <button
                  type="button"
                  onClick={() => toggleItem(index)}
                  className="flex w-full cursor-pointer items-center justify-between p-5 sm:p-6 text-left"
                >
                  <span
                    className="pr-4 text-[15px] font-semibold sm:text-base md:text-lg"
                    style={{ color: "#ffffff" }}
                  >
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

                {/* Answer */}
                {isOpen && (
                  <div className="px-5 pb-5 pt-0">
                    <p
                      className="text-[15px] leading-[1.8] sm:text-base"
                      style={{ color: "rgba(255,255,255,0.55)" }}
                    >
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
