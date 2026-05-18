"use client";

import {
  ChevronDown,
  Gift,
  Sparkles,
  Target,
  Wrench,
  Zap,
  Calculator,
} from "lucide-react";

const PROCESS_STEPS = [
  { n: 1, label: "Tìm ngách", icon: Target },
  { n: 2, label: "Tạo sản phẩm", icon: Sparkles },
  { n: 3, label: "Xây hệ thống", icon: Wrench },
  { n: 4, label: "Tự động bán", icon: Zap },
];

const PRODUCT_TYPES = [
  { icon: "📄", type: "Tài liệu PDF", example: "Checklist, Cheat sheet, SOP", price: "99K - 500K", featured: false },
  { icon: "📚", type: "Ebook", example: "Sách hướng dẫn, Case study", price: "199K - 2 triệu", featured: false },
  {
    icon: "🎬",
    type: "Khóa học video",
    example: "Mini course, Full course, Workshop",
    price: "499K - 50 triệu",
    featured: true,
    caseStudy: "Khoá 5tr · bán 100 đơn = 500tr",
  },
  { icon: "🎨", type: "Template/Preset", example: "Canva, Notion, Figma, Lightroom", price: "199K - 2 triệu", featured: false },
  { icon: "💻", type: "Phần mềm/Plugin", example: "SaaS, WP Plugin, Chrome Extension", price: "500K - 10 triệu", featured: false },
  { icon: "🎯", type: "Coaching/Consulting", example: "1:1, Group, Mastermind", price: "5 - 100 triệu", featured: false },
  { icon: "🎁", type: "Membership", example: "Cộng đồng trả phí hàng tháng", price: "99K - 3tr/tháng", featured: false },
];

const BENEFITS = [
  "Cách chọn ngách triệu đô — dùng AI brainstorm và validate trong 24 giờ",
  "Pre-sale validate ngách TRƯỚC khi đầu tư công sức — không bao giờ phí 80% thời gian",
  "Tạo Ebook, Tài liệu, Khóa học, Template bằng AI trong 5-7 ngày — giọng văn của bạn",
  "Tự xây website hoàn chỉnh giống dangkhuong.com — toàn bộ bằng Claude Code",
  "Tự động hóa 100% — khách CK → tạo account → giao sản phẩm → email — bạn không làm gì cả",
  "Chạy quảng cáo Facebook scale từ 500K/ngày lên 5 triệu/ngày một cách an toàn",
];

const PROFIT_SCENARIOS = [
  { product: "Ebook", math: "99K × 1.000 đơn", total: "99 triệu", emoji: "📚" },
  { product: "Khoá học", math: "5 triệu × 20 đơn", total: "100 triệu", emoji: "🎬" },
  { product: "Coaching", math: "50 triệu × 5 slot", total: "250 triệu", emoji: "🎯" },
];

