"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageCircleQuestion,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Question {
  id: string;
  content: string;
  reply: string | null;
  status: string;
  created_at: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
  replier: { full_name: string | null } | null;
  replied_at: string | null;
}

interface LessonQAProps {
  productId: string;
  lessonId: string;
  lessonTitle: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  return `${days} ngày trước`;
}

export default function LessonQA({
  productId,
  lessonId,
  lessonTitle,
}: LessonQAProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchQuestions = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/questions?product_id=${productId}&lesson_id=${lessonId}`
      );
      if (res.ok) {
        const json = await res.json();
        setQuestions(json.questions ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [productId, lessonId]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          product_id: productId,
          lesson_id: lessonId,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        setContent("");
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        fetchQuestions();
      } else {
        setError(json.error || "Không thể gửi câu hỏi. Vui lòng thử lại.");
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card-dark overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageCircleQuestion size={16} className="text-[#3b82f6]" />
          <h3 className="font-semibold text-white text-sm">
            Hỏi giảng viên
          </h3>
          {questions.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#3b82f6]/15 text-[#3b82f6] font-medium">
              {questions.length}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-gray-500" />
        ) : (
          <ChevronDown size={16} className="text-gray-500" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Submit form */}
          <form onSubmit={handleSubmit} className="space-y-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Đặt câu hỏi về bài "${lessonTitle}"...`}
              className="w-full input-dark resize-none text-sm"
              rows={3}
            />
            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            {success && (
              <div className="text-xs text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-lg px-3 py-2">
                Câu hỏi đã được gửi thành công!
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-gray-600">
                Giảng viên sẽ trả lời trong thời gian sớm nhất
              </p>
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="btn-green text-xs py-1.5 px-3 disabled:opacity-40"
              >
                {submitting ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Send size={12} />
                )}
                Gửi câu hỏi
              </button>
            </div>
          </form>

          {/* Questions list */}
          {loading ? (
            <div className="flex items-center justify-center py-6 text-gray-500">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : questions.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-4">
              Chưa có câu hỏi nào. Hãy đặt câu hỏi đầu tiên!
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="rounded-lg p-3 space-y-2"
                  style={{
                    background: "#161616",
                    border: "1px solid #222",
                  }}
                >
                  {/* Question */}
                  <div className="flex items-start gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                      style={{
                        background:
                          "linear-gradient(135deg, #3b82f6, #2563eb)",
                      }}
                    >
                      {(q.profiles?.full_name ?? "?")
                        .split(" ")
                        .map((w: string) => w[0])
                        .slice(-2)
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-white">
                          {q.profiles?.full_name ?? "Thành viên"}
                        </span>
                        <span className="text-[10px] text-gray-600">
                          {timeAgo(q.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 whitespace-pre-line">
                        {q.content}
                      </p>
                    </div>
                  </div>

                  {/* Reply */}
                  {q.reply ? (
                    <div
                      className="ml-8 rounded-lg p-2.5"
                      style={{
                        background: "rgba(34,197,94,0.06)",
                        border: "1px solid rgba(34,197,94,0.15)",
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckCircle2
                          size={12}
                          className="text-[#22c55e]"
                        />
                        <span className="text-[10px] font-medium text-[#22c55e]">
                          {q.replier?.full_name ?? "Giảng viên"}
                        </span>
                        {q.replied_at && (
                          <span className="text-[10px] text-gray-600">
                            • {timeAgo(q.replied_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-300 whitespace-pre-line">
                        {q.reply}
                      </p>
                    </div>
                  ) : (
                    <div className="ml-8 flex items-center gap-1.5 text-[10px] text-gray-600">
                      <Clock size={10} />
                      Đang chờ phản hồi
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
