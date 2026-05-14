"use client";

import { Check, Star, Crown, Users } from "lucide-react";

/* ─── Data ───────────────────────────────────────────── */

const STANDARD_FEATURES = [
  "Video 1: Hướng dẫn làm video bằng VEO 3.1 (60-90 phút)",
  "Video 2: Hướng dẫn edit video bằng CapCut (60-90 phút)",
  "File Prompt VEO 3.1 độc quyền (trị giá 1.500K)",
  "Bộ Âm thanh bản quyền 100+ nhạc + 200+ SFX (trị giá 1.000K)",
  "Truy cập trọn đời – Cập nhật miễn phí",
  "Xem trên mobile/PC/tablet",
];

const ULTRA_EXTRA_FEATURES = [
  "Group Hỗ Trợ Riêng Tư (Zalo/Facebook)",
  "Mentor Review Video Của Bạn",
  "Cam Kết Ra Video Đầu Trong 7-14 Ngày",
  "Cập Nhật Prompt Mới Liên Tục",
  "Chia Sẻ Case Study Học Viên",
];

/* ─── Component ──────────────────────────────────────── */

export default function PricingSection() {
  return (
    <section
      id="pricing"
      className="relative overflow-hidden py-20 md:py-28"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* ── Title ── */}
        <h2 className="mb-14 text-center text-3xl font-bold text-white md:text-4xl lg:text-5xl">
          Chọn Gói Phù Hợp Với Bạn
        </h2>

        {/* ── Cards Grid ── */}
        <div className="grid grid-cols-1 items-stretch gap-8 md:grid-cols-2">
          {/* ──────── CARD 1 – STANDARD ──────── */}
          <div
            className="flex flex-col rounded-2xl p-8"
            style={{
              backgroundColor: "#111",
              border: "1px solid #1f1f1f",
            }}
          >
            {/* Header */}
            <div className="mb-6 flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-400" />
              <span className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                Gói Standard
              </span>
            </div>

            {/* Price */}
            <div className="mb-4">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-extrabold text-white">
                  499.000đ
                </span>
                <span className="text-lg text-gray-500 line-through">
                  999.000đ
                </span>
              </div>
              <span
                className="mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold"
                style={{ backgroundColor: "#14532d", color: "#4ade80" }}
              >
                Tiết kiệm 500.000đ
              </span>
            </div>

            {/* Features */}
            <ul className="mb-6 flex-1 space-y-3">
              {STANDARD_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
                  <span className="text-sm leading-relaxed text-gray-300">
                    {f}
                  </span>
                </li>
              ))}
            </ul>

            {/* Suitable for */}
            <p className="mb-6 flex items-center gap-2 text-sm italic text-gray-400">
              <Users className="h-4 w-4 shrink-0" />
              Người tự học tốt, có nền tảng cơ bản
            </p>

            {/* CTA */}
            <a
              href="/courses/standard-lam-video-youtube-slow-english-bang-veo3-1"
              className="block rounded-xl border-2 py-3.5 text-center text-sm font-bold uppercase tracking-wide transition-colors hover:bg-yellow-400/10"
              style={{ borderColor: "#FBBF24", color: "#FBBF24" }}
            >
              Đăng Ký Gói Standard
            </a>
          </div>

          {/* ──────── CARD 2 – ULTRA (ĐỒNG HÀNH) ──────── */}
          <div
            className="relative flex flex-col rounded-2xl p-8 md:-my-4 md:p-10"
            style={{
              backgroundColor: "#111",
              border: "2px solid #FBBF24",
              boxShadow: "0 0 40px rgba(251,191,36,0.08)",
            }}
          >
            {/* Recommended badge */}
            <span
              className="absolute -top-4 right-6 z-10 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide"
              style={{ backgroundColor: "#FBBF24", color: "#0a0a0a" }}
            >
              <Star className="h-3.5 w-3.5" />
              Đề Xuất
            </span>

            {/* Header */}
            <div className="mb-6 flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-400" />
              <span className="text-sm font-semibold uppercase tracking-wider text-yellow-400">
                Gói Ultra (Đồng Hành)
              </span>
            </div>

            {/* Price */}
            <div className="mb-4">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-extrabold text-white md:text-5xl">
                  789.000đ
                </span>
                <span className="text-lg text-gray-500 line-through">
                  1.990.000đ
                </span>
              </div>
              <span
                className="mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold"
                style={{ backgroundColor: "#14532d", color: "#4ade80" }}
              >
                Tiết kiệm 1.200.000đ
              </span>
            </div>

            {/* Standard features */}
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Tất cả trong Standard, cộng thêm:
            </p>
            <ul className="mb-2 space-y-3">
              {STANDARD_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
                  <span className="text-sm leading-relaxed text-gray-300">
                    {f}
                  </span>
                </li>
              ))}
            </ul>

            {/* Extra Ultra features */}
            <ul className="mb-6 mt-2 space-y-3 border-t border-white/10 pt-4">
              {ULTRA_EXTRA_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
                  <span className="text-sm font-medium leading-relaxed text-white">
                    {f}
                  </span>
                </li>
              ))}
            </ul>

            {/* Suitable for */}
            <p className="mb-6 flex items-center gap-2 text-sm italic text-gray-400">
              <Users className="h-4 w-4 shrink-0" />
              Người mới hoàn toàn, cần người dắt tay
            </p>

            {/* CTA */}
            <a
              href="/courses/ultra-dong-hanh-lam-video-youtube-slow-english-bang-veo3-1"
              className="block rounded-xl py-4 text-center text-base font-bold uppercase tracking-wide text-gray-900 transition-opacity hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, #FBBF24, #F59E0B)",
              }}
            >
              Đăng Ký Gói Đồng Hành
            </a>

            {/* Bottom note */}
            <p className="mt-4 text-center text-xs text-gray-400">
              80% học viên chọn gói này vì có người hỗ trợ khi bí
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
