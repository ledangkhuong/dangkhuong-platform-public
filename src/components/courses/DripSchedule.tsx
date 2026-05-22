"use client";

import { CheckCircle, Lock } from "lucide-react";
import { checkLessonDrip, formatDripDate } from "@/lib/drip-utils";

interface ScheduleLesson {
  title: string;
  unlock_after_days: number;
}

interface DripScheduleProps {
  /** Lessons with their drip delay configuration */
  lessons: ScheduleLesson[];
  /** ISO date string of when the student enrolled (the drip anchor) */
  enrollmentDate: string;
}

/**
 * Admin / student-facing timeline showing when each lesson unlocks
 * relative to the enrollment date. Green checkmarks for unlocked lessons,
 * lock icons for still-locked ones.
 */
export default function DripSchedule({
  lessons,
  enrollmentDate,
}: DripScheduleProps) {
  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#111] p-5">
      <h3 className="text-sm font-semibold text-[#f5f5f5] mb-4">
        Lịch mở khoá bài học
      </h3>

      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-[#2a2a2a]" />

        <ul className="space-y-0">
          {lessons.map((lesson, idx) => {
            const drip = checkLessonDrip(enrollmentDate, lesson.unlock_after_days);
            const isFirst = idx === 0;
            const isLast = idx === lessons.length - 1;

            return (
              <li key={idx} className="relative flex items-start gap-3 group">
                {/* Timeline node */}
                <div
                  className={`relative z-10 flex-shrink-0 w-[30px] h-[30px] rounded-full flex items-center justify-center ${
                    isFirst ? "mt-0" : "mt-0"
                  } ${isLast ? "mb-0" : "mb-0"}`}
                >
                  {drip.isLocked ? (
                    <div className="w-[30px] h-[30px] rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center">
                      <Lock size={12} className="text-gray-500" />
                    </div>
                  ) : (
                    <div className="w-[30px] h-[30px] rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 flex items-center justify-center">
                      <CheckCircle size={14} className="text-[#22c55e]" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className={`flex-1 pb-5 ${isLast ? "pb-0" : ""}`}>
                  <p
                    className={`text-sm font-medium leading-[30px] ${
                      drip.isLocked ? "text-gray-500" : "text-[#f5f5f5]"
                    }`}
                  >
                    {lesson.title}
                  </p>

                  <div className="flex items-center gap-2 mt-0.5">
                    {lesson.unlock_after_days === 0 ? (
                      <span className="text-xs text-[#22c55e]">
                        Mở khoá ngay
                      </span>
                    ) : drip.isLocked ? (
                      <>
                        <span className="text-xs text-gray-500">
                          Ngày {lesson.unlock_after_days} &mdash;{" "}
                          {formatDripDate(drip.unlockDate)}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D4A843]/10 text-[#D4A843] font-medium">
                          {drip.daysRemaining} ngày nữa
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">
                        Ngày {lesson.unlock_after_days} &mdash;{" "}
                        {formatDripDate(drip.unlockDate)}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
