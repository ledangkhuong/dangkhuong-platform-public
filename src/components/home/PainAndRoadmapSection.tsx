"use client";

import {
  Clock,
  TrendingDown,
  Eye,
  User,
  Bot,
  Video,
  BookOpen,
  Download,
  ArrowRight,
} from "lucide-react";

interface PainAndRoadmapSectionProps {
  onOpenModal?: () => void;
}

type PainPoint = {
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  emoji: string;
  title: string;
  desc: string;
};

const painPoints: PainPoint[] = [
  {
    Icon: Clock,
    emoji: "😫",
    title: "Tự tay làm hết, kiệt sức.",
    desc: "Quay video, chat tin nhắn, chốt đơn, dựng web… một mình ôm hết. Làm 12 tiếng mỗi ngày mà vẫn không xuể.",
  },
  {
    Icon: TrendingDown,
    emoji: "⏸️",
    title: "Ngừng tay là ngừng tiền.",
    desc: "Bạn đang đổi giờ lấy tiền. Nghỉ một ngày là doanh thu đứng yên một ngày.",
  },
  {
    Icon: Eye,
    emoji: "📉",
    title: "Kênh mãi không lên, khách không tự đến.",
    desc: "Đăng video đều mà view lẹt đẹt. Vẫn phải đi mời chào từng người một.",
  },
  {
    Icon: User,
    emoji: "🤷",
    title: "Giỏi nghề mà ít ai biết.",
    desc: "Bạn giỏi thật sự, nhưng khách lại tìm đến người khác — chỉ vì họ có thương hiệu, còn bạn thì chưa.",
  },
  {
    Icon: Bot,
    emoji: "😰",
    title: "Sợ bị AI bỏ lại.",
    desc: "Người ta đã dùng AI chạy ào ào, mình vẫn loay hoay chưa biết bắt đầu từ đâu — mà tuổi thì không chờ ai.",
  },
];

type RoadmapStep = {
  num: number;
  title: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  stop: string;
  gain: string;
};

const roadmapSteps: RoadmapStep[] = [
  {
    num: 1,
    title: "Làm chủ Video AI",
    Icon: Video,
    color: "#D4A843",
    stop: "Thôi mất cả ngày quay dựng",
    gain: "Vài phút có video hút khách, chất lượng cinema, không cần lên hình",
  },
  {
    num: 2,
    title: "Xây kênh hút khách",
    Icon: Eye,
    color: "#22c55e",
    stop: "Thôi đi chào mời từng người",
    gain: "Hiểu thuật toán, để khách đúng gu tự tìm đến bạn mỗi ngày",
  },
  {
    num: 3,
    title: "Tạo sản phẩm số",
    Icon: BookOpen,
    color: "#D4A843",
    stop: "Thôi đổi giờ lấy tiền",
    gain: "Đóng gói chuyên môn thành khoá học / ebook / membership bán được mãi",
  },
  {
    num: 4,
    title: "Website AI Agent",
    Icon: Bot,
    color: "#22c55e",
    stop: "Thôi thức đêm chốt đơn",
    gain: "Hệ thống tự tư vấn, chốt đơn, thu tiền, chăm khách 24/7",
  },
];

