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

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trophy,
  AlertCircle,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface QuizOption {
  text: string;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: "multiple_choice" | "true_false";
  options: QuizOption[];
  sort_order: number;
}

interface Quiz {
  id: string;
  lesson_id: string;
  title: string;
  pass_score: number;
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
  correct_answers: Record<string, number>;
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
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);

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

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (result) return; // Don't allow changes after submission
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = async () => {
    if (!quiz) return;

    // Check all questions answered
    const unanswered = quiz.questions.filter((q) => answers[q.id] === undefined);
    if (unanswered.length > 0) {
      setError(`Vui lòng trả lời tất cả ${unanswered.length} câu hỏi còn lại`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
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

  const handleRetry = () => {
    setAnswers({});
    setResult(null);
    setError(null);
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
        <div className="flex items-center gap-2 mb-1">
          <ClipboardCheck size={16} className="text-[#D4A843]" />
          <h3 className="text-sm font-semibold text-white">{quiz.title}</h3>
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
          const correctOptionIndex = result?.correct_answers[question.id];
          const selectedOption = answers[question.id];

          return (
            <div key={question.id} className="space-y-2.5">
              {/* Question text */}
              <p className="text-sm text-white font-medium">
                <span className="text-[#D4A843] mr-1.5">
                  Câu {qIndex + 1}.
                </span>
                {question.question_text}
              </p>

              {/* Options */}
              <div className="space-y-1.5 ml-1">
                {question.options.map((option, optIndex) => {
                  const isSelected = selectedOption === optIndex;
                  const isCorrect =
                    isCorrectAnswer && correctOptionIndex === optIndex;
                  const isWrong =
                    result && isSelected && correctOptionIndex !== optIndex;

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
                        handleSelectOption(question.id, optIndex)
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
            onClick={handleSubmit}
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
