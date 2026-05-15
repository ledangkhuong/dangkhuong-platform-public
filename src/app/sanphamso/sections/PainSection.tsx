"use client";

import { XCircle } from "lucide-react";

const PAIN_POINTS = [
  "Làm công ăn lương 8 tiếng/ngày, lương vẫn không đủ tiêu?",
  "Muốn kinh doanh online nhưng không biết bắt đầu từ đâu?",
  "Bán hàng truyền thống — Tồn kho, vốn nặng, lãi mỏng?",
  "Thấy người khác kiếm tiền online nhưng mình thì... mãi loay hoay?",
  "Đã thử nhiều khóa học nhưng vẫn không có kết quả?",
  "Sợ bị tụt hậu trong kỷ nguyên AI 2026?",
];

export default function PainSection() {
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
          BẠN CÓ ĐANG GẶP PHẢI
          <br className="hidden sm:block" />
          <span className="block sm:inline"> NHỮNG VẤN ĐỀ NÀY?</span>
        </h2>

        {/* Pain point cards grid */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          {PAIN_POINTS.map((text, index) => (
            <div
              key={index}
              className="flex items-start gap-4 rounded-2xl p-5 transition-all duration-300 hover:translate-y-[-2px] sm:p-6 md:p-7"
              style={{
                backgroundColor: "#111111",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <XCircle
                className="mt-0.5 h-6 w-6 flex-shrink-0"
                style={{ color: "#E63946" }}
                strokeWidth={2}
              />
              <span
                className="text-sm leading-relaxed sm:text-base md:text-lg"
                style={{ color: "rgba(255,255,255,0.85)" }}
              >
                {text}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom quote */}
        <p
          className="mx-auto mt-8 max-w-2xl text-center text-sm italic leading-relaxed sm:mt-12 sm:text-base md:mt-16 md:text-lg"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          Nếu bạn gật đầu với ít nhất 2 trong 6 vấn đề trên, đây chính là
          chương trình{" "}
          <span className="font-semibold" style={{ color: "#FBBF24" }}>
            DÀNH RIÊNG
          </span>{" "}
          cho bạn...
        </p>
      </div>
    </section>
  );
}
