"use client";

import { Crown, ArrowRight, Check, Sparkles } from "lucide-react";

interface PricingSectionProps {
  onScrollToRegister?: () => void;
}

const COMPARISONS = [
  { label: "Thuê dev xây hệ thống tương tự", value: "50-500 triệu đồng" },
  { label: "Kajabi/Skool/Gumroad 1 năm", value: "45-60 triệu đồng" },
  { label: "Học 4 khóa riêng lẻ", value: "60-80 triệu đồng" },
];

const INCLUDED = [
  "Truy cập 6 tháng vào toàn bộ 50 bài học",
  "Update miễn phí khi có phiên bản mới",
  "Toàn bộ 6 bonus trị giá 16.479.000đ",
  "Vào Group Zalo hỗ trợ 30 ngày",
  "Live Q&A hàng tuần với Thầy Khương",
];

export default function PricingSection({ onScrollToRegister }: PricingSectionProps) {
  return (
    <section
      className="relative overflow-hidden py-14 sm:py-24 md:py-32 px-4 sm:px-6"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(229,182,99,0.1) 0%, transparent 70%), #050913",
      }}
    >
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-5">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase"
            style={{
              borderColor: "rgba(229,182,99,0.4)",
              background: "rgba(229,182,99,0.08)",
              color: "#E5B663",
            }}
          >
            <Crown size={12} /> Giá Đầu Tư
          </span>
        </div>

        <h2
          className="mb-4 text-center text-[26px] font-extrabold leading-tight sm:text-3xl md:text-4xl lg:text-[44px]"
          style={{ color: "#F1F5FB", letterSpacing: "-0.01em" }}
        >
          Bạn Phải Trả <span style={{ color: "#E5B663" }}>Bao Nhiêu?</span>
        </h2>
        <p
          className="mb-10 text-center text-base sm:text-lg"
          style={{ color: "rgba(241,245,251,0.65)" }}
        >
          Hãy nghĩ lại các phương án khác:
        </p>

        {/* Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {COMPARISONS.map((c) => (
            <div
              key={c.label}
              className="rounded-2xl p-5 text-center"
              style={{
                background: "rgba(239,68,68,0.05)",
                border: "1px solid rgba(239,68,68,0.15)",
              }}
            >
              <div className="text-[12px] uppercase tracking-[0.12em] mb-2" style={{ color: "rgba(241,245,251,0.55)" }}>
                {c.label}
              </div>
              <div className="text-lg font-bold" style={{ color: "#F87171" }}>
                {c.value}
              </div>
            </div>
          ))}
        </div>

        {/* Pricing card */}
        <div
          className="relative rounded-3xl p-8 sm:p-12 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #13203F 0%, #0A1020 100%)",
            border: "2px solid rgba(229,182,99,0.4)",
            boxShadow:
              "0 30px 80px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(229,182,99,0.1) inset",
          }}
        >
          {/* Top glow */}
          <div
            className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[200px] pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse, rgba(229,182,99,0.25) 0%, transparent 70%)",
            }}
          />

          <div className="relative">
            {/* Ribbon */}
            <div className="flex justify-center mb-6">
              <span
                className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold uppercase tracking-[0.18em]"
                style={{
                  background: "linear-gradient(135deg, #E5B663 0%, #C9A86B 100%)",
                  color: "#0A1020",
                  boxShadow: "0 8px 20px rgba(229,182,99,0.35)",
                }}
              >
                <Sparkles size={12} /> Early Bird · 100 Suất Đầu Tiên
              </span>
            </div>

            <p className="text-center text-[15px] sm:text-base mb-2" style={{ color: "rgba(241,245,251,0.6)" }}>
              Tổng giá trị thực tế <strong className="text-white">78.479.000đ</strong>
            </p>
            <p className="text-center text-[15px] sm:text-base mb-6" style={{ color: "rgba(241,245,251,0.6)" }}>
              Giá niêm yết chính thức{" "}
              <span className="line-through" style={{ color: "rgba(241,245,251,0.4)" }}>
                20.000.000đ
              </span>
            </p>

            <div className="text-center mb-2">
              <span className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "#E5B663" }}>
                Giá hôm nay chỉ còn
              </span>
            </div>
            <div className="text-center mb-3">
              <span
                className="text-6xl sm:text-7xl md:text-8xl font-extrabold"
                style={{
                  background: "linear-gradient(135deg, #E5B663 0%, #F4D9A8 50%, #C9A86B 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: "-0.03em",
                }}
              >
                5.000.000đ
              </span>
            </div>
            <p className="text-center text-sm sm:text-base font-semibold mb-8" style={{ color: "#34D399" }}>
              Tiết kiệm 15.000.000đ — giảm 75% + Bonus 16.479.000đ
            </p>

            {/* What you get */}
            <div
              className="rounded-2xl p-6 mb-8"
              style={{
                background: "rgba(229,182,99,0.06)",
                border: "1px solid rgba(229,182,99,0.18)",
              }}
            >
              <div className="text-[11px] uppercase tracking-[0.18em] mb-4 font-semibold text-center" style={{ color: "#E5B663" }}>
                Đăng Ký Hôm Nay - Bạn Được
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {INCLUDED.map((it) => (
                  <li key={it} className="flex items-start gap-2.5">
                    <span
                      className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                      style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)" }}
                    >
                      <Check className="h-3 w-3" strokeWidth={3} style={{ color: "#34D399" }} />
                    </span>
                    <span className="text-[14px] leading-[1.6]" style={{ color: "rgba(241,245,251,0.85)" }}>
                      {it}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Math hooks */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8 text-center">
              <div
                className="rounded-xl p-4"
                style={{ background: "rgba(229,182,99,0.04)", border: "1px solid rgba(229,182,99,0.12)" }}
              >
                <div className="text-[11px] uppercase tracking-[0.12em] mb-1" style={{ color: "rgba(241,245,251,0.55)" }}>
                  Tính ra mỗi ngày
                </div>
                <div className="text-base font-bold text-white">~13.700đ</div>
                <div className="text-[12px]" style={{ color: "rgba(241,245,251,0.55)" }}>
                  rẻ hơn 1 ly trà sữa
                </div>
              </div>
              <div
                className="rounded-xl p-4"
                style={{ background: "rgba(229,182,99,0.04)", border: "1px solid rgba(229,182,99,0.12)" }}
              >
                <div className="text-[11px] uppercase tracking-[0.12em] mb-1" style={{ color: "rgba(241,245,251,0.55)" }}>
                  Bán 1 khóa giá 5tr
                </div>
                <div className="text-base font-bold text-white">Hoàn vốn 100%</div>
                <div className="text-[12px]" style={{ color: "rgba(241,245,251,0.55)" }}>
                  ngay đơn đầu tiên
                </div>
              </div>
              <div
                className="rounded-xl p-4"
                style={{ background: "rgba(229,182,99,0.04)", border: "1px solid rgba(229,182,99,0.12)" }}
              >
                <div className="text-[11px] uppercase tracking-[0.12em] mb-1" style={{ color: "rgba(241,245,251,0.55)" }}>
                  Bán 50 Ebook 99K
                </div>
                <div className="text-base font-bold text-white">Đã có lãi</div>
                <div className="text-[12px]" style={{ color: "rgba(241,245,251,0.55)" }}>
                  ngay tháng đầu
                </div>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={onScrollToRegister}
              className="group w-full flex items-center justify-center gap-3 rounded-xl px-8 py-5 text-base sm:text-lg font-bold tracking-wide transition-all hover:scale-[1.02] cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #E5B663 0%, #C9A86B 100%)",
                color: "#0A1020",
                boxShadow:
                  "0 0 40px rgba(229,182,99,0.4), 0 0 0 1px rgba(229,182,99,0.5)",
              }}
            >
              <Crown size={20} />
              ĐĂNG KÝ EARLY BIRD — 5.000.000Đ
              <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
            </button>

            <p className="text-center text-xs sm:text-sm mt-5" style={{ color: "rgba(241,245,251,0.55)" }}>
              💳 Thanh toán an toàn qua SePay — chuyển khoản ngân hàng VN
              <br />
              ✅ Cấp quyền truy cập tự động trong 5 phút sau khi chuyển khoản
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
