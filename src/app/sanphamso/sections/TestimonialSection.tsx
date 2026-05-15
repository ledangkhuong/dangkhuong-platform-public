"use client";

import { MessageCircle, Star } from "lucide-react";

const TESTIMONIALS = [
  {
    quote:
      "Sau 30 ngày áp dụng, em đã bán được khóa học đầu tiên với doanh thu 15 triệu. Thầy Khương dạy rất tâm huyết và thực chiến!",
    author: "Chị Mai Anh, 32 tuổi, Hà Nội",
    revenue: "15 triệu",
  },
  {
    quote:
      "Trước đây em loay hoay không biết bán gì online. Sau khóa học, em đã có ebook bán chạy 200 đơn/tháng, thu nhập thụ động 20 triệu!",
    author: "Anh Tuấn, 28 tuổi, TP.HCM",
    revenue: "20 triệu/tháng",
  },
  {
    quote:
      "Hệ thống bán hàng tự động giúp em có thời gian chăm con. Doanh thu vẫn đều 30-50 triệu/tháng. Cảm ơn Thầy!",
    author: "Chị Hương, 35 tuổi, Đà Nẵng",
    revenue: "30-50 triệu/tháng",
  },
];

export default function TestimonialSection() {
  return (
    <section
      className="relative overflow-hidden py-12 sm:py-20 md:py-28 px-4 sm:px-6"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div className="mx-auto max-w-5xl">
        {/* Headline */}
        <h2
          className="mb-8 text-center text-2xl font-bold leading-tight sm:mb-14 sm:text-3xl md:mb-20 md:text-4xl lg:text-5xl"
          style={{ color: "#ffffff" }}
        >
          HỌC VIÊN NÓI GÌ VỀ CHƯƠNG TRÌNH?
        </h2>

        {/* Testimonial cards grid */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((item, index) => (
            <div
              key={index}
              className="flex flex-col rounded-2xl p-6 transition-all duration-300 hover:translate-y-[-2px]"
              style={{
                backgroundColor: "#111111",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {/* Quote icon */}
              <MessageCircle
                className="mb-4 h-8 w-8"
                style={{ color: "#FBBF24" }}
                strokeWidth={2}
              />

              {/* Stars */}
              <div className="mb-4 flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4"
                    style={{ color: "#FBBF24", fill: "#FBBF24" }}
                  />
                ))}
              </div>

              {/* Quote text */}
              <p
                className="mb-5 flex-1 text-sm italic leading-relaxed sm:text-base"
                style={{ color: "rgba(255,255,255,0.75)" }}
              >
                &ldquo;{item.quote}&rdquo;
              </p>

              {/* Author */}
              <p
                className="mb-3 text-sm font-bold sm:text-base"
                style={{ color: "#ffffff" }}
              >
                {item.author}
              </p>

              {/* Revenue badge */}
              <span
                className="inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold sm:text-sm"
                style={{
                  color: "#FBBF24",
                  backgroundColor: "rgba(251,191,36,0.1)",
                  border: "1px solid rgba(251,191,36,0.25)",
                }}
              >
                {item.revenue}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
