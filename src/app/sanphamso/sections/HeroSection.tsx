"use client";

import Image from "next/image";
import { ArrowRight, Check, Zap, Clock } from "lucide-react";

interface HeroSectionProps {
  onScrollToRegister?: () => void;
}

const CHECKMARKS = [
  "Không cần vốn lớn — Khởi nghiệp chỉ với chiếc laptop",
  "Không cần kho hàng — Bán 1 lần, thu tiền mãi mãi",
  "Không cần kinh nghiệm — Có lộ trình từng bước A-Z",
  "Tận dụng AI 2026 — Làm việc 10x năng suất",
];

export default function HeroSection({ onScrollToRegister }: HeroSectionProps) {
  const handleCTAClick = () => {
    if (onScrollToRegister) {
      onScrollToRegister();
    }
  };

  return (
    <section
      className="relative overflow-hidden py-12 sm:py-20 md:py-28 px-4 sm:px-6"
      style={{
        background:
          "linear-gradient(180deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)",
      }}
    >
      {/* Subtle radial gold glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(251,191,36,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center text-center">
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
          KOHADA — AI TECHNOLOGY · TRAINING · VIDEO
        </span>

        {/* Main Headline */}
        <h1 className="mb-6 font-extrabold tracking-tight">
          <span
            className="block text-2xl leading-tight sm:text-3xl md:text-4xl lg:text-5xl"
            style={{ color: "#ffffff" }}
          >
            CHỈ VỚI 1 LY SINH TỐ 100K
          </span>
          <span
            className="mt-2 block text-2xl leading-tight sm:text-3xl md:text-4xl lg:text-5xl"
            style={{ color: "#ffffff" }}
          >
            BẠN SẼ SỞ HỮU LỘ TRÌNH KIẾM TIỀN
          </span>
          <span
            className="mt-3 block text-3xl italic sm:text-4xl md:text-5xl lg:text-6xl"
            style={{
              color: "#FBBF24",
              textShadow: "0 0 60px rgba(251,191,36,0.3)",
              lineHeight: 1.1,
            }}
          >
            TỪ SẢN PHẨM SỐ 2026
          </span>
        </h1>

        {/* Sub-headline */}
        <p
          className="mx-auto mb-8 max-w-2xl text-sm leading-relaxed sm:text-base md:text-lg"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          Bí quyết kiếm tiền từ sản phẩm số và các mô hình thành công trên toàn
          cầu — Ứng dụng thực chiến cho thị trường Việt Nam 2026
        </p>

        {/* Checkmarks */}
        <ul className="mb-8 flex flex-col gap-3 text-left sm:mb-10 sm:gap-4">
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

        {/* Banner Image */}
        <div className="mb-8 w-full sm:mb-10">
          <Image
            src="/images/sanphamso/banner.jpg"
            alt="Lộ Trình Kiếm Tiền Từ Sản Phẩm Số 2026 — Trainer Lê Đăng Khương"
            width={1200}
            height={675}
            className="aspect-video w-full rounded-2xl object-cover shadow-2xl"
            priority
          />
        </div>

        {/* CTA Button */}
        <button
          type="button"
          onClick={handleCTAClick}
          className="mb-6 flex cursor-pointer items-center gap-2 rounded-xl px-8 py-4 text-base font-bold tracking-wide text-black shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl sm:px-12 sm:py-5 sm:text-lg"
          style={{
            background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
            boxShadow: "0 0 30px rgba(251,191,36,0.3)",
          }}
        >
          ĐĂNG KÝ NGAY – CHỈ 100K
          <ArrowRight className="h-5 w-5" />
        </button>

        {/* Social proof row */}
        <div
          className="mb-4 w-full max-w-2xl rounded-xl border p-3 sm:p-4"
          style={{
            borderColor: "rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <p
            className="text-xs sm:text-sm md:text-base"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            👥 Đã có 3.247+ học viên đăng ký | ⭐ 4.9/5 đánh giá
          </p>
        </div>

        {/* Countdown urgency */}
        <p className="flex items-center gap-2 text-sm sm:text-base">
          <Clock className="h-4 w-4" style={{ color: "#FBBF24" }} />
          <span style={{ color: "rgba(255,255,255,0.7)" }}>
            ⏰ Ưu đãi kết thúc trong 24 giờ
          </span>
        </p>
      </div>
    </section>
  );
}
