"use client";

import {
  ArrowRight,
  Award,
  Crown,
  Sparkles,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";

interface HeroSectionProps {
  onScrollToRegister?: () => void;
}

export default function HeroSection({ onScrollToRegister }: HeroSectionProps) {
  return (
    <section
      className="hcx-hero relative overflow-hidden pt-12 pb-8 sm:pt-20 sm:pb-12 md:pt-24 md:pb-16 px-4 sm:px-6"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(229,182,99,0.08) 0%, transparent 60%), linear-gradient(180deg, #050913 0%, #0A1020 100%)",
      }}
    >
      {/* Decorative grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(229,182,99,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(229,182,99,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Decorative gold dust particles */}
      <div className="hcx-dust hcx-dust-1" aria-hidden="true" />
      <div className="hcx-dust hcx-dust-2" aria-hidden="true" />
      <div className="hcx-dust hcx-dust-3" aria-hidden="true" />
      <div className="hcx-dust hcx-dust-4" aria-hidden="true" />
      <div className="hcx-dust hcx-dust-5" aria-hidden="true" />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center text-center">
        {/* Micro-credential row */}
        <div className="mb-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:gap-x-7">
          <div
            className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold tabular-nums"
            style={{ color: "rgba(241,245,251,0.78)" }}
          >
            <Award className="h-3.5 w-3.5" style={{ color: "#E5B663" }} />
            <span>
              <strong className="font-extrabold tabular-nums" style={{ color: "#F1F5FB" }}>11+ năm</strong>
              <span className="font-normal"> kinh nghiệm</span>
            </span>
          </div>
          <span
            className="hidden sm:inline-block h-3 w-px"
            style={{ background: "rgba(229,182,99,0.25)" }}
          />
          <div
            className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold"
            style={{ color: "rgba(241,245,251,0.78)" }}
          >
            <Users className="h-3.5 w-3.5" style={{ color: "#E5B663" }} />
            <span>
              <strong className="font-extrabold tabular-nums" style={{ color: "#F1F5FB" }}>151K+</strong>
              <span className="font-normal"> followers</span>
            </span>
          </div>
          <span
            className="hidden sm:inline-block h-3 w-px"
            style={{ background: "rgba(229,182,99,0.25)" }}
          />
          <div
            className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold"
            style={{ color: "rgba(241,245,251,0.78)" }}
          >
            <TrendingUp className="h-3.5 w-3.5" style={{ color: "#E5B663" }} />
            <span>
              <strong className="font-extrabold tabular-nums" style={{ color: "#F1F5FB" }}>45tr/tuần</strong>
              <span className="font-normal"> doanh thu thử nghiệm, chưa quảng cáo</span>
            </span>
          </div>
        </div>

        {/* Tag line */}
        <span
          className="mb-6 sm:mb-8 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[10px] sm:text-[11px] font-semibold uppercase"
          style={{
            borderColor: "rgba(229,182,99,0.35)",
            color: "#E5B663",
            background: "rgba(229,182,99,0.06)",
            letterSpacing: "0.18em",
          }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Cho Chuyên Gia · Coach · Mentor · Marketer Việt Nam
        </span>

        {/* Campaign banner */}
        <div className="mb-6 sm:mb-8 w-full max-w-3xl">
          {/* SR-only H1 for SEO + accessibility */}
          <h1 className="sr-only">
            Học Chưa Xong - Tiền Đã Về — Tạo sản phẩm số bán chạy nhất trong ngách của bạn
          </h1>
          <div
            className="relative overflow-hidden rounded-2xl"
            style={{
              border: "1px solid rgba(229,182,99,0.35)",
              boxShadow:
                "0 30px 80px -20px rgba(0,0,0,0.6), 0 0 60px rgba(229,182,99,0.18)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/hocchuaxongtiendave/banner.jpeg"
              alt="Học Chưa Xong - Tiền Đã Về · Tạo sản phẩm số bán chạy nhất trong ngách của bạn · Trainer Lê Đăng Khương · KOHADA"
              className="block w-full h-auto"
              loading="eager"
              fetchPriority="high"
            />
            {/* Subtle gold border glow on top */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{
                boxShadow:
                  "0 0 0 1px rgba(229,182,99,0.2) inset, 0 0 60px rgba(229,182,99,0.12) inset",
              }}
            />
          </div>
        </div>

        {/* H1 main */}
        <h1
          className="mb-4 font-extrabold max-w-4xl"
          style={{ letterSpacing: "-0.01em" }}
        >
          <span
            className="block text-[18px] sm:text-2xl md:text-3xl font-extrabold leading-[1.3]"
            style={{ color: "#F1F5FB", letterSpacing: "-0.01em" }}
          >
            Tự Xây Hệ Thống Bán{" "}
            <span style={{ color: "#E5B663" }}>SẢN PHẨM SỐ Triệu Đô</span>
            <br className="hidden sm:block" />
            Bằng AI Agent — Trong 7 Ngày
          </span>
        </h1>

        {/* Sub-headline */}
        <p
          className="mx-auto mb-2 max-w-3xl text-[14px] sm:text-[15px] leading-[1.7]"
          style={{ color: "rgba(241,245,251,0.75)" }}
        >
          Bán Tài Liệu, Ebook, Khóa Học, Phần Mềm, Template — TẤT CẢ trên một hệ thống
          do <span className="font-semibold" style={{ color: "#F1F5FB" }}>BẠN sở hữu 100%</span>.
        </p>
        <p
          className="mx-auto mb-8 max-w-3xl text-[14px] sm:text-[15px] leading-[1.7] italic"
          style={{ color: "rgba(241,245,251,0.55)" }}
        >
          Thay vì đốt tiền tỷ & 1 năm thuê dev như tôi đã từng.
        </p>

        {/* Social proof bar */}
        <div
          className="mb-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 rounded-2xl px-5 py-3.5 max-w-3xl w-full"
          style={{
            background: "rgba(14,23,48,0.6)",
            border: "1px solid rgba(229,182,99,0.18)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="h-4 w-4 fill-current" style={{ color: "#E5B663" }} />
            ))}
          </div>
          <span className="hidden sm:block h-4 w-px" style={{ background: "rgba(229,182,99,0.25)" }} />
          <span className="text-[13px] sm:text-sm" style={{ color: "rgba(241,245,251,0.75)" }}>
            <strong className="font-extrabold tabular-nums" style={{ color: "#F1F5FB" }}>313+</strong> chuyên gia đã tham gia
          </span>
          <span className="hidden sm:block h-4 w-px" style={{ background: "rgba(229,182,99,0.25)" }} />
          <span className="text-[13px] sm:text-sm" style={{ color: "rgba(241,245,251,0.75)" }}>
            <strong className="font-extrabold tabular-nums" style={{ color: "#F1F5FB" }}>95%</strong> có sản phẩm sau 14 ngày
          </span>
        </div>

        {/* Featured on / As seen on trust strip */}
        <div className="mb-8 flex w-full max-w-3xl flex-col items-center gap-2.5">
          <span
            className="text-[10px] sm:text-[11px] font-semibold uppercase"
            style={{ color: "rgba(241,245,251,0.55)", letterSpacing: "0.3em" }}
          >
            As seen on
          </span>
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            {[
              { label: "FACEBOOK", meta: "151K" },
              { label: "YOUTUBE", meta: null },
              { label: "ZALO", meta: null },
              { label: "TIKTOK", meta: null },
              { label: "DANGKHUONG.COM", meta: null },
            ].map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold uppercase h-7"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(19,32,63,0.85) 0%, rgba(14,23,48,0.85) 100%)",
                  border: "1px solid rgba(229,182,99,0.18)",
                  color: "rgba(241,245,251,0.85)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                  letterSpacing: "0.3em",
                }}
              >
                <span>{chip.label}</span>
                {chip.meta && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold tabular-nums"
                    style={{
                      background:
                        "linear-gradient(135deg, #E5B663 0%, #C9A86B 100%)",
                      color: "#0A1020",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {chip.meta}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Real admin dashboard screenshot */}
        <button
          type="button"
          onClick={onScrollToRegister}
          className="hcx-vsl group relative mb-6 w-full max-w-3xl cursor-pointer overflow-hidden rounded-2xl"
          style={{
            aspectRatio: "16 / 9",
            background: "#0A1020",
            border: "1px solid rgba(229,182,99,0.35)",
            boxShadow:
              "0 0 60px rgba(229,182,99,0.2), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
          aria-label="Mở dashboard quản trị dangkhuong.com/admin — Doanh thu 45.776.000đ, 307 học viên"
        >
          {/* Real dashboard screenshot */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hocchuaxongtiendave/admin-dashboard.png"
            alt="Dashboard quản trị dangkhuong.com/admin — Doanh thu thật 45.776.000đ, 307 học viên, 65 đơn hàng"
            className="absolute inset-0 h-full w-full object-cover object-top"
            loading="eager"
          />

          {/* Gold border glow on top */}
          <span
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              boxShadow:
                "0 0 0 1px rgba(229,182,99,0.18), 0 0 80px rgba(229,182,99,0.12) inset",
            }}
            aria-hidden="true"
          />

          {/* LIVE badge */}
          <span
            className="absolute left-3 top-3 sm:left-4 sm:top-4 flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] sm:text-[11px] font-semibold uppercase"
            style={{
              background: "linear-gradient(135deg, #E5B663 0%, #C9A86B 100%)",
              color: "#0A1020",
              boxShadow: "0 4px 18px rgba(229,182,99,0.35)",
              letterSpacing: "0.3em",
            }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{
                background: "#0A1020",
                animation: "hcx-live-pulse 1.6s ease-in-out infinite",
              }}
            />
            Live · dangkhuong.com/admin
          </span>

          {/* Stats pill */}
          <span
            className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-md px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold tabular-nums"
            style={{
              background: "rgba(5,9,19,0.78)",
              border: "1px solid rgba(229,182,99,0.35)",
              color: "#F1F5FB",
              backdropFilter: "blur(6px)",
              letterSpacing: "0.05em",
            }}
          >
            <span className="font-extrabold tabular-nums" style={{ color: "#E5B663" }}>45.776.000đ</span> · <span className="tabular-nums">307</span> học viên
          </span>

          {/* Hover overlay (only on hover) */}
          <span
            className="hcx-vsl-overlay pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-[#050913] via-[#050913]/40 to-transparent p-4 sm:p-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            aria-hidden="true"
          >
            <span
              className="rounded-full px-4 py-2 text-[11px] sm:text-xs font-bold uppercase"
              style={{
                background: "linear-gradient(135deg, #E5B663 0%, #C9A86B 100%)",
                color: "#0A1020",
                boxShadow: "0 8px 24px rgba(229,182,99,0.4)",
                letterSpacing: "0.18em",
              }}
            >
              👉 Đăng ký để có hệ thống tương tự
            </span>
          </span>
        </button>

        {/* CTA */}
        <button
          type="button"
          onClick={onScrollToRegister}
          className="group flex cursor-pointer items-center gap-3 rounded-xl px-8 sm:px-12 py-[16px] sm:py-[18px] text-base sm:text-lg font-bold transition-all duration-200 hover:scale-105"
          style={{
            background: "linear-gradient(135deg, #E5B663 0%, #C9A86B 100%)",
            color: "#0A1020",
            boxShadow:
              "0 0 40px rgba(229,182,99,0.4), 0 0 0 1px rgba(229,182,99,0.5)",
            letterSpacing: "0.02em",
          }}
        >
          <Crown className="h-5 w-5" />
          <span className="tabular-nums">ĐĂNG KÝ EARLY BIRD — CHỈ 5.000.000Đ</span>
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </button>

        {/* Footer pills */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-[12px] sm:text-[13px] font-semibold"
          style={{ color: "rgba(241,245,251,0.7)" }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 h-7"
            style={{
              background: "rgba(14,23,48,0.6)",
              border: "1px solid rgba(229,182,99,0.18)",
            }}
          >
            <span style={{ color: "#34D399" }}>✓</span>
            <span className="tabular-nums">Truy cập 6 tháng</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 h-7"
            style={{
              background: "rgba(14,23,48,0.6)",
              border: "1px solid rgba(229,182,99,0.18)",
            }}
          >
            <span style={{ color: "#34D399" }}>✓</span>
            <span>Bonus <span className="tabular-nums">16.479.000đ</span> kèm theo</span>
          </span>
        </div>

        <p
          className="mt-3 text-[10px] sm:text-[11px] font-semibold uppercase tabular-nums"
          style={{ color: "rgba(229,182,99,0.7)", letterSpacing: "0.18em" }}
        >
          Giá gốc 20.000.000đ — Tiết kiệm 75%
        </p>
      </div>

      <style jsx>{`
        /* Shimmer on gradient title */
        .hcx-shimmer {
          background-image: linear-gradient(
            110deg,
            #c9a86b 0%,
            #e5b663 18%,
            #f4d9a8 38%,
            #ffffff 50%,
            #f4d9a8 62%,
            #e5b663 82%,
            #c9a86b 100%
          );
          background-size: 220% 100%;
          background-position: 100% 50%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          animation: hcxShimmer 5.5s ease-in-out infinite;
        }
        @keyframes hcxShimmer {
          0% {
            background-position: 100% 50%;
          }
          50% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 100% 50%;
          }
        }

        /* Live dot pulse on dashboard badge */
        @keyframes hcx-live-pulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.6);
            opacity: 0.5;
          }
        }

        /* Soft idle bob on hero VSL frame */
        .hcx-play {
          animation: hcxFloat 4s ease-in-out infinite;
        }
        @keyframes hcxFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }

        /* VSL frame hover lift */
        .hcx-vsl {
          transition: transform 250ms ease, box-shadow 250ms ease;
        }
        .hcx-vsl:hover {
          transform: translateY(-2px);
        }

        /* Gold dust particles */
        .hcx-dust {
          position: absolute;
          pointer-events: none;
          border-radius: 9999px;
          background: radial-gradient(
            circle,
            rgba(244, 217, 168, 0.9) 0%,
            rgba(229, 182, 99, 0.4) 40%,
            transparent 70%
          );
          opacity: 0.3;
          filter: blur(0.5px);
          animation: hcxDrift 14s ease-in-out infinite;
        }
        .hcx-dust-1 {
          top: 12%;
          left: 8%;
          width: 6px;
          height: 6px;
        }
        .hcx-dust-2 {
          top: 22%;
          right: 12%;
          width: 4px;
          height: 4px;
          animation-delay: -3s;
          animation-duration: 18s;
        }
        .hcx-dust-3 {
          top: 55%;
          left: 14%;
          width: 5px;
          height: 5px;
          animation-delay: -6s;
          animation-duration: 16s;
        }
        .hcx-dust-4 {
          bottom: 18%;
          right: 9%;
          width: 7px;
          height: 7px;
          animation-delay: -9s;
          animation-duration: 20s;
        }
        .hcx-dust-5 {
          bottom: 30%;
          left: 48%;
          width: 3px;
          height: 3px;
          animation-delay: -2s;
          animation-duration: 12s;
        }
        @keyframes hcxDrift {
          0%,
          100% {
            transform: translate(0, 0);
            opacity: 0.22;
          }
          50% {
            transform: translate(8px, -12px);
            opacity: 0.4;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hcx-shimmer,
          .hcx-play,
          .hcx-dust {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}
