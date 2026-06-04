"use client";

import { Calculator, Check, ArrowRight, Crown } from "lucide-react";

interface TotalValueSectionProps {
  onScrollToRegister?: () => void;
}

const ROWS = [
  { label: "Module 1: Tìm ngách + Phễu (9 bài)", value: "3.000.000đ" },
  { label: "Module 2: Tạo sản phẩm số (7 bài)", value: "5.000.000đ" },
  { label: "Module 3: Hệ thống bán + LMS (22 bài)", value: "50.000.000đ", highlight: true },
  { label: "Module 4: Quảng cáo Facebook (12 bài)", value: "4.000.000đ" },
  { label: "Bonus 1: 50 Prompt Claude", value: "1.997.000đ", bonus: true },
  { label: "Bonus 2: Source Code Next.js", value: "4.997.000đ", bonus: true },
  { label: "Bonus 3: Source Code LMS", value: "4.997.000đ", bonus: true },
  { label: "Bonus 4: 10 Template Canva", value: "997.000đ", bonus: true },
  { label: "Bonus 5: 7 Email Sequence", value: "497.000đ", bonus: true },
  { label: "Bonus 6: Group Zalo + Live Q&A", value: "2.997.000đ", bonus: true },
];

const TOTAL = "78.482.000đ";

export default function TotalValueSection({ onScrollToRegister }: TotalValueSectionProps) {
  return (
    <section
      className="relative overflow-hidden pt-12 pb-12 sm:pt-20 sm:pb-20 md:pt-24 md:pb-24 px-4 sm:px-6"
      style={{ background: "#050913" }}
    >
      <div className="mx-auto max-w-4xl">
        <div className="text-center mb-4">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] font-semibold"
            style={{
              borderColor: "rgba(229,182,99,0.3)",
              background: "rgba(229,182,99,0.06)",
              color: "#E5B663",
            }}
          >
            <Calculator size={12} /> Tổng Giá Trị
          </span>
        </div>

        <h2
          className="mb-3 text-center text-[26px] sm:text-3xl md:text-[40px] font-extrabold tracking-[-0.01em] leading-[1.15]"
          style={{ color: "#F1F5FB" }}
        >
          Tổng Kết — Bạn Đang Nhận
          <br className="hidden sm:block" />
          <span style={{ color: "#E5B663" }}>Những Gì?</span>
        </h2>
        <p
          className="mb-10 text-center text-[14px] sm:text-base leading-[1.7]"
          style={{ color: "rgba(241,245,251,0.65)" }}
        >
          4 Module Core + 6 Bonus tặng kèm — tổng giá trị thật:
        </p>

        <div
          className="overflow-hidden rounded-2xl"
          style={{
            background: "linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
            border: "1px solid rgba(229,182,99,0.2)",
          }}
        >
          <ul>
            {ROWS.map((row, i) => (
              <li
                key={row.label}
                className="flex items-center justify-between px-5 sm:px-7 py-4 sm:py-[18px]"
                style={{
                  borderBottom: i < ROWS.length - 1 ? "1px solid rgba(229,182,99,0.15)" : "none",
                  background: row.highlight ? "rgba(229,182,99,0.06)" : "transparent",
                }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span
                    className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: row.bonus ? "rgba(125,211,252,0.15)" : "rgba(229,182,99,0.15)",
                      border: row.bonus
                        ? "1px solid rgba(125,211,252,0.3)"
                        : "1px solid rgba(229,182,99,0.3)",
                    }}
                  >
                    <Check
                      className="h-3 w-3"
                      strokeWidth={3}
                      style={{ color: row.bonus ? "#7DD3FC" : "#E5B663" }}
                    />
                  </span>
                  <span
                    className="text-[14px] sm:text-[15px] tabular-nums truncate"
                    style={{ color: row.highlight ? "#F1F5FB" : "rgba(241,245,251,0.8)" }}
                  >
                    {row.label}
                  </span>
                </div>
                <span
                  className="text-[14px] sm:text-[15px] font-bold tabular-nums flex-shrink-0 ml-3"
                  style={{
                    color: row.highlight
                      ? "#E5B663"
                      : row.bonus
                      ? "#7DD3FC"
                      : "rgba(241,245,251,0.85)",
                  }}
                >
                  {row.value}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Total */}
        <div
          className="mt-8 rounded-2xl p-8 sm:p-10 text-center"
          style={{
            background:
              "linear-gradient(135deg, rgba(229,182,99,0.22) 0%, rgba(229,182,99,0.06) 100%)",
            border: "2px solid rgba(229,182,99,0.5)",
            boxShadow:
              "0 0 60px rgba(229,182,99,0.18), inset 0 1px 0 rgba(244,217,168,0.18)",
          }}
        >
          <div
            className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] mb-3"
            style={{ color: "#E5B663" }}
          >
            Tổng giá trị thực
          </div>
          <div
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold tabular-nums tracking-[-0.02em] mb-4"
            style={{
              background: "linear-gradient(135deg, #E5B663 0%, #F4D9A8 50%, #C9A86B 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {TOTAL}
          </div>
          <p
            className="text-[14px] sm:text-base leading-[1.7] mb-2"
            style={{ color: "rgba(241,245,251,0.75)" }}
          >
            Nhưng hôm nay bạn chỉ đầu tư:
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-[-0.01em] mb-2 text-white">
            10.000.000đ{" "}
            <span
              className="text-lg line-through font-normal ml-2 tabular-nums"
              style={{ color: "rgba(241,245,251,0.4)" }}
            >
              20.000.000đ
            </span>
          </p>
          <p
            className="text-[13px] sm:text-[14px] tabular-nums mb-6"
            style={{ color: "#34D399" }}
          >
            Bạn tiết kiệm <span className="font-bold">68.482.000đ</span> so với giá trị thật
          </p>

          <button
            onClick={onScrollToRegister}
            className="group inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm sm:text-base font-bold tracking-wide transition-all hover:scale-[1.03] cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #E5B663 0%, #F4D9A8 50%, #C9A86B 100%)",
              color: "#0A1020",
              boxShadow: "0 0 30px rgba(229,182,99,0.45)",
            }}
          >
            <Crown size={16} />
            ĐĂNG KÝ NGAY — TIẾT KIỆM 68 TRIỆU
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </section>
  );
}
