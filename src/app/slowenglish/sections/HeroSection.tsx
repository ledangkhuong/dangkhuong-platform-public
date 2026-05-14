"use client";

import { Check, Zap, Clock, Play } from "lucide-react";

interface HeroSectionProps {
  onScrollToPricing?: () => void;
}

const CHECKMARKS = [
  "Video 1: Toàn bộ quy trình tạo video bằng VEO 3.1 (có prompt sẵn)",
  "Video 2: Cách edit hoàn chỉnh trên CapCut (kéo-thả, không cần kỹ năng)",
  "Tặng kèm: File Prompt độc quyền + Bộ Âm thanh bản quyền",
];

export default function HeroSection({ onScrollToPricing }: HeroSectionProps) {
  const handleCTAClick = () => {
    if (onScrollToPricing) {
      onScrollToPricing();
    }
  };

  return (
    <section
      className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-20 md:py-28 lg:py-32"
      style={{
        background:
          "linear-gradient(180deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)",
      }}
    >
      {/* Subtle radial glow behind content */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(251,191,36,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
        {/* Badge */}
        <span
          className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wide uppercase sm:text-sm"
          style={{
            borderColor: "rgba(251,191,36,0.3)",
            color: "#FBBF24",
            background: "rgba(251,191,36,0.08)",
          }}
        >
          <Zap className="h-3.5 w-3.5" />
          KHÓA HỌC THỰC CHIẾN 2026
        </span>

        {/* Main Headline */}
        <h1
          className="mb-6 text-2xl leading-tight font-extrabold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl"
          style={{ color: "#ffffff" }}
        >
          Bí Mật Đằng Sau Kênh YouTube{" "}
          <span style={{ color: "#FBBF24" }}>372.000 Subs</span> Kiếm{" "}
          <span style={{ color: "#FBBF24" }}>$30.000/Tháng</span> Chỉ Với 38
          Video Hoạt Hình{" "}
          <span className="italic">&ldquo;Slow English&rdquo;</span>
        </h1>

        {/* Sub-headline */}
        <p
          className="mb-4 text-base font-medium sm:text-lg md:text-xl"
          style={{ color: "rgba(255,255,255,0.9)" }}
        >
          Chỉ 2 Video Hướng Dẫn – Bạn Sẽ Tự Tay Làm Được Video Đầu Tiên
          Trong 3-8 Giờ
        </p>

        {/* Description */}
        <p
          className="mx-auto mb-8 max-w-2xl text-sm leading-relaxed sm:text-base"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          Không lý thuyết dài dòng. Không 50 bài giảng rườm rà. Chỉ 2 video
          THỰC CHIẾN: Cách làm video + Cách edit – Xem là làm được ngay.
        </p>

        {/* Checkmarks */}
        <ul className="mb-10 flex flex-col gap-3 text-left sm:gap-4">
          {CHECKMARKS.map((text) => (
            <li key={text} className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                style={{ background: "#22c55e" }}
              >
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </span>
              <span
                className="text-sm sm:text-base"
                style={{ color: "rgba(255,255,255,0.85)" }}
              >
                {text}
              </span>
            </li>
          ))}
        </ul>

        {/* Stats row */}
        <div
          className="mb-10 w-full max-w-2xl rounded-xl border p-4 sm:p-5"
          style={{
            borderColor: "rgba(251,191,36,0.2)",
            background: "rgba(251,191,36,0.05)",
          }}
        >
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-6">
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5" style={{ color: "#FBBF24" }} />
              <span
                className="text-sm font-semibold sm:text-base"
                style={{ color: "#FBBF24" }}
              >
                Emma Daily English
              </span>
            </div>
            <div
              className="hidden h-4 w-px sm:block"
              style={{ background: "rgba(251,191,36,0.3)" }}
            />
            <span
              className="text-xs sm:text-sm"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              6.15 triệu views/tháng
            </span>
            <div
              className="hidden h-4 w-px sm:block"
              style={{ background: "rgba(251,191,36,0.3)" }}
            />
            <span
              className="text-xs font-medium sm:text-sm"
              style={{ color: "#FBBF24" }}
            >
              Doanh thu $16K–$45K
            </span>
            <div
              className="hidden h-4 w-px sm:block"
              style={{ background: "rgba(251,191,36,0.3)" }}
            />
            <span
              className="text-xs sm:text-sm"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              Chỉ 38 video
            </span>
          </div>
        </div>

        {/* CTA Button */}
        {onScrollToPricing ? (
          <button
            type="button"
            onClick={handleCTAClick}
            className="mb-4 cursor-pointer rounded-xl px-8 py-4 text-base font-bold tracking-wide text-black shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl sm:px-12 sm:py-5 sm:text-lg"
            style={{
              background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
              boxShadow: "0 0 30px rgba(251,191,36,0.3)",
            }}
          >
            TÔI MUỐN HỌC NGAY – CHỈ TỪ 499K
          </button>
        ) : (
          <a
            href="#pricing"
            className="mb-4 inline-block rounded-xl px-8 py-4 text-base font-bold tracking-wide text-black shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl sm:px-12 sm:py-5 sm:text-lg"
            style={{
              background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
              boxShadow: "0 0 30px rgba(251,191,36,0.3)",
            }}
          >
            TÔI MUỐN HỌC NGAY – CHỈ TỪ 499K
          </a>
        )}

        {/* Urgency text */}
        <p className="flex items-center gap-2 text-sm sm:text-base">
          <Clock className="h-4 w-4" style={{ color: "#FBBF24" }} />
          <span style={{ color: "rgba(255,255,255,0.7)" }}>
            Ưu đãi giảm 50% – Chỉ còn trong 24 giờ
          </span>
        </p>
      </div>
    </section>
  );
}
