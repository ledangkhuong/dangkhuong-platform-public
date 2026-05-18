"use client";

import { Lock } from "lucide-react";
import { formatDripDate } from "@/lib/drip-utils";

interface DripLockProps {
  /** ISO date string for when the lesson unlocks */
  unlockDate: string;
  /** Whole days remaining until unlock */
  daysRemaining: number;
  /** Title of the locked lesson */
  lessonTitle: string;
}

/**
 * Locked overlay displayed on top of lesson content when the drip schedule
 * has not yet released the lesson. Shows a lock icon, countdown message,
 * and exact unlock date.
 */
export default function DripLock({
  unlockDate,
  daysRemaining,
  lessonTitle,
}: DripLockProps) {
  const formattedDate = formatDripDate(new Date(unlockDate));

  return (
    <div className="relative rounded-xl overflow-hidden border border-[#2a2a2a] bg-[#0a0a0a]">
      {/* Blurred placeholder to hint there is content behind the lock */}
      <div className="aspect-video bg-[#111] flex items-center justify-center">
        <div className="absolute inset-0 backdrop-blur-sm bg-[#0a0a0a]/80" />

        {/* Lock content */}
        <div className="relative z-10 flex flex-col items-center gap-4 px-6 py-10 text-center max-w-md">
          {/* Animated lock icon */}
          <div className="w-16 h-16 rounded-full bg-[#D4A843]/10 border border-[#D4A843]/20 flex items-center justify-center animate-pulse">
            <Lock size={28} className="text-[#D4A843]" />
          </div>

          {/* Lesson title */}
          <p className="text-sm text-gray-500 line-clamp-1">{lessonTitle}</p>

          {/* Countdown message */}
          <h3 className="text-lg font-semibold text-[#f5f5f5]">
            {daysRemaining === 1
              ? "Bài học sẽ mở khoá sau 1 ngày"
              : `Bài học sẽ mở khoá sau ${daysRemaining} ngày`}
          </h3>

          {/* Exact date */}
          <p className="text-sm text-gray-400">
            Mở khoá vào ngày{" "}
            <span className="text-[#D4A843] font-medium">{formattedDate}</span>
          </p>

          {/* Subtle tip */}
          <p className="text-xs text-gray-600 mt-2">
            Nội dung sẽ tự động mở khoá theo lịch trình của khoá học.
          </p>
        </div>
      </div>
    </div>
  );
}
