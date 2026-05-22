"use client";

import {
  ArrowRight,
  Crown,
  X,
  Check,
  Star,
  BadgeCheck,
  AlertCircle,
  Rocket,
  Cog,
  Trophy,
  MessageCircle,
} from "lucide-react";
import { siteConfig } from "@/lib/site-config";

interface FinalCTASectionProps {
  onScrollToRegister?: () => void;
}

const CHOICE_1 = [
  "Tiếp tục đốt 3.8 triệu/tháng cho Kajabi/Skool",
  "Tiếp tục phụ thuộc dev và nền tảng",
  "Tiếp tục làm thủ công - không tự động hóa",
  "Tiếp tục mất khách hàng vào tay Facebook",
  "Tiếp tục làm 16 tiếng/ngày — không có thời gian sống",
];

const CHOICE_2 = [
  "Học một kỹ năng đáng giá 10 năm tới",
  "Có hệ thống bán hàng tự động sở hữu 100%",
  "Tiết kiệm 38-50 triệu/năm chi phí platform",
  "Bán được mọi loại sản phẩm số (Ebook, Khóa học, Template, Phần mềm)",
  "Có thể tạo nhiều sản phẩm - nhiều dòng doanh thu",
  "Lấy lại quyền kiểm soát thời gian và cuộc sống",
];

type Testimonial = {
  initials: string;
  name: string;
  role: string;
  quote: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    initials: "NK",
    name: "Bs. Ngọc Khánh",
    role: "Bác sĩ Răng Hàm Mặt",
    quote: "Có khoá thứ 2 trong 14 ngày, doanh thu 50tr tháng đầu.",
  },
  {
    initials: "TH",
    name: "Anh Trung Hiếu",
    role: "Coach kinh doanh",
    quote: "Hệ thống tự chạy — tôi đi du lịch vẫn có đơn về.",
  },
  {
    initials: "AT",
    name: "Chị Anh Thư",
    role: "Designer Canva",
    quote: "100 đơn template tháng đầu — x10 so với Gumroad.",
  },
  {
    initials: "DN",
    name: "Anh Duy Nam",
    role: "Developer SaaS",
    quote: "Bán SaaS license $20/tháng — 50 khách subscribe đều đặn.",
  },
  {
    initials: "PQK",
    name: "Chị Phương Quỳnh",
    role: "Marketer Coaching",
    quote: "Coaching slot 10tr × 8 = 80tr/tuần — kín lịch.",
  },
];

type Milestone = {
  label: string;
  title: string;
  desc: string;
  dot: string;
  border: string;
  icon: React.ReactNode;
};

const MILESTONES: Milestone[] = [
  {
    label: "BÂY GIỜ",
    title: "Chưa có hệ thống",
    desc: "Phụ thuộc nền tảng",
    dot: "#E63946",
    border: "rgba(230,57,70,0.45)",
    icon: <AlertCircle size={16} strokeWidth={2.4} />,
  },
  {
    label: "7 NGÀY",
    title: "Sản phẩm + đơn đầu",
    desc: "Bắt đầu có doanh thu",
    dot: "#F4D9A8",
    border: "rgba(244,217,168,0.55)",
    icon: <Rocket size={16} strokeWidth={2.4} />,
  },
  {
    label: "30 NGÀY",
    title: "Hệ thống tự động",
    desc: "Hoàn chỉnh — tự chạy",
    dot: "#34D399",
    border: "rgba(52,211,153,0.55)",
    icon: <Cog size={16} strokeWidth={2.4} />,
  },
  {
    label: "1 NĂM",
    title: "500tr/tháng",
    desc: "Tự do tài chính",
    dot: "#E5B663",
    border: "rgba(229,182,99,0.6)",
    icon: <Trophy size={16} strokeWidth={2.4} />,
  },
];

function StarRow() {
  return (
    <div className="flex items-center gap-0.5" aria-label="5 trên 5 sao">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={12} fill="#E5B663" strokeWidth={0} />
      ))}
    </div>
  );
}

