"use client";

import { Gift, AlertTriangle, ArrowRight, Phone, Mail } from "lucide-react";
import { siteConfig, getZaloPhone } from "@/lib/site-config";

/* ─── Data ───────────────────────────────────────────── */

const BONUSES = [
  {
    title: "Ebook 10 Ngách YouTube AI Kiếm USD Năm 2026",
    value: "299.000đ",
    details: "Phân tích 10 ngách hot, số liệu doanh thu, mức cạnh tranh",
  },
  {
    title: "Group Zalo VIP - Cập Nhật Trend AI Hàng Tuần",
    value: "500.000đ",
    details: "Cập nhật công cụ AI, trend YouTube, networking cộng đồng",
  },
];

const URGENCY_POINTS = [
  "Giá ưu đãi chỉ áp dụng cho 100 học viên đầu tiên",
  "Sau 100 slot: Standard 999.000đ / Đồng Hành 1.990.000đ",
  "Slot Gói Đồng Hành giới hạn 50 người/đợt",
];

/* ─── Props ──────────────────────────────────────────── */

interface FinalCTASectionProps {
  onScrollToRegister?: () => void;
}

/* ─── Component ──────────────────────────────────────── */

export default function FinalCTASection({ onScrollToRegister }: FinalCTASectionProps) {
  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      {/* ══════════════════════════════════════════════════
          PART 1 – BONUS
         ══════════════════════════════════════════════════ */}
      <div className="mx-auto max-w-5xl px-4 py-12 sm:py-20 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="mb-8 sm:mb-12 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Gift className="h-6 w-6" style={{ color: "#FBBF24" }} />
            <span
              className="text-sm font-bold uppercase tracking-widest"
              style={{ color: "#FBBF24" }}
            >
              Bonus
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-white sm:text-4xl lg:text-5xl">
            Đăng Ký Hôm Nay –{" "}
            <span style={{ color: "#FBBF24" }}>Nhận Thêm Miễn Phí</span>
          </h2>
        </div>

        {/* Bonus Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {BONUSES.map((bonus, i) => (
            <div
              key={i}
              className="rounded-2xl p-6 sm:p-8"
              style={{
                backgroundColor: "#111",
                border: "2px dashed #FBBF24",
              }}
            >
              <div className="mb-3 flex items-center gap-2">
                <Gift className="h-5 w-5" style={{ color: "#FBBF24" }} />
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "#FBBF24" }}
                >
                  Bonus {i + 1}
                </span>
              </div>
              <h3 className="mb-2 text-lg font-bold leading-snug text-white sm:text-xl">
                {bonus.title}
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-gray-400">
                {bonus.details}
              </p>
              <span
                className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
                style={{ backgroundColor: "rgba(251,191,36,0.15)", color: "#FBBF24" }}
              >
                Giá trị: {bonus.value}
              </span>
            </div>
          ))}
        </div>

        {/* Total bonus value */}
        <div
          className="mt-8 rounded-xl p-5 text-center"
          style={{
            backgroundColor: "rgba(251,191,36,0.08)",
            border: "1px solid rgba(251,191,36,0.3)",
          }}
        >
          <p className="text-base font-extrabold text-white sm:text-lg">
            TỔNG GIÁ TRỊ BONUS:{" "}
            <span style={{ color: "#FBBF24" }}>998.000đ</span> – HÔM NAY{" "}
            <span style={{ color: "#4ade80" }}>MIỄN PHÍ 100%</span>
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          PART 2 – URGENCY
         ══════════════════════════════════════════════════ */}
      <div
        className="py-14"
        style={{
          background:
            "linear-gradient(180deg, rgba(251,191,36,0.06) 0%, transparent 100%)",
        }}
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-center gap-2">
            <AlertTriangle className="h-6 w-6" style={{ color: "#FBBF24" }} />
            <span
              className="text-sm font-bold uppercase tracking-widest"
              style={{ color: "#FBBF24" }}
            >
              Số lượng có hạn
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {URGENCY_POINTS.map((point, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl px-6 py-4"
                style={{
                  backgroundColor: "#111",
                  border: "1px solid #1f1f1f",
                }}
              >
                <AlertTriangle
                  className="h-5 w-5 shrink-0"
                  style={{ color: "#F59E0B" }}
                />
                <span className="text-sm font-semibold text-white sm:text-base">
                  {point}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          PART 3 – FINAL CTA
         ══════════════════════════════════════════════════ */}
      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-20 sm:px-6 lg:px-8">
        {/* Headline */}
        <h2 className="mb-6 sm:mb-10 text-center text-2xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
          1 năm nữa, bạn muốn{" "}
          <span style={{ color: "#FBBF24" }}>ở đâu?</span>
        </h2>

        {/* Contrasting Options */}
        <div className="mb-8 sm:mb-12 grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
          {/* Option A – Negative */}
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
            }}
          >
            <p className="text-sm font-semibold leading-relaxed text-gray-300 sm:text-lg">
              <span className="mr-2">&#10060;</span>
              Vẫn lướt YouTube xem người khác kiếm $30.000/tháng...
            </p>
          </div>

          {/* Option B – Positive */}
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: "rgba(74,222,128,0.08)",
              border: "1px solid rgba(74,222,128,0.25)",
            }}
          >
            <p className="text-sm font-semibold leading-relaxed text-white sm:text-lg">
              <span className="mr-2">&#9989;</span>
              Hay CHÍNH BẠN đang đăng video thứ 38, check doanh thu $20.000?
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="mb-6 sm:mb-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6">
          {/* Standard */}
          <button
            type="button"
            onClick={onScrollToRegister}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-8 py-4 text-center text-sm font-bold uppercase tracking-wide transition-opacity hover:opacity-90 sm:w-auto cursor-pointer"
            style={{ background: "linear-gradient(135deg, #FBBF24, #F59E0B)", color: "#000000" }}
          >
            GÓI STANDARD – 499K
            <ArrowRight className="h-4 w-4" />
          </button>

          {/* Ultra / Dong Hanh */}
          <button
            type="button"
            onClick={onScrollToRegister}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-10 py-5 text-center text-base font-bold uppercase tracking-wide text-gray-900 transition-opacity hover:opacity-90 sm:w-auto cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #FBBF24, #F59E0B)",
            }}
          >
            GÓI ĐỒNG HÀNH – 789K &#11088;
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        {/* Quote */}
        <p className="mx-auto max-w-2xl text-center text-base italic leading-relaxed text-gray-400 sm:text-lg">
          &ldquo;Người thành công không phải người thông minh nhất – mà là người{" "}
          <span className="font-semibold not-italic" style={{ color: "#FBBF24" }}>
            HÀNH ĐỘNG NHANH NHẤT
          </span>
          .&rdquo;
        </p>
      </div>

      {/* ══════════════════════════════════════════════════
          PART 4 – FOOTER
         ══════════════════════════════════════════════════ */}
      <footer
        className="py-10"
        style={{
          backgroundColor: "#050505",
          borderTop: "1px solid #1f1f1f",
        }}
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Contact info */}
          <div className="mb-6 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
            <a
              href={siteConfig.socials.zalo}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
            >
              <Phone className="h-4 w-4" style={{ color: "#FBBF24" }} />
              Zalo: {getZaloPhone()}
            </a>
            <a
              href="mailto:support@dangkhuong.com"
              className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
            >
              <Mail className="h-4 w-4" style={{ color: "#FBBF24" }} />
              support@dangkhuong.com
            </a>
          </div>

          {/* Copyright */}
          <p className="text-center text-xs leading-relaxed text-gray-500">
            &copy; 2026 Lê Đăng Khương Academy | dangkhuong.com | Powered by
            Kohada
          </p>
        </div>
      </footer>
    </section>
  );
}
