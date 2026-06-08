"use client";

import { useState } from "react";
import { Star, ChevronDown } from "lucide-react";

interface TestimonialsFaqSectionProps {
  onOpenModal?: () => void;
}

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  result: string;
  avatar: string;
}

interface FaqItem {
  q: string;
  a: string;
}

const stats: { value: string; label: string }[] = [
  { value: "1.300+", label: "Học viên" },
  { value: "300M+", label: "Lượt view" },
  { value: "500+", label: "Đánh giá 5★" },
  { value: "4.9/5", label: "Mức độ hài lòng" },
];

const testimonials: Testimonial[] = [
  {
    quote:
      "Sau khoá Video AI VEO3.1, em ra 1 video mỗi ngày dễ dàng. Kênh đạt 200K sub sau 4 tháng.",
    name: "Thùy Dung",
    role: "Coach sức khoẻ",
    result: "📈 250K sub",
    avatar: "TD",
  },
  {
    quote:
      "Em ngại lên video. Nhờ VEO3.1 và phương pháp xây kênh của Thầy, giờ em có 1,5 triệu view mỗi tháng và phòng khám kín lịch.",
    name: "BS. Trần Thị Ninh",
    role: "Bác sĩ Da liễu",
    result: "📈 1,5M view/tháng",
    avatar: "TN",
  },
  {
    quote:
      "Em đã chốt 80 triệu doanh thu ngay trong tháng đầu áp dụng. Cảm ơn Thầy Khương rất nhiều.",
    name: "Phạm Văn Tùng",
    role: "Chuyên gia tài chính",
    result: "💰 80M/tháng",
    avatar: "VT",
  },
  {
    quote:
      "Học xong 30Day10M, em vượt mục tiêu, đạt 25 triệu trong 30 ngày. Cuộc đời em thay đổi hẳn.",
    name: "Lê Kim Yến",
    role: "Giáo viên Tiếng Anh",
    result: "💰 25M/30 ngày",
    avatar: "KY",
  },
  {
    quote:
      "Em không rành công nghệ. Vậy mà giờ em tự làm video AI, có kênh TikTok 100K follow.",
    name: "Hoàng Văn Nam",
    role: "55 tuổi, Hà Nội",
    result: "📱 100K follow TikTok",
    avatar: "VN",
  },
  {
    quote:
      "AI Agent giúp em bán hàng 24/7. Em đi du lịch mà đơn vẫn về đều đặn.",
    name: "Vũ Thị Tình",
    role: "Chủ shop online",
    result: "🤖 Bán tự động",
    avatar: "VT2",
  },
];

const faqs: FaqItem[] = [
  {
    q: "Tôi không rành công nghệ, học được không?",
    a: "Hoàn toàn được. Phần lớn học viên không rành tech — có cả cô chú 55 tuổi, thậm chí con trai tôi 13 tuổi vẫn làm chủ video AI. Lộ trình đi từ con số 0, phần khó nhất đã có AI lo.",
  },
  {
    q: "Cần đầu tư bao nhiêu để bắt đầu?",
    a: "Bạn bắt đầu miễn phí với cẩm nang và các công cụ AI miễn phí. Khi đã thấy kết quả, mới cần nâng cấp lên khoá sâu hơn.",
  },
  {
    q: "Video AI VEO3.1 khác gì công cụ khác?",
    a: "VEO3.1 cho phép tạo video chất lượng điện ảnh chỉ bằng câu lệnh (prompt) — không cần máy quay, diễn viên hay ekip dựng.",
  },
  {
    q: "Mỗi ngày cần bao nhiêu thời gian?",
    a: "Chỉ 1–2 tiếng. Mục tiêu của cả lộ trình là để hệ thống làm thay bạn, chứ không phải khiến bạn bận hơn.",
  },
  {
    q: "Tôi có được hỗ trợ trực tiếp từ Thầy Khương không?",
    a: "Có. Qua cộng đồng học viên và các buổi Q&A định kỳ; các gói cao có mentor đồng hành sát sao.",
  },
];

export default function TestimonialsFaqSection({
  onOpenModal,
}: TestimonialsFaqSectionProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      {/* ===== TESTIMONIALS ===== */}
      <section
        id="testimonials"
        className="py-12 sm:py-24 px-4 sm:px-6 bg-[#0d0d0d]"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-white">
              Hơn 1.300 học viên đã{" "}
              <span className="text-[#D4A843]">thay đổi cuộc đời</span>
            </h2>

            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto mt-10">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-[#111] border border-white/5 rounded-2xl p-4 sm:p-6"
                >
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#D4A843] mb-1">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="bg-[#111] border border-white/5 rounded-2xl p-5 flex flex-col"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className="w-4 h-4"
                      color="#F59E0B"
                      fill="#F59E0B"
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-gray-200 italic leading-relaxed mb-6 flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Footer row */}
                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{
                      background:
                        "linear-gradient(135deg, #D4A843 0%, #22c55e 100%)",
                    }}
                  >
                    {t.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm truncate">
                      {t.name}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {t.role}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20 px-2.5 py-1 rounded-full whitespace-nowrap">
                    {t.result}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="py-12 sm:py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
              Câu hỏi <span className="text-[#D4A843]">thường gặp</span>
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((f, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="bg-[#111] border border-white/5 rounded-xl overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="font-semibold text-white text-base sm:text-lg">
                      {f.q}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-[#D4A843] shrink-0 transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="border-t border-white/5 px-5 pb-5 pt-4">
                      <p className="text-gray-300 leading-relaxed">{f.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