export default function SolutionSection() {
  return (
    <section
      className="relative overflow-hidden pt-12 pb-12 sm:pt-20 sm:pb-20 md:pt-24 md:pb-24 px-4 sm:px-6"
      style={{ background: "#0A1020" }}
    >
      {/* Local CSS for animations */}
      <style>{`
        @keyframes flow-pulse {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes card-glow {
          0%, 100% { box-shadow: 0 0 0 2px rgba(229,182,99,0.45), 0 0 32px rgba(229,182,99,0.18); }
          50% { box-shadow: 0 0 0 2px rgba(244,217,168,0.75), 0 0 48px rgba(229,182,99,0.32); }
        }
        @keyframes chev-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }
        .process-line {
          background: linear-gradient(90deg,
            rgba(229,182,99,0.15) 0%,
            #E5B663 25%,
            #F4D9A8 50%,
            #E5B663 75%,
            rgba(229,182,99,0.15) 100%);
          background-size: 200% 100%;
          animation: flow-pulse 3.5s linear infinite;
        }
        .product-card {
          transition: transform 320ms cubic-bezier(.2,.7,.2,1),
                      box-shadow 320ms ease,
                      border-color 320ms ease;
        }
        .product-card:hover {
          transform: translateY(-4px);
          border-color: rgba(229,182,99,0.55) !important;
          box-shadow: 0 18px 40px -18px rgba(0,0,0,0.6),
                      0 0 0 1px rgba(229,182,99,0.35),
                      0 0 36px rgba(229,182,99,0.22);
        }
        .featured-card {
          animation: card-glow 3.2s ease-in-out infinite;
        }
        .chev-bounce {
          animation: chev-bounce 1.6s ease-in-out infinite;
        }
      `}</style>

      <div className="mx-auto max-w-6xl">
        {/* Tag */}
        <div className="text-center mb-4">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] font-semibold"
            style={{
              borderColor: "rgba(229,182,99,0.3)",
              background: "rgba(229,182,99,0.06)",
              color: "#E5B663",
            }}
          >
            <Gift size={12} /> Giải Pháp
          </span>
        </div>

        <h2
          className="mb-3 text-center text-[26px] sm:text-3xl md:text-[40px] font-extrabold tracking-[-0.01em] leading-[1.15]"
          style={{ color: "#F1F5FB" }}
        >
          Học Chưa Xong - <span style={{ color: "#E5B663" }}>Tiền Đã Về</span>
        </h2>

        <p
          className="mx-auto max-w-3xl text-center text-[14px] sm:text-base leading-[1.7] mb-10"
          style={{ color: "rgba(241,245,251,0.65)" }}
        >
          Chương trình đào tạo <strong className="text-white">duy nhất tại Việt Nam</strong> giúp bạn tự xây
          toàn bộ hệ thống bán SẢN PHẨM SỐ bằng AI Agent — trong 7 đến 30 ngày.
        </p>

        {/* Subtle banner */}
        <div
          className="rounded-2xl p-5 sm:p-6 mb-12 text-center"
          style={{
            background: "linear-gradient(180deg, rgba(229,182,99,0.08) 0%, transparent 100%)",
            border: "1px solid rgba(229,182,99,0.2)",
          }}
        >
          <p
            className="text-[14px] sm:text-[15px] leading-[1.7]"
            style={{ color: "rgba(241,245,251,0.78)" }}
          >
            Bán bất kỳ sản phẩm số nào — TẤT CẢ trên một hệ thống duy nhất do{" "}
            <strong className="text-white">BẠN sở hữu 100%</strong>. Không cần biết code. Không cần thuê dev. Không cần đốt tiền nền tảng.
          </p>
        </div>

        {/* === Process diagram === */}
        <div className="mb-12">
          <h3 className="text-center text-lg sm:text-xl font-bold mb-2 text-white tracking-[-0.005em]">
            🧭 Lộ trình 4 bước
          </h3>
          <p className="text-center text-[13px] sm:text-sm mb-6" style={{ color: "rgba(241,245,251,0.55)" }}>
            Từ con số 0 đến cỗ máy tự động bán hàng
          </p>

          <div
            className="rounded-2xl p-6 sm:p-8"
            style={{
              background: "linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
              border: "1px solid rgba(229,182,99,0.18)",
            }}
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-0">
              {PROCESS_STEPS.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div key={step.n} className="flex items-center sm:flex-1">
                    {/* Step node */}
                    <div className="flex flex-col items-center text-center flex-1 sm:flex-none">
                      <div className="relative">
                        <div
                          className="w-14 h-14 sm:w-14 sm:h-14 rounded-full flex items-center justify-center"
                          style={{
                            background:
                              "radial-gradient(circle at 30% 30%, #F4D9A8 0%, #E5B663 55%, #C9A86B 100%)",
                            boxShadow:
                              "0 8px 24px -8px rgba(229,182,99,0.55), inset 0 1px 0 rgba(255,255,255,0.4)",
                          }}
                        >
                          <Icon size={22} style={{ color: "#0A1020" }} strokeWidth={2.5} />
                        </div>
                        <div
                          className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold tabular-nums"
                          style={{
                            background: "#0A1020",
                            color: "#E5B663",
                            border: "1.5px solid #E5B663",
                          }}
                        >
                          {step.n}
                        </div>
                      </div>
                      <div
                        className="mt-3 text-[10px] sm:text-[11px] uppercase tracking-[0.16em] font-semibold whitespace-nowrap"
                        style={{ color: "#F1F5FB" }}
                      >
                        {step.label}
                      </div>
                    </div>

                    {/* Connector line — hidden after last step */}
                    {idx < PROCESS_STEPS.length - 1 && (
                      <>
                        {/* Horizontal line on sm+ — tightened margin */}
                        <div className="hidden sm:block flex-1 mx-1.5 h-[2px] rounded-full process-line" />
                        {/* Vertical chev on mobile */}
                        <div className="sm:hidden w-full flex justify-center my-0.5">
                          <ChevronDown size={18} style={{ color: "#E5B663" }} />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* === Product types === */}
        <div className="mb-12">
          <h3 className="text-center text-lg sm:text-xl font-bold mb-2 text-white tracking-[-0.005em]">
            💎 Hệ thống này bán được những gì?
          </h3>
          <p className="text-center text-[13px] sm:text-sm mb-6" style={{ color: "rgba(241,245,251,0.55)" }}>
            Một hệ thống — bán được TẤT CẢ
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRODUCT_TYPES.map((p) => {
              if (p.featured) {
                return (
                  <div
                    key={p.type}
                    className="product-card featured-card relative rounded-2xl p-5 sm:col-span-2 lg:row-span-2 lg:col-span-2 flex flex-col justify-between"
                    style={{
                      background:
                        "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(229,182,99,0.14) 0%, transparent 70%), linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
                      border: "2px solid rgba(229,182,99,0.45)",
                      minHeight: "220px",
                    }}
                  >
                    {/* Ribbon */}
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full text-[10px] uppercase tracking-[0.18em] font-bold whitespace-nowrap"
                      style={{
                        background: "linear-gradient(90deg, #E5B663 0%, #F4D9A8 50%, #E5B663 100%)",
                        color: "#0A1020",
                        boxShadow: "0 6px 18px -6px rgba(229,182,99,0.6)",
                      }}
                    >
                      🔥 Phổ biến nhất
                    </div>

                    <div>
                      <div className="flex items-center gap-3 mb-3 mt-2">
                        <span className="text-4xl sm:text-5xl">{p.icon}</span>
                        <h4 className="text-xl sm:text-2xl font-extrabold text-white tracking-[-0.01em]">
                          {p.type}
                        </h4>
                      </div>
                      <p
                        className="text-[12.5px] sm:text-[13px] leading-[1.55] mb-4"
                        style={{ color: "rgba(241,245,251,0.72)" }}
                      >
                        {p.example}
                      </p>

                      {/* Case study chip */}
                      {p.caseStudy && (
                        <div
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] sm:text-[13px] font-semibold mb-4"
                          style={{
                            background: "rgba(52,211,153,0.1)",
                            color: "#34D399",
                            border: "1px solid rgba(52,211,153,0.3)",
                          }}
                        >
                          <Sparkles size={14} /> {p.caseStudy}
                        </div>
                      )}
                    </div>

                    <div
                      className="inline-flex items-center self-start text-[11px] sm:text-[12px] font-semibold tabular-nums px-3 py-1.5 rounded-md h-7"
                      style={{
                        background: "rgba(229,182,99,0.15)",
                        color: "#F4D9A8",
                        border: "1px solid rgba(229,182,99,0.35)",
                      }}
                    >
                      {p.price}
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={p.type}
                  className="product-card rounded-2xl p-5 flex flex-col"
                  style={{
                    background: "linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
                    border: "1px solid rgba(229,182,99,0.12)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{p.icon}</span>
                    <h4 className="text-base sm:text-lg font-bold text-white tracking-[-0.005em]">
                      {p.type}
                    </h4>
                  </div>
                  <p
                    className="text-[12.5px] sm:text-[13px] leading-[1.55] mb-3 flex-1"
                    style={{ color: "rgba(241,245,251,0.6)" }}
                  >
                    {p.example}
                  </p>
                  <div
                    className="inline-flex items-center self-start text-[11px] sm:text-[12px] font-semibold tabular-nums px-2.5 py-1 rounded-md h-7"
                    style={{
                      background: "rgba(229,182,99,0.1)",
                      color: "#E5B663",
                      border: "1px solid rgba(229,182,99,0.2)",
                    }}
                  >
                    {p.price}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* What you'll learn */}
        <div
          className="rounded-2xl p-6 sm:p-10"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(229,182,99,0.08) 0%, transparent 70%), linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
            border: "1px solid rgba(229,182,99,0.2)",
          }}
        >
          <div className="flex items-center gap-2 mb-6 justify-center sm:justify-start">
            <Target size={20} style={{ color: "#E5B663" }} />
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-[-0.005em]">
              Trong chương trình này, bạn sẽ học được:
            </h3>
          </div>

          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {BENEFITS.map((b, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-xl p-4"
                style={{
                  background: "rgba(229,182,99,0.04)",
                  border: "1px solid rgba(229,182,99,0.08)",
                }}
              >
                <Sparkles className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: "#E5B663" }} />
                <span
                  className="text-[14px] sm:text-[14.5px] leading-[1.7]"
                  style={{ color: "rgba(241,245,251,0.85)" }}
                >
                  {b}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* === Profit calculator === */}
        <div
          className="mt-12 rounded-2xl p-6 sm:p-8"
          style={{
            background:
              "radial-gradient(ellipse 100% 70% at 50% 0%, rgba(229,182,99,0.12) 0%, transparent 70%), linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
            border: "1px solid rgba(229,182,99,0.35)",
          }}
        >
          <div className="flex items-center gap-2 mb-2 justify-center">
            <Calculator size={20} style={{ color: "#E5B663" }} />
            <h3 className="text-lg sm:text-xl font-bold text-white text-center tracking-[-0.005em]">
              Tổng hợp lợi nhuận tiềm năng
            </h3>
          </div>
          <p className="text-center text-[13px] sm:text-sm mb-6" style={{ color: "rgba(241,245,251,0.6)" }}>
            3 kịch bản — cùng một hệ thống bạn xây
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PROFIT_SCENARIOS.map((s) => (
              <div
                key={s.product}
                className="rounded-xl p-5 text-center flex flex-col items-center justify-between min-h-[180px]"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(229,182,99,0.10) 0%, rgba(229,182,99,0.03) 100%)",
                  border: "1px solid rgba(229,182,99,0.3)",
                }}
              >
                <div className="text-3xl mb-2">{s.emoji}</div>
                <div
                  className="text-[13px] font-semibold mb-1"
                  style={{ color: "rgba(241,245,251,0.7)" }}
                >
                  {s.product}
                </div>
                <div
                  className="text-[12px] tabular-nums mb-3"
                  style={{ color: "rgba(241,245,251,0.55)" }}
                >
                  {s.math}
                </div>
                <div
                  className="text-xl sm:text-2xl font-extrabold tabular-nums"
                  style={{
                    background:
                      "linear-gradient(90deg, #F4D9A8 0%, #E5B663 50%, #C9A86B 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {s.total}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* === CTA bridge === */}
        <div className="mt-8 flex flex-col items-center text-center">
          <p
            className="text-[13px] sm:text-sm font-medium leading-[1.7]"
            style={{ color: "rgba(241,245,251,0.85)" }}
          >
            Vậy chương trình này dạy gì? Cuộn xuống xem{" "}
            <span style={{ color: "#E5B663", fontWeight: 700 }}>50 bài học chi tiết</span> →
          </p>
          <ChevronDown
            className="chev-bounce mt-3"
            size={28}
            style={{ color: "#E5B663" }}
          />
        </div>
      </div>
    </section>
  );
}
