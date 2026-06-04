"use client";

import { Check } from "lucide-react";

interface JourneyStageIndicatorProps {
  currentStage: string;
  compact?: boolean;
}

const STAGES = [
  { key: "visitor", label: "Khách ghé", color: "#6b7280" },
  { key: "lead", label: "Lead", color: "#3b82f6" },
  { key: "contacted", label: "Đã liên hệ", color: "#f59e0b" },
  { key: "qualified", label: "Tiềm năng", color: "#a855f7" },
  { key: "negotiation", label: "Đàm phán", color: "#f97316" },
  { key: "customer", label: "Khách hàng", color: "#D4A843" },
  { key: "advocate", label: "Đại sứ", color: "#22c55e" },
] as const;

export default function JourneyStageIndicator({
  currentStage,
  compact = false,
}: JourneyStageIndicatorProps) {
  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);

  return (
    <div className="flex items-center w-full">
      {STAGES.map((stage, index) => {
        const isPast = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture = index > currentIndex;

        const circleSize = compact ? "w-6 h-6" : "w-8 h-8";
        const iconSize = compact ? 10 : 14;

        return (
          <div key={stage.key} className="flex items-center flex-1 last:flex-none">
            {/* Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`relative flex items-center justify-center rounded-full ${circleSize}`}
                style={{
                  backgroundColor: isPast || isCurrent ? stage.color : "transparent",
                  border: isFuture ? "2px solid #2a2a2a" : "none",
                }}
                title={compact ? stage.label : undefined}
              >
                {isPast && (
                  <Check size={iconSize} className="text-white" strokeWidth={3} />
                )}
                {isCurrent && (
                  <>
                    <div
                      className="absolute inset-0 rounded-full animate-ping opacity-30"
                      style={{ backgroundColor: "#D4A843" }}
                    />
                    <div
                      className="absolute -inset-1 rounded-full animate-pulse opacity-20 border-2"
                      style={{ borderColor: "#D4A843" }}
                    />
                  </>
                )}
              </div>
              {/* Label */}
              {!compact && (
                <span
                  className="mt-1.5 text-[10px] font-medium whitespace-nowrap"
                  style={{
                    color: isPast || isCurrent ? stage.color : "#6b7280",
                  }}
                >
                  {stage.label}
                </span>
              )}
            </div>

            {/* Connecting line */}
            {index < STAGES.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-1"
                style={{
                  backgroundColor: index < currentIndex ? STAGES[index + 1].color : "#2a2a2a",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
