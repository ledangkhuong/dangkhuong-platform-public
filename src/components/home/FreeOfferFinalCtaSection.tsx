"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Gift,
  Download,
  Shield,
  Zap,
  Star,
  MessageCircle,
  ArrowRight,
} from "lucide-react";

interface FreeOfferFinalCtaSectionProps {
  onOpenModal?: () => void;
  facebookUrl?: string;
  ownerName?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

const RESET_SECONDS = 23 * 3600 + 59 * 60 + 59;

interface ValueRow {
  label: string;
  price: string;
}

const valueRows: ValueRow[] = [
  {
    label:
      'PHẦN 1 — 10 ngách video dễ lên triệu view tại VN 2026 (kèm phân tích cạnh tranh)',
    price: "990.000đ",
  },
  {
    label:
      'PHẦN 2 — Bí mật Hook 3 giây đầu: yếu tố quyết định 80% thành công của video',
    price: "990.000đ",
  },
  {
    label:
      'PHẦN 3 — Giải mã thuật toán 2026: YouTube Shorts, TikTok, Facebook Reels',
    price: "1.010.000đ",
  },
];

export default function FreeOfferFinalCtaSection({
  onOpenModal,
  facebookUrl = "https://www.facebook.com/jackmadk13",
  ownerName = "Lê Đăng Khương",
}: FreeOfferFinalCtaSectionProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(RESET_SECONDS);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? RESET_SECONDS : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;

  const handleOpenModal = () => {
    if (onOpenModal) onOpenModal();
  };

  return (
    <>
      {/* ═══ PART A: FREE OFFER ═══ */}
      <section
        id="free-offer"
        className="py-12 sm:py-24 px-4 sm:px-6 relative overflow-hidden scroll-mt-20"
      >
        {/* Gold radial glow background */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, #D4A843, transparent 70%)",
          }}
        />

        <div className="relative max-w-6xl mx-auto">
          {/* Heading */}
          <div className="text-center mb-10">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 text-sm font-bold"
              style={{
                background: "rgba(212,168,67,0.15)",
                color: "#D4A843",
                border: "1px solid rgba(212,168,67,0.25)",
              }}
            >
              <Gift size={16} /> TẶNG MIỄN PHÍ TỪ {ownerName.toUpperCase()}
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold mb-3">
              Cẩm nang &quot;Bí Mật Video AI{" "}
              <span className="text-[#D4A843]">Triệu View</span>&quot;
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Cẩm nang độc quyền giúp bạn tạo video AI viral triệu view — ngay
              cả khi mới bắt đầu từ con số 0.
            </p>
          </div>

          {/* Banner image */}
          <div className="mb-10 rounded-2xl overflow-hidden border border-[#D4A843]/20">
            <Image
              src="/images/hero/offer-banner.jpg"
              alt='Bí Mật Video AI Triệu View - Cẩm nang miễn phí'
              width={1200}
              height={600}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1100px"
              className="w-full h-auto object-cover"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* LEFT: Value stack table */}
            <div className="bg-[#111] border border-[#D4A843]/30 rounded-2xl p-6 sm:p-8">
              <h3 className="text-lg sm:text-xl font-bold mb-5 flex items-center gap-2">
                <Gift size={20} className="text-[#D4A843]" />
                Bên trong cẩm nang có gì?
              </h3>

              <div className="divide-y divide-white/5">
                {valueRows.map((row, i) => (
                  <div
                    key={i}
                    className="py-4 flex items-start justify-between gap-4"
                  >
                    <p className="text-sm text-gray-200 leading-relaxed flex-1">
                      {row.label}
                    </p>
                    <span className="text-sm font-bold text-[#D4A843] shrink-0 whitespace-nowrap">
                      {row.price}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="mt-2 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-300">
                  TỔNG TRỊ GIÁ:
                </span>
                <span className="text-base sm:text-lg font-bold line-through text-gray-500">
                  2.990.000đ
                </span>
              </div>

              {/* Free today */}
              <div
                className="mt-3 rounded-xl p-4 flex items-center justify-between"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(212,168,67,0.12), rgba(34,197,94,0.10))",
                  border: "1px solid rgba(212,168,67,0.25)",
                }}
              >
                <span className="text-sm font-bold text-white">
                  HÔM NAY BẠN NHẬN:
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#D4A843]">
                  MIỄN PHÍ
                </span>
              </div>
            </div>

            {/* RIGHT: CTA box */}
            <div className="bg-[#111] border-2 border-[#D4A843]/30 rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center">
              <Gift size={40} className="text-[#D4A843] mb-4" />
              <h3 className="text-xl sm:text-2xl font-bold mb-3">
                NHẬN CẨM NANG NGAY HÔM NAY
              </h3>
              <p className="text-sm text-gray-400 mb-5 leading-relaxed">
                Đăng ký miễn phí — chỉ cần email + số điện thoại. Cẩm nang gửi
                trong 2 phút.
              </p>

              {/* Countdown */}
              <div
                className="mb-5 px-4 py-2 rounded-full font-mono text-sm"
                style={{
                  background: "rgba(34,197,94,0.10)",
                  color: "#22c55e",
                  border: "1px solid rgba(34,197,94,0.25)",
                }}
              >
                ⏰ Ưu đãi kết thúc sau: {pad(h)}:{pad(m)}:{pad(s)}
              </div>

