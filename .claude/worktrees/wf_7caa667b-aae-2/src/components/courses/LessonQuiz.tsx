/**
 * LessonQuiz — Student quiz component for a lesson
 *
 * INTEGRATION NOTE: Add this component to the lesson view page:
 *   import LessonQuiz from "@/components/courses/LessonQuiz";
 *   <LessonQuiz lessonId={lesson.id} />
 *
 * Do NOT modify the lesson page directly — other agents may be working on it.
 * This component is ready for integration.
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ClipboardCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trophy,
  AlertCircle,
  Clock,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface QuizOption {
  text: string;
  original_index: number;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "short_answer";
  options: QuizOption[];
  sort_order: number;
}

interface Quiz {
  id: string;
  lesson_id: string;
  title: string;
  pass_score: number;
  time_limit_minutes?: number;
  questions: QuizQuestion[];
}

interface BestAttempt {
  id: string;
  score: number;
  passed: boolean;
  completed_at: string;
}

interface SubmitResult {
  score: number;
  passed: boolean;
  correct_count: number;
  total_questions: number;
  correct_answers: Record<string, number | string>;
}

interface LessonQuizProps {
  lessonId: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LessonQuiz({ lessonId }: LessonQuizProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [bestAttempt, setBestAttempt] = useState<BestAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);

  // Timer state
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const autoSubmitFired = useRef(false);

  const fetchQuiz = useCallback(async () => {
    try {
      // First, find the quiz for this lesson
      const res = await fetch(`/api/quizzes/by-lesson?lesson_id=${lessonId}`);
      if (res.status === 404) {
        // No quiz for this lesson
        setQuiz(null);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (!data.quiz_id) {
        setQuiz(null);
        setLoading(false);
        return;
      }

      // Fetch the actual quiz
      const quizRes = await fetch(`/api/quizzes/${data.quiz_id}`);
      if (!quizRes.ok) {
        setLoading(false);
        return;
      }
      const quizData = await quizRes.json();
      setQuiz(quizData.quiz);
      setBestAttempt(quizData.bestAttempt);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  // Initialize timer when quiz loads and has a time limit
  useEffect(() => {
    if (
      quiz?.time_limit_minutes &&
      quiz.time_limit_minutes > 0 &&
      !result
    ) {
      setTimeLeft(quiz.time_limit_minutes * 60);
      autoSubmitFired.current = false;
    }
  }, [quiz?.id, quiz?.time_limit_minutes, result]);

  // Countdown interval
  const timerActive = timeLeft !== null && timeLeft > 0 && !result;
  useEffect(() => {
    if (!timerActive) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive]);

  const handleSelectOption = (
    questionId: string,
    originalIndex: number
  ) => {
    if (result) return; // Don't allow changes after submission
    setAnswers((prev) => ({ ...prev, [questionId]: originalIndex }));
  };

  const handleSubmit = async (force = false) => {
    if (!quiz) return;

    // Check all questions answered (skip check on auto-submit from timer)
    if (!force) {
      const unanswered = quiz.questions.filter((q) => {
        if (q.question_type === "short_answer") {
          return !textAnswers[q.id]?.trim();
        }
        return answers[q.id] === undefined;
      });
      if (unanswered.length > 0) {
        setError(
          `Vui lòng trả lời tất cả ${unanswered.length} câu hỏi còn lại`
        );
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      // Merge text answers (short_answer) into the answers object
      const mergedAnswers: Record<string, number | string> = { ...answers };
      for (const [qId, text] of Object.entries(textAnswers)) {
        if (text.trim()) {
          mergedAnswers[qId] = text;
        }
      }

      const res = await fetch(`/api/quizzes/${quiz.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: mergedAnswers }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Có lỗi xảy ra. Vui lòng thử lại.");
        return;
      }

      setResult(data);

      // Update best attempt if this is better
      if (!bestAttempt || data.score > bestAttempt.score) {
        setBestAttempt({
          id: "",
          score: data.score,
          passed: data.passed,
          completed_at: new Date().toISOString(),
        });
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-submit when timer reaches 0 (force = true skips unanswered check)
  useEffect(() => {
    if (timeLeft === 0 && !result && !submitting && !autoSubmitFired.current) {
      autoSubmitFired.current = true;
      handleSubmit(true);
    }
  }, [timeLeft, result, submitting]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = () => {
    setAnswers({});
    setTextAnswers({});
    setResult(null);
    setError(null);
    // Reset timer for retry
    if (quiz?.time_limit_minutes && quiz.time_limit_minutes > 0) {
      setTimeLeft(quiz.time_limit_minutes * 60);
      autoSubmitFired.current = false;
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="card-dark p-6 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-gray-500" />
      </div>
    );
  }

  // No quiz for this lesson
  if (!quiz) return null;

  // Already passed — show compact badge
  if (bestAttempt?.passed && !showQuiz) {
    return (
      <div className="card-dark overflow-hidden">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(34,197,94,0.15)" }}
            >
              <Trophy size={16} className="text-[#22c55e]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {quiz.title}
              </h3>
              <p className="text-xs text-[#22c55e] flex items-center gap-1 mt-0.5">
                <CheckCircle2 size={12} />
                Đã hoàn thành — Điểm cao nhất: {bestAttempt.score}%
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowQuiz(true)}
            className="text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            Làm lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card-dark overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={16} className="text-[#D4A843]" />
            <h3 className="text-sm font-semibold text-white">{quiz.title}</h3>
          </div>
          {/* Countdown timer */}
          {timeLeft !== null && !result && (
            <div
              aria-live="assertive"
              aria-label="Thời gian còn lại"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold ${
                timeLeft < 30
                  ? "text-red-400 bg-red-500/10"
                  : timeLeft < 120
                    ? "text-amber-400 bg-amber-500/10"
                    : "text-gray-300 bg-white/5"
              }`}
            >
              <Clock size={13} />
              {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:
              {String(timeLeft % 60).padStart(2, "0")}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500">
          {quiz.questions.length} câu hỏi — Cần đạt {quiz.pass_score}% để
          hoàn thành
        </p>
      </div>

      {/* Questions */}
      <div className="p-4 space-y-5">
        {quiz.questions.map((question, qIndex) => {
          const isCorrectAnswer =
            result && result.correct_answers[question.id] !== undefined;
          const correctOriginalIndex = result?.correct_answers[question.id];
          const selectedOriginalIndex = answers[question.id];

          return (
            <div key={question.id} className="space-y-2.5">
              {/* Question text */}
              <p className="text-sm text-white font-medium">
                <span className="text-[#D4A843] mr-1.5">
                  Câu {qIndex + 1}.
                </span>
                {question.question_text}
              </p>

              {/* Short answer textarea */}
              {question.question_type === "short_answer" ? (
                <div className="ml-1">
                  {result ? (
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">
                        {textAnswers[question.id] || "(Chưa trả lời)"}
                      </p>
                      <p className="text-xs text-[#D4A843] mt-2 flex items-center gap-1.5">
                        <CheckCircle2 size={12} />
                        Đã gửi câu trả lời
                      </p>
                    </div>
                  ) : (
                    <textarea
                      placeholder="Nhập câu trả lời của bạn..."
                      value={textAnswers[question.id] || ""}
                      onChange={(e) => setTextAnswers(prev => ({...prev, [question.id]: e.target.value}))}
                      className="w-full p-3 rounded-lg text-sm text-white placeholder-gray-500 resize-none"
                      style={{ background: '#1a1a1a', border: '1px solid #333', minHeight: '100px' }}
                      rows={4}
                    />
                  )}
                </div>
              ) : (
              /* Options for multiple_choice / true_false */
              <div className="space-y-1.5 ml-1">
                {question.options.map((option, optIndex) => {
                  const oi = option.original_index;
                  const isSelected = selectedOriginalIndex === oi;
                  const isCorrect =
                    isCorrectAnswer && correctOriginalIndex === oi;
                  const isWrong =
                    result && isSelected && correctOriginalIndex !== oi;

                  let borderColor = "border-white/[0.08]";
                  let bgColor = "bg-transparent";
                  let textColor = "text-gray-300";

                  if (result) {
                    if (isCorrect) {
                      borderColor = "border-[#22c55e]/40";
                      bgColor = "bg-[#22c55e]/10";
                      textColor = "text-[#22c55e]";
                    } else if (isWrong) {
                      borderColor = "border-red-500/40";
                      bgColor = "bg-red-500/10";
                      textColor = "text-red-400";
                    }
                  } else if (isSelected) {
                    borderColor = "border-[#D4A843]/40";
                    bgColor = "bg-[#D4A843]/10";
                    textColor = "text-[#D4A843]";
                  }

                  return (
                    <button
                      key={optIndex}
                      onClick={() =>
                        handleSelectOption(question.id, oi)
                      }
                      disabled={!!result}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border ${borderColor} ${bgColor} transition-all flex items-center gap-2.5 group ${
                        result
                          ? "cursor-default"
                          : "hover:border-[#D4A843]/30 hover:bg-[#D4A843]/5 cursor-pointer"
                      }`}
                    >
                      {/* Radio indicator */}
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                          result
                            ? isCorrect
                              ? "border-[#22c55e]"
                              : isWrong
                                ? "border-red-500"
                                : "border-white/20"
                            : isSelected
                              ? "border-[#D4A843]"
                              : "border-white/20 group-hover:border-[#D4A843]/50"
                        }`}
                      >
                        {(isSelected || (result && isCorrect)) && (
                          <div
                            className={`w-2 h-2 rounded-full ${
                              result
                                ? isCorrect
                                  ? "bg-[#22c55e]"
                                  : isWrong
                                    ? "bg-red-500"
                                    : ""
                                : "bg-[#D4A843]"
                            }`}
                          />
                        )}
                      </div>

                      {/* Option text */}
                      <span className={`text-sm ${textColor}`}>
                        {option.text}
                      </span>

                      {/* Result icons */}
                      {result && isCorrect && (
                        <CheckCircle2
                          size={14}
                          className="text-[#22c55e] ml-auto flex-shrink-0"
                        />
                      )}
                      {result && isWrong && (
                        <XCircle
                          size={14}
                          className="text-red-400 ml-auto flex-shrink-0"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Result banner */}
      {result && (
        <div
          role="alert"
          className={`mx-4 mb-3 rounded-lg px-4 py-3 flex items-center gap-3 ${
            result.passed
              ? "bg-[#22c55e]/10 border border-[#22c55e]/20"
              : "bg-red-500/10 border border-red-500/20"
          }`}
        >
          {result.passed ? (
            <Trophy size={20} className="text-[#22c55e] flex-shrink-0" />
          ) : (
            <XCircle size={20} className="text-red-400 flex-shrink-0" />
          )}
          <div>
            <p
              className={`text-sm font-semibold ${
                result.passed ? "text-[#22c55e]" : "text-red-400"
              }`}
            >
              {result.passed ? "Chúc mừng! Bạn đã vượt qua!" : "Chưa đạt"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Đúng {result.correct_count}/{result.total_questions} câu — Điểm:{" "}
              {result.score}%
            </p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="p-4 pt-0 flex items-center gap-2">
        {result ? (
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-white/5 hover:bg-white/10 text-white border border-white/10"
          >
            <RotateCcw size={14} />
            Làm lại
          </button>
        ) : (
          <button
            onClick={() => handleSubmit()}
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #D4A843, #b8912e)",
              color: "#0a0a0a",
            }}
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ClipboardCheck size={14} />
            )}
            Nộp bài
          </button>
        )}

        {showQuiz && bestAttempt?.passed && (
          <button
            onClick={() => {
              setShowQuiz(false);
              handleRetry();
            }}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-3 py-2"
          >
            Đóng
          </button>
        )}
      </div>
    </div>
  );
}
