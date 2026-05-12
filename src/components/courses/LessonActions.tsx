"use client";

import { useState, useCallback } from "react";
import { CheckCircle, Circle, Loader2 } from "lucide-react";

interface LessonActionsProps {
  lessonId: string;
  productId: string;
  initialCompleted: boolean;
}

export default function LessonActions({
  lessonId,
  productId,
  initialCompleted,
}: LessonActionsProps) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [toggling, setToggling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      setMessage(
        newState ? "Đã đánh dấu hoàn thành!" : "Đã bỏ đánh dấu hoàn thành"
      );
      setTimeout(() => setMessage(null), 2500);
    } catch {
      setMessage("Có lỗi xảy ra, thử lại sau");
    } finally {
      setToggling(false);
    }
  }, [completed, lessonId, productId]);

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggleComplete}
        disabled={toggling}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          completed
            ? "bg-[#D4A843]/15 text-[#D4A843] border border-[#D4A843]/30 hover:bg-[#D4A843]/25"
            : "bg-[#1a1a1a] text-gray-300 border border-[#2a2a2a] hover:border-[#D4A843]/50 hover:text-white"
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

      {message && (
        <span className="text-xs text-[#D4A843] animate-pulse">
          {message}
        </span>
      )}
    </div>
  );
}