              <button
                type="button"
                onClick={handleOpenModal}
                className="btn-green w-full justify-center py-3.5 text-base inline-flex items-center gap-2 rounded-lg font-semibold transition-colors"
                style={{
                  background: "#22c55e",
                  color: "#0a0a0a",
                }}
              >
                <Download size={18} /> ĐĂNG KÝ NHẬN MIỄN PHÍ →
              </button>

              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
                <span className="inline-flex items-center gap-1.5">
                  <Shield size={12} className="text-[#D4A843]" /> Bảo mật tuyệt
                  đối
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Zap size={12} className="text-[#D4A843]" /> Gửi trong 2 phút
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PART B: FINAL CTA ═══ */}
      <section className="py-12 sm:py-24 px-4 sm:px-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at center, #D4A843, transparent 60%)",
          }}
        />

        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-4xl font-extrabold mb-5 leading-tight">
            Bạn đã <span className="text-[#D4A843]">35–40 tuổi</span> rồi —
            đừng để thêm một năm nữa trôi qua mà vẫn tự tay làm hết.
          </h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Bạn không thiếu tài năng. Bạn chỉ thiếu một hệ thống. Bắt đầu miễn
            phí ngay hôm nay: đi đúng 4 bước, để AI bán hàng thay bạn 24/7 — và
            bạn có lại cuộc đời mình.
          </p>

          {/* Trust row */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={14} fill="#D4A843" color="#D4A843" />
              ))}
            </div>
            <span className="ml-1">4.9/5 từ 500+ học viên</span>
            <span className="mx-2 text-gray-600">|</span>
            <span>👥 1.300+ học viên đã thành công</span>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              type="button"
              onClick={handleOpenModal}
              className="btn-green text-base py-3.5 px-6 inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors"
              style={{ background: "#22c55e", color: "#0a0a0a" }}
            >
              <Download size={18} /> Nhận miễn phí &quot;Bí Mật Video AI Triệu
              View&quot;
            </button>
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-lg text-base font-semibold border border-white/10 hover:border-white/20 transition-colors"
            >
              <MessageCircle size={16} className="text-[#D4A843]" /> Tư vấn
              trực tiếp với {ownerName}
            </a>
          </div>
        </div>
      </section>

      {/* ═══ PART C: FOOTER ═══ */}
      <footer className="border-t border-white/5 py-12 pb-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Brand tagline */}
          <div className="text-center mb-10">
            <p className="text-2xl sm:text-3xl italic font-semibold text-[#D4A843]">
              Giỏi nghề. Tự do. Sống trọn cuộc đời.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            {/* Col 1: About */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <Image
                  src="/images/about/portrait.jpg"
                  alt={ownerName}
                  width={32}
                  height={32}
                  sizes="32px"
                  className="w-8 h-8 rounded-lg object-cover"
                />
                <span className="font-bold text-sm">{ownerName}</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a
                    href="#about"
                    className="hover:text-white transition-colors"
                  >
                    Giới thiệu
                  </a>
                </li>
                <li>
                  <Link
                    href="/blog"
                    className="hover:text-white transition-colors"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Liên hệ
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 2: Courses */}
            <div>
              <h3 className="font-bold text-sm mb-4">Khoá học</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link
                    href="/courses"
                    className="hover:text-white transition-colors"
                  >
                    Video AI VEO3.1 A-Z
                  </Link>
                </li>
                <li>
                  <Link
                    href="/courses"
                    className="hover:text-white transition-colors"
                  >
                    Xây Kênh Triệu View
                  </Link>
                </li>
                <li>
                  <Link
                    href="/courses"
                    className="hover:text-white transition-colors"
                  >
                    AI Agent Bán Hàng
                  </Link>
                </li>
                <li>
                  <Link
                    href="/courses"
                    className="hover:text-white transition-colors"
                  >
                    30Day10M Challenge
                  </Link>
                </li>
                <li>
                  <Link
                    href="/courses"
                    className="hover:text-white transition-colors"
                  >
                    Sản phẩm số
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Support */}
            <div>
              <h3 className="font-bold text-sm mb-4">Hỗ trợ</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link
                    href="/community"
                    className="hover:text-white transition-colors"
                  >
                    Cộng đồng
                  </Link>
                </li>
                <li>
                  <Link
                    href="/events"
                    className="hover:text-white transition-colors"
                  >
                    Sự kiện
                  </Link>
                </li>
                <li>
                  <a
                    href="#faq"
                    className="hover:text-white transition-colors"
                  >
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4: Newsletter */}
            <div>
              <h3 className="font-bold text-sm mb-4">Đăng ký nhận tin</h3>
              <p className="text-xs text-gray-400 mb-3">
                Nhận tip Video AI + Xây kênh triệu view mỗi tuần.
              </p>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleOpenModal();
                }}
              >
                <input
                  type="email"
                  placeholder="Email của bạn"
                  className="input-dark flex-1 text-sm py-2 px-3 rounded-lg bg-[#0a0a0a] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4A843]/50"
                />
                <button
                  type="submit"
                  className="btn-green text-xs py-2 px-3 shrink-0 inline-flex items-center justify-center gap-1 rounded-lg font-semibold"
                  style={{ background: "#22c55e", color: "#0a0a0a" }}
                >
                  Đăng ký <ArrowRight size={12} />
                </button>
              </form>
            </div>
          </div>

          {/* Bottom row */}
          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
            <p>
              &copy; 2026 {ownerName} · dangkhuong.com · Powered by Kohada
            </p>
            <div className="flex gap-4">
              <Link
                href="/privacy"
                className="hover:text-white transition-colors"
              >
                Chính sách bảo mật
              </Link>
              <Link
                href="/terms"
                className="hover:text-white transition-colors"
              >
                Điều khoản dịch vụ
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
