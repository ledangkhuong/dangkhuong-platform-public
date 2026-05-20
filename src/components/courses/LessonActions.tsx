"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Circle, Loader2, ChevronRight } from "lucide-react";

interface LessonActionsProps {
  lessonId: string;
  productId: string;
  initialCompleted: boolean;
  /** URL to navigate to when completing (e.g. /courses/slug?lesson=nextId) */
  nextLessonUrl?: string;
  nextLessonTitle?: string;
}

export default function LessonActions({
  lessonId,
  productId,
  initialCompleted,
  nextLessonUrl,
  nextLessonTitle,
}: LessonActionsProps) {
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [toggling, setToggling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showNextPrompt, setShowNextPrompt] = useState(false);

  // Reset state when lesson changes
  useEffect(() => {
    setCompleted(initialCompleted);
    setShowNextPrompt(false);
    setMessage(null);
  }, [lessonId, initialCompleted]);

  const goToNextLesson = useCallback(() => {
    if (nextLessonUrl) {
      router.push(nextLessonUrl);
      router.refresh();
    }
  }, [nextLessonUrl, router]);

  const toggleComplete = useCallback(async () => {
    setToggling(true);
    setMessage(null);
    const newState = !completed;

    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: lessonId,
          product_id: productId,
          completed: newState,
        }),
      });

      if (!res.ok) throw new Error("Failed");

      setCompleted(newState);

      // If just completed and there's a next lesson, auto-navigate after brief delay
      if (newState && nextLessonUrl) {
        setMessage("Hoàn thành! Đang chuyển bài...");
        setShowNextPrompt(true);
        setTimeout(() => {
          goToNextLesson();
        }, 1200);
      } else {
        setMessage(
          newState ? "Đã đánh dấu hoàn thành!" : "Đã bỏ đánh dấu hoàn thành"
        );
        setTimeout(() => setMessage(null), 2500);
      }
    } catch {
      setMessage("Có lỗi xảy ra, thử lại sau");
    } finally {
      setToggling(false);
    }
  }, [completed, lessonId, productId, nextLessonUrl, goToNextLesson]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleComplete}
          disabled={toggling}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            completed
              ? "bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30 hover:bg-[#22c55e]/25"
              : "bg-[#1a1a1a] text-gray-300 border border-[#2a2a2a] hover:border-[#22c55e]/50 hover:text-white"
          }`}
        >
          {toggling ? (
            <Loader2 size={16} className="animate-spin" />
          ) : completed ? (
            <CheckCircle size={16} />
          ) : (
            <Circle size={16} />
          )}
          {completed ? "Đã hoàn thành" : "Đánh dấu hoàn thành"}
        </button>

        {/* Manual next lesson button (always visible when completed & next exists) */}
        {completed && nextLessonUrl && !showNextPrompt && (
          <button
            onClick={goToNextLesson}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#D4A843] text-black hover:bg-[#B8922E] transition-all"
          >
            Bài tiếp theo
            <ChevronRight size={16} />
          </button>
        )}

        {message && (
          <span
            className={`text-xs animate-pulse ${
              showNextPrompt ? "text-[#D4A843]" : "text-[#22c55e]"
            }`}
          >
            {message}
          </span>
        )}
      </div>

      {/* Next lesson preview when auto-navigating */}
      {showNextPrompt && nextLessonTitle && (
        <div className="flex items-center gap-2 text-xs text-gray-400 pl-1">
          <ChevronRight size={12} className="text-[#D4A843]" />
          <span>
            Bài tiếp theo:{" "}
            <span className="text-gray-300">{nextLessonTitle}</span>
          </span>
        </div>
      )}
    </div>
  );
}
