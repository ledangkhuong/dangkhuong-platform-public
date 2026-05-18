"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  Users,
  Trophy,
  Rocket,
  ChevronRight,
  X,
} from "lucide-react";

const STORAGE_KEY = "onboarding_completed";

const steps = [
  {
    key: "welcome",
    title: "Chào mừng",
    icon: Rocket,
    heading: "Chào mừng bạn đến với\nLê Đăng Khương Academy! 🎉",
    description:
      "Bạn đã sẵn sàng khám phá hành trình học tập và phát triển bản thân cùng cộng đồng học viên xuất sắc nhất.",
  },
  {
    key: "explore",
    title: "Khám phá",
    icon: BookOpen,
    heading: "Khám phá tính năng",
    description: "Mọi thứ bạn cần để phát triển — tất cả ở một nơi.",
    features: [
      {
        icon: BookOpen,
        label: "Khoá học",
        desc: "Video chất lượng cao, bài tập thực hành",
      },
      {
        icon: Users,
        label: "Cộng đồng",
        desc: "Kết nối, hỏi đáp, chia sẻ kinh nghiệm",
      },
      {
        icon: Trophy,
        label: "Bảng xếp hạng",
        desc: "Theo dõi tiến độ, cạnh tranh lành mạnh",
      },
      {
        icon: Rocket,
        label: "Tài nguyên",
        desc: "Templates, tài liệu, công cụ hỗ trợ",
      },
    ],
  },
  {
    key: "profile",
    title: "Hồ sơ",
    icon: Users,
    heading: "Hoàn thiện hồ sơ của bạn",
    description:
      "Thêm ảnh đại diện và giới thiệu bản thân để kết nối tốt hơn với cộng đồng.",
  },
  {
    key: "start",
    title: "Bắt đầu",
    icon: BookOpen,
    heading: "Bắt đầu học ngay!",
    description:
      "Khám phá các khoá học được thiết kế để bạn áp dụng ngay — không lý thuyết suông.",
  },
];

export default function OnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const completed = localStorage.getItem(STORAGE_KEY);
    if (completed) return;

    const timer = setTimeout(() => setVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  const goNext = useCallback(() => {
    if (animating) return;
    if (currentStep >= steps.length - 1) {
      dismiss();
      return;
    }
    setDirection("next");
    setAnimating(true);
    setTimeout(() => {
      setCurrentStep((s) => s + 1);
      setAnimating(false);
    }, 300);
  }, [currentStep, animating, dismiss]);

  if (!visible) return null;

  const step = steps[currentStep];
  const StepIcon = step.icon;
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={dismiss}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-2xl"
        style={{ animation: "onboarding-enter 0.3s ease-out" }}
      >
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-10"
          aria-label="Đóng"
        >
          <X size={20} />
        </button>

        {/* Content area */}
        <div className="p-8 pt-10">
          <div
            key={currentStep}
            className={`transition-all duration-300 ${
              animating
                ? direction === "next"
                  ? "translate-x-8 opacity-0"
                  : "-translate-x-8 opacity-0"
                : "translate-x-0 opacity-100"
            }`}
          >
            {/* Icon */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: "rgba(212, 168, 67, 0.12)" }}
            >
              <StepIcon size={28} className="text-[#D4A843]" />
            </div>

            {/* Heading */}
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 whitespace-pre-line leading-tight">
              {step.heading}
            </h2>

            {/* Description */}
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              {step.description}
            </p>

            {/* Step-specific content */}
            {step.key === "explore" && step.features && (
              <div className="grid grid-cols-2 gap-3 mb-2">
                {step.features.map((f) => (
                  <div
                    key={f.label}
                    className="p-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a]"
                  >
                    <f.icon
                      size={18}
                      className="text-[#D4A843] mb-2"
                    />
                    <div className="text-sm font-medium text-white mb-0.5">
                      {f.label}
                    </div>
                    <div className="text-xs text-gray-500">{f.desc}</div>
                  </div>
                ))}
              </div>
            )}

            {step.key === "profile" && (
              <Link
                href="/settings"
                onClick={dismiss}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#D4A843] hover:text-[#e5bc5a] transition-colors"
              >
                Đi đến cài đặt hồ sơ
                <ChevronRight size={16} />
              </Link>
            )}

            {step.key === "start" && (
              <Link
                href="/courses"
                onClick={dismiss}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: "linear-gradient(135deg, #D4A843, #b8922e)",
                  color: "#000",
                }}
              >
                <BookOpen size={16} />
                Khám phá khoá học
              </Link>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 flex items-center justify-between">
          {/* Step dots */}
          <div className="flex items-center gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === currentStep ? 24 : 8,
                  background:
                    i === currentStep
                      ? "#D4A843"
                      : i < currentStep
                        ? "rgba(212, 168, 67, 0.4)"
                        : "#333",
                }}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {!isLast && (
              <button
                onClick={dismiss}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Bỏ qua
              </button>
            )}
            <button
              onClick={goNext}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold transition-all hover:brightness-110"
              style={{
                background: "linear-gradient(135deg, #D4A843, #b8922e)",
                color: "#000",
              }}
            >
              {isLast ? "Bắt đầu học" : "Tiếp tục"}
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes onboarding-enter {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