export default function FinalCTASection({ onScrollToRegister }: FinalCTASectionProps) {
  return (
    <section
      className="relative overflow-hidden pt-12 pb-12 sm:pt-20 sm:pb-20 md:pt-24 md:pb-24 px-4 sm:px-6"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(229,182,99,0.1) 0%, transparent 70%), #0A1020",
      }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-4">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase"
            style={{
              borderColor: "rgba(229,182,99,0.4)",
              background: "rgba(229,182,99,0.08)",
              color: "#E5B663",
            }}
          >
            <Crown size={12} /> Chốt Deal
          </span>
        </div>

        <h2
          className="mb-4 text-center text-[26px] sm:text-3xl md:text-[40px] font-extrabold tracking-[-0.01em] leading-[1.15]"
          style={{ color: "#F1F5FB" }}
        >
          Bạn Có <span style={{ color: "#E5B663" }}>2 Lựa Chọn</span> Lúc Này
        </h2>
        <p
          className="mb-8 sm:mb-10 text-center text-base sm:text-lg"
          style={{ color: "rgba(241,245,251,0.65)" }}
        >
          Hãy chọn câu chuyện bạn muốn sống 1 năm tới:
        </p>

        {/* Testimonial mini-strip */}
        <div className="mb-8 sm:mb-10">
          <div
            className="text-center text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-semibold mb-4"
            style={{ color: "rgba(229,182,99,0.85)" }}
          >
            Học viên đã chọn lựa chọn #2
          </div>
          <div
            className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 px-1 snap-x snap-mandatory"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(229,182,99,0.35) transparent",
            }}
          >
            {TESTIMONIALS.map((t) => (
              <div
                key={t.initials}
                className="flex-shrink-0 snap-start rounded-2xl p-4 sm:p-5"
                style={{
                  width: "min(280px, 78vw)",
                  background: "linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
                  border: "1px solid rgba(229,182,99,0.18)",
                  boxShadow: "0 10px 30px -20px rgba(0,0,0,0.6)",
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
                    style={{
                      background: "linear-gradient(135deg, #E5B663 0%, #C9A86B 100%)",
                      color: "#0A1020",
                    }}
                  >
                    {t.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="truncate text-[13px] font-semibold"
                        style={{ color: "#F1F5FB" }}
                      >
                        {t.name}
                      </span>
                      <BadgeCheck
                        size={14}
                        strokeWidth={2.5}
                        style={{ color: "#34D399", flexShrink: 0 }}
                        aria-label="Đã xác minh"
                      />
                    </div>
                    <div
                      className="truncate text-[11px]"
                      style={{ color: "rgba(241,245,251,0.6)" }}
                    >
                      {t.role}
                    </div>
                  </div>
                </div>
                <p
                  className="text-[13px] leading-[1.55] mb-3"
                  style={{ color: "rgba(241,245,251,0.85)" }}
                >
                  “{t.quote}”
                </p>
                <StarRow />
              </div>
            ))}
          </div>
        </div>

        {/* Transformation timeline */}
        <div
          className="mb-10 rounded-2xl p-5 sm:p-7"
          style={{
            background: "linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
            border: "1px solid rgba(229,182,99,0.2)",
          }}
        >
          <div
            className="text-center text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-semibold mb-5"
            style={{ color: "#E5B663" }}
          >
            Hành trình chuyển hoá
          </div>

          <div className="relative">
            {/* gradient connecting line — desktop only */}
            <div
              className="hidden md:block absolute left-[10%] right-[10%] top-[26px] h-[2px] rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, #E63946 0%, #F4D9A8 35%, #34D399 70%, #E5B663 100%)",
                opacity: 0.55,
              }}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-3 relative">
              {MILESTONES.map((m) => (
                <div key={m.label} className="flex flex-col items-center text-center">
                  <div
                    className="relative z-10 flex h-[52px] w-[52px] items-center justify-center rounded-full"
                    style={{
                      background: "#0A1020",
                      border: `2px solid ${m.border}`,
                      color: m.dot,
                      boxShadow: `0 0 24px ${m.border}`,
                    }}
                  >
                    {m.icon}
                  </div>
                  <div
                    className="mt-3 text-[10px] uppercase tracking-[0.18em] font-bold"
                    style={{ color: m.dot }}
                  >
                    {m.label}
                  </div>
                  <div
                    className="mt-1 text-sm sm:text-[15px] font-bold leading-tight"
                    style={{ color: "#F1F5FB" }}
                  >
                    {m.title}
                  </div>
                  <div
                    className="mt-0.5 text-[11px] sm:text-[12px] leading-snug"
                    style={{ color: "rgba(241,245,251,0.6)" }}
                  >
                    {m.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2 choices */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10 sm:mb-12">
          {/* Choice 1 - bad */}
          <div
            className="rounded-2xl p-6 sm:p-7"
            style={{
              background: "linear-gradient(180deg, rgba(239,68,68,0.06) 0%, rgba(239,68,68,0.02) 100%)",
              border: "1px solid rgba(239,68,68,0.25)",
            }}
          >
            <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] mb-3 font-semibold" style={{ color: "#F87171" }}>
              Lựa chọn #1
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-5 tracking-[-0.005em] leading-snug">
              Đóng trang này — tiếp tục như hiện tại
            </h3>

            <ul className="space-y-3 mb-6 flex flex-col gap-0">
              {CHOICE_1.map((c) => (
                <li key={c} className="flex items-start gap-3">
                  <span
                    className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: "rgba(239,68,68,0.12)",
                      border: "1px solid rgba(239,68,68,0.3)",
                    }}
                  >
                    <X size={12} strokeWidth={3} style={{ color: "#F87171" }} />
                  </span>
                  <span className="text-[13.5px] sm:text-[14px] leading-[1.7]" style={{ color: "rgba(241,245,251,0.72)" }}>
                    {c}
                  </span>
                </li>
              ))}
            </ul>

            <div
              className="rounded-xl p-4 text-center"
              style={{
                background: "rgba(239,68,68,0.05)",
                border: "1px solid rgba(239,68,68,0.15)",
              }}
            >
              <p className="text-[13px] leading-[1.65]" style={{ color: "rgba(241,245,251,0.6)" }}>
                Sau 1 năm: <strong style={{ color: "#F87171" }}>vẫn ở chỗ cũ</strong>.
                Sau 5 năm: <strong style={{ color: "#F87171" }}>vẫn loay hoay</strong>.
              </p>
            </div>
          </div>

          {/* Choice 2 - good */}
          <div
            className="relative rounded-2xl p-6 sm:p-7 overflow-hidden"
            style={{
              background: "linear-gradient(180deg, rgba(229,182,99,0.12) 0%, rgba(229,182,99,0.03) 100%)",
              border: "2px solid rgba(229,182,99,0.45)",
              boxShadow: "0 20px 50px -20px rgba(229,182,99,0.25)",
            }}
          >
            <span
              className="absolute -top-px right-6 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] rounded-b-md"
              style={{
                background: "linear-gradient(135deg, #E5B663 0%, #C9A86B 100%)",
                color: "#0A1020",
              }}
            >
              Khuyên Bạn
            </span>

            <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] mb-3 font-semibold" style={{ color: "#E5B663" }}>
              Lựa chọn #2
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-5 tracking-[-0.005em] leading-snug">
              Đầu tư 5.000.000đ vào bản thân hôm nay
            </h3>

            <ul className="space-y-3 mb-6 flex flex-col gap-0">
              {CHOICE_2.map((c) => (
                <li key={c} className="flex items-start gap-3">
                  <span
                    className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: "rgba(52,211,153,0.15)",
                      border: "1px solid rgba(52,211,153,0.3)",
                    }}
                  >
                    <Check size={12} strokeWidth={3} style={{ color: "#34D399" }} />
                  </span>
                  <span className="text-[13.5px] sm:text-[14px] leading-[1.7]" style={{ color: "rgba(241,245,251,0.85)" }}>
                    {c}
                  </span>
                </li>
              ))}
            </ul>

            <div
              className="rounded-xl p-4 text-center"
              style={{
                background: "rgba(229,182,99,0.08)",
                border: "1px solid rgba(229,182,99,0.25)",
              }}
            >
              <p className="text-[13px] leading-[1.65]" style={{ color: "rgba(241,245,251,0.85)" }}>
                Sau 7 ngày: <strong style={{ color: "#E5B663" }}>có đơn đầu tiên</strong>.
                Sau 30 ngày: <strong style={{ color: "#E5B663" }}>hệ thống hoàn chỉnh</strong>.
                Sau 1 năm: <strong style={{ color: "#34D399" }}>500tr/tháng có thể đạt</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center mb-10 sm:mb-12">
          <button
            onClick={onScrollToRegister}
            className="group inline-flex items-center gap-3 rounded-xl px-8 sm:px-12 py-4 sm:py-5 text-base sm:text-lg font-bold tracking-wide transition-all hover:scale-[1.03] cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #E5B663 0%, #F4D9A8 50%, #C9A86B 100%)",
              color: "#0A1020",
              boxShadow: "0 0 40px rgba(229,182,99,0.45), 0 10px 24px -10px rgba(229,182,99,0.55)",
            }}
          >
            <Crown size={20} />
            TÔI CHỌN ĐẦU TƯ VÀO BẢN THÂN — ĐĂNG KÝ NGAY
            <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
          </button>
          <p className="mt-4 text-[13px] sm:text-sm" style={{ color: "rgba(241,245,251,0.55)" }}>
            ⏰ Early Bird 5.000.000đ · Tặng 6 Bonus 16.479.000đ · Truy cập 6 tháng
          </p>

          {/* Secondary mini-CTA */}
          <div className="mt-5">
            <a
              href={siteConfig.socials.zalo}
              target="_blank"
              rel="noopener noreferrer"
              className="group/zalo inline-flex items-center gap-2 text-[13px] sm:text-sm font-medium border-b border-dashed transition-colors"
              style={{
                color: "rgba(241,245,251,0.75)",
                borderColor: "rgba(229,182,99,0.45)",
              }}
            >
              <MessageCircle size={15} strokeWidth={2.2} style={{ color: "#E5B663" }} />
              Vẫn lăn tăn? Inbox Zalo Thầy
              <ArrowRight
                size={14}
                className="transition-transform group-hover/zalo:translate-x-1"
                style={{ color: "#E5B663" }}
              />
            </a>
          </div>
        </div>

        {/* P.S. */}
        <div
          className="relative max-w-3xl mx-auto rounded-2xl p-6 sm:p-7 overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
            borderTop: "1px solid rgba(229,182,99,0.2)",
            borderRight: "1px solid rgba(229,182,99,0.2)",
            borderBottom: "1px solid rgba(229,182,99,0.2)",
            borderLeft: "4px solid #E5B663",
          }}
        >
          {/* P.S. watermark */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-4 -top-6 select-none"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontStyle: "italic",
              fontWeight: 700,
              fontSize: "140px",
              lineHeight: 1,
              color: "rgba(229,182,99,0.06)",
              letterSpacing: "-0.05em",
            }}
          >
            P.S.
          </div>

          <div className="relative">
            <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] mb-3 font-semibold" style={{ color: "#E5B663" }}>
              P.S. — Lời nhắn cuối từ Thầy Khương
            </div>
            <p className="text-[14px] sm:text-[14.5px] leading-[1.85] mb-3" style={{ color: "rgba(241,245,251,0.8)" }}>
              Tôi từng đốt gần 1 tỷ đồng và 1 năm trời cho việc thuê dev — và tôi đã thất bại. Tôi muốn bạn không phải trải qua nỗi đau đó.
            </p>
            <p className="text-[14px] sm:text-[14.5px] leading-[1.85] mb-3" style={{ color: "rgba(241,245,251,0.8)" }}>
              Chương trình này là <strong className="text-white">TẤT CẢ những gì tôi học được trong 10 năm</strong> — đóng gói lại để bạn đi nhanh hơn. Dù bạn muốn bán Ebook 99K hay Khóa học 50 triệu — hệ thống này đều dùng được.
            </p>
            <p className="text-[14px] sm:text-[14.5px] leading-[1.85]" style={{ color: "rgba(241,245,251,0.8)" }}>
              Nếu bạn là người sẵn sàng học, sẵn sàng thực hành — tôi cam kết bạn sẽ có kết quả. Bạn{" "}
              <strong className="text-white">không có gì để mất</strong>. Nhưng có{" "}
              <strong style={{ color: "#E5B663" }}>MỌI THỨ để có được.</strong>
            </p>

            <div className="mt-6 flex flex-col items-end">
              <div
                style={{
                  fontFamily: "'Brush Script MT', 'Segoe Script', 'Lucida Handwriting', Georgia, cursive",
                  fontStyle: "italic",
                  fontWeight: 400,
                  fontSize: "28px",
                  lineHeight: 1,
                  color: "#F4D9A8",
                  letterSpacing: "0.01em",
                  textShadow: "0 2px 12px rgba(229,182,99,0.35)",
                  transform: "rotate(-3deg)",
                }}
              >
                Lê Đăng Khương
              </div>
              <div
                className="mt-2 text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-semibold"
                style={{ color: "rgba(229,182,99,0.7)" }}
              >
                — Thầy Lê Đăng Khương
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
