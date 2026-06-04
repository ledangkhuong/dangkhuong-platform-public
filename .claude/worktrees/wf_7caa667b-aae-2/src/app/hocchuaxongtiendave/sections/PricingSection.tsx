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
  "Toàn bộ 6 bonus trị giá 16.482.000đ",
  "Vào Group Zalo hỗ trợ 30 ngày",
  "Live Q&A hàng tuần với Thầy Khương",
];

const MATH_HOOKS = [
  {
    title: "Tính ra mỗi ngày",
    value: "~13.700đ",
    note: "rẻ hơn 1 ly trà sữa",
  },
  {
    title: "Bán 1 khóa giá 5tr",
    value: "Hoàn vốn 100%",
    note: "ngay đơn đầu tiên",
  },
  {
    title: "Bán 50 Ebook 99K",
    value: "Đã có lãi",
    note: "ngay tháng đầu",
  },
];

export default function PricingSection({ onScrollToRegister }: PricingSectionProps) {
  return (
    <section
      className="relative overflow-hidden pt-12 pb-12 sm:pt-20 sm:pb-20 md:pt-24 md:pb-24 px-4 sm:px-6"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(229,182,99,0.1) 0%, transparent 70%), #050913",
      }}
    >
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-4">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase"
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
          className="mb-4 text-center text-[26px] sm:text-3xl md:text-[40px] font-extrabold tracking-[-0.01em] leading-[1.15]"
          style={{ color: "#F1F5FB" }}
        >
          Bạn Phải Trả <span style={{ color: "#E5B663" }}>Bao Nhiêu?</span>
        </h2>
        <p
          className="mb-10 text-center text-[14.5px] sm:text-[15px] leading-[1.75]"
          style={{ color: "rgba(241,245,251,0.65)" }}
        >
          Hãy nghĩ lại các phương án khác:
        </p>

        {/* Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-10">
          {COMPARISONS.map((c) => (
            <div
              key={c.label}
              className="rounded-2xl p-4 sm:p-5 text-center flex flex-col h-full"
              style={{
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.2)",
                boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
              }}
            >
              <div
                className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] mb-2 font-semibold"
                style={{ color: "rgba(241,245,251,0.6)" }}
              >
                {c.label}
              </div>
              <div
                className="text-base sm:text-lg font-bold tabular-nums mt-auto"
                style={{ color: "#F87171" }}
              >
                {c.value}
              </div>
            </div>
          ))}
        </div>

        {/* Pricing card */}
        <div
          className="relative rounded-3xl p-7 sm:p-10 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #13203F 0%, #0A1020 100%)",
            border: "2px solid rgba(229,182,99,0.5)",
            boxShadow:
              "0 30px 80px -20px rgba(0,0,0,0.6), 0 0 60px rgba(229,182,99,0.15), 0 0 0 1px rgba(229,182,99,0.12) inset",
          }}
        >
          {/* Top glow */}
          <div
            aria-hidden
            className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[200px] pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse, rgba(229,182,99,0.28) 0%, transparent 70%)",
            }}
          />

          <div className="relative">
            {/* Ribbon */}
            <div className="flex justify-center mb-6">
              <span
                className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{
                  background: "linear-gradient(135deg, #E5B663 0%, #C9A86B 100%)",
                  color: "#0A1020",
                  boxShadow: "0 8px 20px rgba(229,182,99,0.35)",
                }}
              >
                <Sparkles size={12} /> Early Bird · 100 Suất Đầu Tiên
              </span>
            </div>

            <p
              className="text-center text-[14px] sm:text-[15px] mb-2"
              style={{ color: "rgba(241,245,251,0.62)" }}
            >
              Tổng giá trị thực tế{" "}
              <strong className="tabular-nums" style={{ color: "#F1F5FB" }}>
                78.482.000đ
              </strong>
            </p>
            <p
              className="text-center text-[14px] sm:text-[15px] mb-6"
              style={{ color: "rgba(241,245,251,0.62)" }}
            >
              Giá niêm yết chính thức{" "}
              <span
                className="line-through tabular-nums"
                style={{ color: "rgba(241,245,251,0.4)" }}
              >
                20.000.000đ
              </span>
            </p>

            <div className="text-center mb-2">
              <span
                className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-semibold"
                style={{ color: "#E5B663" }}
              >
                Giá hôm nay chỉ còn
              </span>
            </div>
            <div className="text-center mb-3">
              <span
                className="text-6xl sm:text-7xl md:text-8xl font-extrabold tabular-nums tracking-[-0.03em] leading-none"
                style={{
                  background:
                    "linear-gradient(135deg, #E5B663 0%, #F4D9A8 50%, #C9A86B 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 4px 24px rgba(229,182,99,0.25))",
                }}
              >
                10.000.000đ
              </span>
            </div>
            <p
              className="text-center text-[13.5px] sm:text-[14.5px] font-semibold mb-8 tabular-nums"
              style={{ color: "#34D399" }}
            >
              Tiết kiệm 10.000.000đ — giảm 50% + Bonus 16.482.000đ
            </p>

            {/* What you get */}
            <div
              className="rounded-2xl p-5 sm:p-6 mb-8"
              style={{
                background: "rgba(229,182,99,0.06)",
                border: "1px solid rgba(229,182,99,0.22)",
              }}
            >
              <div
                className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] mb-4 font-semibold text-center"
                style={{ color: "#E5B663" }}
              >
                Đăng Ký Hôm Nay - Bạn Được
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {INCLUDED.map((it) => (
                  <li key={it} className="flex items-start gap-3">
                    <span
                      className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: "rgba(52,211,153,0.15)",
                        border: "1px solid rgba(52,211,153,0.35)",
                      }}
                    >
                      <Check
                        className="h-3 w-3"
                        strokeWidth={3}
                        style={{ color: "#34D399" }}
                      />
                    </span>
                    <span
                      className="text-[13.5px] sm:text-[14px] leading-[1.6]"
                      style={{ color: "rgba(241,245,251,0.85)" }}
                    >
                      {it}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Math hooks */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8 text-center">
              {MATH_HOOKS.map((m) => (
                <div
                  key={m.title}
                  className="rounded-xl p-4 flex flex-col h-full"
                  style={{
                    background: "rgba(229,182,99,0.05)",
                    border: "1px solid rgba(229,182,99,0.15)",
                  }}
                >
                  <div
                    className="text-[10px] sm:text-[11px] uppercase tracking-[0.12em] mb-1 font-semibold"
                    style={{ color: "rgba(241,245,251,0.6)" }}
                  >
                    {m.title}
                  </div>
                  <div
                    className="text-sm sm:text-base font-bold tabular-nums"
                    style={{ color: "#F4D9A8" }}
                  >
                    {m.value}
                  </div>
                  <div
                    className="text-[11px] sm:text-[12px] mt-auto"
                    style={{ color: "rgba(241,245,251,0.55)" }}
                  >
                    {m.note}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={onScrollToRegister}
              className="group w-full flex items-center justify-center gap-3 rounded-xl px-8 py-4 sm:py-5 text-base sm:text-lg font-bold tracking-wide transition-all hover:scale-[1.02] cursor-pointer"
              style={{
                background:
                  "linear-gradient(135deg, #F4D9A8 0%, #E5B663 50%, #C9A86B 100%)",
                color: "#0A1020",
                boxShadow:
                  "0 0 40px rgba(229,182,99,0.45), 0 8px 24px rgba(229,182,99,0.3), 0 0 0 1px rgba(229,182,99,0.55)",
              }}
            >
              <Crown size={20} />
              ĐĂNG KÝ EARLY BIRD — 10.000.000Đ
              <ArrowRight
                size={20}
                className="transition-transform group-hover:translate-x-1"
              />
            </button>

            <p
              className="text-center text-[12px] sm:text-[13px] mt-5 leading-[1.7]"
              style={{ color: "rgba(241,245,251,0.6)" }}
            >
              Thanh toán an toàn qua SePay — chuyển khoản ngân hàng VN
              <br />
              Cấp quyền truy cập tự động trong 5 phút sau khi chuyển khoản
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
