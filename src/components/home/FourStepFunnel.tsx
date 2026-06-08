"use client";

import {
  Video,
  Eye,
  BookOpen,
  Bot,
  ChevronDown,
  Sparkles,
} from "lucide-react";

type FunnelStep = {
  num: number;
  Icon: React.ComponentType<{
    size?: number;
    className?: string;
    style?: React.CSSProperties;
  }>;
  title: string;
  outcome: string;
  color: string;
  /** Tailwind utility for desktop width — funnel narrows step-by-step */
  desktopWidth: string;
};

const STEPS: FunnelStep[] = [
  {
    num: 1,
    Icon: Video,
    title: "Thu hút hàng triệu khách hàng tiềm năng",
    outcome:
      "Bằng video AI chất lượng cao — không cần quay dựng, không cần lên hình",
    color: "#D4A843",
    desktopWidth: "lg:max-w-[100%]",
  },
  {
    num: 2,
    Icon: Eye,
    title: "Xây kênh hút khách",
    outcome:
      "Làm affiliate hoặc bán sản phẩm số của chính bạn — khách tự tìm đến",
    color: "#22c55e",
    desktopWidth: "lg:max-w-[85%]",
  },
  {
    num: 3,
    Icon: BookOpen,
    title: "Đóng gói sản phẩm số",
    outcome: "Khoá học / Ebook / Membership — đóng gói chuyên môn, bán mãi mãi",
    color: "#D4A843",
    desktopWidth: "lg:max-w-[70%]",
  },
  {
    num: 4,
    Icon: Bot,
    title: "Website AI Agent",
    outcome: "Hệ thống tự tư vấn, chốt đơn, thu tiền, chăm khách 24/7",
    color: "#22c55e",
    desktopWidth: "lg:max-w-[55%]",
  },
];

export default function FourStepFunnel() {
  return (
    <div className="my-10 sm:my-14">
      {/* Heading mini */}
      <div className="text-center mb-6 sm:mb-8">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium"
          style={{
            background: "rgba(212,168,67,0.1)",
            border: "1px solid rgba(212,168,67,0.25)",
            color: "#D4A843",
          }}
        >
          <Sparkles size={14} />
          <span>Phễu chuyển đổi 4 bước</span>
        </div>
      </div>

      {/* Funnel steps */}
      <div className="space-y-3 sm:space-y-4">
        {STEPS.map((s, idx) => (
          <div key={s.num} className="flex flex-col items-center">
            {/* The card — narrows progressively on desktop */}
            <div
              className={`w-full ${s.desktopWidth} mx-auto rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-transform hover:scale-[1.01]`}
              style={{
                background: `linear-gradient(135deg, ${s.color}1F 0%, ${s.color}08 100%)`,
                border: `1.5px solid ${s.color}40`,
                boxShadow: `0 10px 30px -15px ${s.color}55, inset 0 1px 0 rgba(255,255,255,0.04)`,
              }}
            >
              {/* Watermark number */}
              <div
                className="absolute -top-3 -right-2 text-[90px] sm:text-[120px] font-extrabold leading-none opacity-[0.07] select-none pointer-events-none"
                style={{ color: s.color }}
              >
                {s.num}
              </div>

              <div className="relative flex items-center gap-4 sm:gap-5">
                {/* Step badge */}
                <div
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 font-extrabold text-lg sm:text-xl"
                  style={{
                    background: s.color,
                    color: "#0a0a0a",
                    boxShadow: `0 6px 20px -6px ${s.color}80`,
                  }}
                >
                  {s.num}
                </div>

                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 hidden sm:flex"
                  style={{ background: `${s.color}25` }}
                >
                  <s.Icon size={18} style={{ color: s.color }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-base sm:text-lg text-white leading-tight mb-1">
                    {s.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-300 leading-snug">
                    {s.outcome}
                  </p>
                </div>
              </div>
            </div>

            {/* Connector arrow (not after last step) */}
            {idx < STEPS.length - 1 && (
              <ChevronDown
                size={22}
                className="my-0.5 sm:my-1"
                style={{ color: STEPS[idx + 1].color }}
                aria-hidden="true"
              />
            )}
          </div>
        ))}
      </div>

      {/* End-state badge */}
      <div className="flex flex-col items-center mt-4 sm:mt-6">
        <ChevronDown size={20} className="text-[#D4A843] mb-1" />
        <div
          className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-extrabold"
          style={{
            background:
              "linear-gradient(135deg, #D4A843 0%, #b8902f 100%)",
            color: "#0a0a0a",
            boxShadow: "0 10px 30px -10px rgba(212,168,67,0.6)",
          }}
        >
          💰 Tiền về 24/7 — ngay cả khi đang ngủ
        </div>
      </div>
    </div>
  );
}
