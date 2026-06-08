"use client";

import Image from "next/image";
import {
  Users,
  Video,
  Award,
  Star,
  CheckCircle,
  Download,
  ArrowRight,
  Code2,
} from "lucide-react";
import YouTubeFacade from "@/app/YouTubeFacade";

interface HeroSectionProps {
  onOpenModal?: () => void;
}

const FOUR_STEPS = [
  "Làm video AI để hút khách",
  "Xây kênh để khách tự tìm đến",
  "Đóng gói chuyên môn thành sản phẩm số",
  "Thiết kế website AI Agent tự bán hàng 24/7",
];

const CHANNEL_IMAGES = [1, 2, 3, 4];

export default function HeroSection({ onOpenModal }: HeroSectionProps) {
  return (
    <section className="pt-24 sm:pt-36 pb-12 sm:pb-24 relative px-4 sm:px-6">
      {/* Radial gold glow behind H1 */}
      <div
        className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-15 blur-[80px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, #D4A843, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-4xl mx-auto text-center">
        {/* Eyebrow badge */}
        <div
          className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-5 sm:mb-8 text-xs sm:text-sm font-medium"
          style={{
            background: "rgba(212,168,67,0.1)",
            border: "1px solid rgba(212,168,67,0.25)",
            color: "#D4A843",
          }}
        >
          <Users size={14} />
          <span>
            Hơn 1.300 chuyên gia &amp; chủ shop Việt đã xây hệ thống bán hàng tự
            động cùng Lê Đăng Khương.
          </span>
        </div>

        {/* Main H1 */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.15] mb-4 sm:mb-6 text-white">
          Bạn không cần giỏi công nghệ, cũng không cần làm việc nhiều hơn.
        </h1>

        {/* Sub-H1 */}
        <p className="text-xl sm:text-2xl lg:text-3xl font-bold leading-snug mb-5 sm:mb-7 text-white">
          Chỉ cần đi đúng 4 bước —{" "}
          <span className="text-[#D4A843]">
            tiền vẫn về ngay cả khi đang ngủ.
          </span>
        </p>

        {/* Unique USP badge */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium"
            style={{
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.3)",
              color: "#22c55e",
            }}
          >
            <Code2 size={14} />
            <span>
              Người duy nhất tự tay code toàn bộ hệ thống dangkhuong.com đang
              chạy
            </span>
          </div>
        </div>

        {/* 4-step inline checklist */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
          {FOUR_STEPS.map((step, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm bg-white/[0.03] border border-[#D4A843]/20 text-gray-200"
            >
              <CheckCircle size={14} className="text-[#D4A843] shrink-0" />
              <span>
                <span className="text-[#D4A843] font-semibold mr-1">
                  {idx + 1}.
                </span>
                {step}
              </span>
            </div>
          ))}
        </div>

        {/* Sub-paragraph */}
        <p className="text-sm sm:text-lg text-gray-400 max-w-2xl mx-auto mb-6 sm:mb-10 leading-relaxed">
          Làm video AI → Xây kênh hút khách → Đóng gói sản phẩm số → Website AI
          Agent tự bán hàng. Để AI Agent làm theo ý tưởng của bạn, bạn có thời
          gian sống trọn 8 khía cạnh cuộc đời.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center">
          <button
            type="button"
            onClick={onOpenModal}
            className="inline-flex items-center justify-center gap-2 px-5 sm:px-8 py-3 sm:py-3.5 rounded-xl font-semibold text-sm sm:text-base text-black transition-transform hover:scale-[1.02] active:scale-[0.99]"
            style={{
              background: "#D4A843",
              boxShadow: "0 8px 30px -8px rgba(212,168,67,0.45)",
            }}
          >
            <Download size={16} />
            <span>Nhận miễn phí &quot;Bí Mật Video AI Triệu View&quot;</span>
          </button>

          <a
            href="#roadmap"
            className="inline-flex items-center justify-center gap-2 px-5 sm:px-8 py-3 sm:py-3.5 rounded-xl font-semibold text-sm sm:text-base transition-colors"
            style={{
              background: "transparent",
              border: "1.5px solid #D4A843",
              color: "#D4A843",
            }}
          >
            <span>Xem lộ trình 4 bước</span>
            <ArrowRight size={16} />
          </a>
        </div>

        {/* Video giới thiệu */}
        <div className="mt-8 sm:mt-12 max-w-2xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden border border-[#D4A843]/20 aspect-video bg-black">
            <YouTubeFacade
              videoId="b7tuRnyuuNw"
              title="Video giới thiệu - Lê Đăng Khương"
            />
          </div>
        </div>

        {/* Student channel grid 2x2 */}
        <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-2 sm:gap-3 max-w-2xl mx-auto">
          {CHANNEL_IMAGES.map((i) => (
            <div
              key={i}
              className="relative rounded-xl overflow-hidden aspect-video border border-white/10 hover:border-[#D4A843]/30 transition-colors bg-[#111]"
            >
              <Image
                src={`/images/students/channel-${i}.jpg`}
                alt={`Kênh học viên ${i}`}
                width={400}
                height={225}
                sizes="(max-width: 768px) 50vw, 25vw"
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

        {/* Social proof bar */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-2 sm:gap-y-3 mt-6 sm:mt-10 text-xs sm:text-sm text-gray-400">
          <span className="flex items-center gap-1.5">
            <Users size={14} className="text-[#D4A843]" />
            <span>1.300+ học viên</span>
          </span>
          <span className="text-gray-600">•</span>
          <span className="flex items-center gap-1.5">
            <Video size={14} className="text-[#22c55e]" />
            <span>300M+ lượt view</span>
          </span>
          <span className="text-gray-600">•</span>
          <span className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={12} fill="#D4A843" color="#D4A843" />
            ))}
            <span className="ml-1">4.9/5 (500+ đánh giá)</span>
          </span>
          <span className="text-gray-600">•</span>
          <span className="flex items-center gap-1.5">
            <Award size={14} className="text-[#D4A843]" />
            <span>Founder Kohada</span>
          </span>
        </div>
      </div>
    </section>
  );
}
