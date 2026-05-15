"use client";

import { ArrowRight, Rocket } from "lucide-react";

interface FinalCTASectionProps {
  onScrollToRegister?: () => void;
}

export default function FinalCTASection({
  onScrollToRegister,
}: FinalCTASectionProps) {
  const handleCTAClick = () => {
    if (onScrollToRegister) {
      onScrollToRegister();
    }
  };

  return (
    <section
      className="relative overflow-hidden py-12 sm:py-20 md:py-28 px-4 sm:px-6"
      style={{
        background: "linear-gradient(180deg, #111111 0%, #0a0a0a 100%)",
      }}
    >
      {/* Radial gold glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 50% 40%, rgba(251,191,36,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-5xl">
        {/* Final message quote */}
        <blockquote
          className="mx-auto mb-12 max-w-3xl rounded-2xl border-l-4 px-6 py-8 sm:px-10 sm:py-10"
          style={{
            borderLeftColor: "#FBBF24",
            background: "rgba(251,191,36,0.04)",
          }}
        >
          <p
            className="mb-6 text-base italic leading-relaxed sm:text-lg md:text-xl"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            {"“"}Cách đây 11 năm, tôi cũng đã từng loay hoay như bạn. Cho đến khi tôi tìm ra con đường{" "}
            <span style={{ color: "#FBBF24", fontWeight: 700 }}>
              KINH DOANH SỐ
            </span>{" "}
            — Mọi thứ đã thay đổi.
          </p>

          <p
            className="mb-6 text-base italic leading-relaxed sm:text-lg md:text-xl"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            Hôm nay, tôi muốn trao cho bạn{" "}
            <span style={{ color: "#FBBF24", fontWeight: 700 }}>
              TẤT CẢ
            </span>{" "}
            những gì tôi đã học được — Chỉ với giá 1 ly sinh tố.
          </p>

          <p
            className="mb-6 text-base italic leading-relaxed sm:text-lg md:text-xl"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            Bạn xứng đáng có cuộc sống tự do về tài chính, tự do về thời gian, để sống cân bằng theo{" "}
            <span style={{ color: "#FBBF24", fontWeight: 700 }}>
              Bánh Xe Cuộc Đời
            </span>
            .
          </p>

          <p
            className="text-base italic leading-relaxed sm:text-lg md:text-xl"
            style={{ color: "rgba(255,255,255,0.9)" }}
          >
            Hãy bắt đầu ngay hôm nay —{" "}
            <span style={{ color: "#ef4444", fontWeight: 700 }}>
              Trước khi quá muộn!
            </span>
            {"”"}
          </p>

          <footer
            className="mt-6 text-sm font-semibold sm:text-base"
            style={{ color: "#FBBF24" }}
          >
            — Trainer Lê Đăng Khương
          </footer>
        </blockquote>

        {/* Big CTA button */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={handleCTAClick}
            className="mb-6 flex cursor-pointer items-center gap-3 rounded-xl px-12 py-5 text-lg font-bold text-black shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
            style={{
              background:
                "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
              boxShadow: "0 0 40px rgba(251,191,36,0.3)",
            }}
          >
            <Rocket className="h-5 w-5" />
            TÔI MUỐN ĐĂNG KÝ NGAY — 100K
            <ArrowRight className="h-5 w-5" />
          </button>

          {/* Urgency bar */}
          <div
            className="mb-16 rounded-lg px-6 py-3 text-center text-sm font-semibold sm:text-base"
            style={{
              background: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.2)",
            }}
          >
            <span style={{ color: "#FBBF24" }}>
              🔥 Còn 153 suất ưu đãi — Đăng ký ngay 100K
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          className="border-t pt-8 text-center"
          style={{ borderTopColor: "rgba(255,255,255,0.08)" }}
        >
          <p
            className="mb-1 text-xs sm:text-sm"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            © 2026 KOHADA — AI Technology · Training · Video
          </p>
          <p
            className="text-xs sm:text-sm"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            Trainer Lê Đăng Khương | dangkhuong.com
          </p>
        </div>
      </div>
    </section>
  );
}