export default function PainAndRoadmapSection({
  onOpenModal,
}: PainAndRoadmapSectionProps) {
  return (
    <>
      {/* ═══ PAIN POINTS ═══ */}
      <section className="py-12 sm:py-24 px-4 sm:px-6 bg-[#0a0a0a]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-center mb-8 sm:mb-14 text-white">
            Có phải bạn đang mắc kẹt ở{" "}
            <span className="text-[#D4A843]">những điều này?</span>
          </h2>

          {/*
            Balanced 5-card layout:
            - Mobile: 1 column
            - Tablet (sm): 2 columns, last card spans both columns
            - Desktop (lg): 6-column grid → first row 3 cards × col-span-2,
              second row 2 cards × col-span-3 (centered visually)
          */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-5">
            {painPoints.map((p, i) => {
              const isBottomRow = i >= 3; // last 2 cards
              const lgSpan = isBottomRow ? "lg:col-span-3" : "lg:col-span-2";
              const smSpan = i === painPoints.length - 1 ? "sm:col-span-2" : "";
              return (
                <div
                  key={i}
                  className={`bg-[#111] border border-white/5 rounded-2xl p-6 hover:border-red-500/30 hover:bg-[#141414] transition-all ${lgSpan} ${smSpan}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                      <p.Icon size={20} className="text-red-400" />
                    </div>
                    <div className="text-3xl leading-none">{p.emoji}</div>
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-white">
                    {p.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Bridge box */}
          <div className="mt-10 sm:mt-14 max-w-2xl mx-auto">
            <div
              className="rounded-xl py-6 px-6 text-center"
              style={{
                backgroundColor: "rgba(251, 243, 222, 0.05)",
                border: "1px solid rgba(212, 168, 67, 0.2)",
              }}
            >
              <p className="text-base sm:text-lg text-gray-200 leading-relaxed">
                Tin tốt là: bạn không cần làm nhiều hơn. Bạn chỉ cần{" "}
                <span className="text-[#D4A843] font-semibold">một hệ thống đúng</span>{" "}
                — và 4 bước dưới đây sẽ dựng nó cho bạn.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ROADMAP ═══ */}
      <section
        id="roadmap"
        className="py-12 sm:py-24 px-4 sm:px-6 bg-[#0d0d0d]"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold mb-4 text-white">
              Lộ trình <span className="text-[#D4A843]">4 bước</span> để hệ
              thống làm thay bạn
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Triết lý của tôi: tư duy trước, công cụ sau. Bạn đi từng bước,
              mỗi bước gỡ một nỗi đau — đến cuối là một cỗ máy tự chạy.
            </p>
          </div>

          {/* Transformation rows */}
          <div className="space-y-4 sm:space-y-5">
            {roadmapSteps.map((s) => (
              <div
                key={s.num}
                className="bg-[#111] border border-white/5 rounded-2xl p-5 sm:p-6 hover:border-[#D4A843]/30 transition-colors"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5 md:items-center">
                  {/* Step + title */}
                  <div className="md:col-span-4 flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${s.color}20` }}
                    >
                      <s.Icon size={22} className="" />
                    </div>
                    <div>
                      <div
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{ color: s.color }}
                      >
                        Bước {s.num}
                      </div>
                      <h3 className="text-lg sm:text-xl font-extrabold text-white leading-tight">
                        {s.title}
                      </h3>
                    </div>
                  </div>

                  {/* Bạn thôi phải... */}
                  <div className="md:col-span-4">
                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-red-400 mb-1">
                        Bạn thôi phải...
                      </div>
                      <p className="text-sm text-gray-200 leading-snug">
                        {s.stop}
                      </p>
                    </div>
                  </div>

                  {/* Bạn có được */}
                  <div className="md:col-span-4">
                    <div className="rounded-xl border border-[#22c55e]/25 bg-[#22c55e]/5 px-4 py-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#22c55e] mb-1 flex items-center gap-1.5">
                        Bạn có được
                        <ArrowRight size={12} />
                      </div>
                      <p className="text-sm text-gray-100 leading-snug font-medium">
                        {s.gain}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tag-line */}
          <p className="text-center mt-10 italic text-[#D4A843] text-sm sm:text-base max-w-3xl mx-auto leading-relaxed">
            → Để bạn kiếm tiền cả khi đang ngủ — và có lại thời gian cho con,
            cho sức khoẻ, cho cuộc đời mình.
          </p>

          {/* CTA */}
          <div className="text-center mt-8 sm:mt-10">
            <button
              onClick={onOpenModal}
              className="inline-flex items-center gap-2 bg-[#D4A843] hover:bg-[#c39a3a] text-[#0a0a0a] font-bold text-base py-3.5 px-6 sm:px-8 rounded-xl transition-colors shadow-lg shadow-[#D4A843]/20"
            >
              <Download size={18} />
              Nhận miễn phí &quot;Bí Mật Video AI Triệu View&quot;
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
