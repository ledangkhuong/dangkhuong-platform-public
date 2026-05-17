"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  GripVertical,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LessonOption {
  id: string;
  title: string;
  chapter_title: string;
  course_title: string;
}

interface QuizOption {
  text: string;
  is_correct: boolean;
}

interface QuizQuestion {
  question_text: string;
  question_type: "multiple_choice" | "true_false";
  options: QuizOption[];
}

interface CreateQuizFormProps {
  lessons: LessonOption[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CreateQuizForm({ lessons }: CreateQuizFormProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [lessonId, setLessonId] = useState("");
  const [title, setTitle] = useState("");
  const [passScore, setPassScore] = useState(70);
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    {
      question_text: "",
      question_type: "multiple_choice",
      options: [
        { text: "", is_correct: true },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
      ],
    },
  ]);

  // ─── Question management ──────────────────────────────────────────────────

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        question_text: "",
        question_type: "multiple_choice",
        options: [
          { text: "", is_correct: true },
          { text: "", is_correct: false },
          { text: "", is_correct: false },
          { text: "", is_correct: false },
        ],
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuestionText = (index: number, text: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, question_text: text } : q))
    );
  };

  const updateQuestionType = (
    index: number,
    type: "multiple_choice" | "true_false"
  ) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== index) return q;
        if (type === "true_false") {
          return {
            ...q,
            question_type: type,
            options: [
              { text: "Đúng", is_correct: true },
              { text: "Sai", is_correct: false },
            ],
          };
        }
        return {
          ...q,
          question_type: type,
          options: [
            { text: "", is_correct: true },
            { text: "", is_correct: false },
            { text: "", is_correct: false },
            { text: "", is_correct: false },
          ],
        };
      })
    );
  };

  const updateOptionText = (qIndex: number, oIndex: number, text: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        return {
          ...q,
          options: q.options.map((o, j) =>
            j === oIndex ? { ...o, text } : o
          ),
        };
      })
    );
  };

  const setCorrectOption = (qIndex: number, oIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        return {
          ...q,
          options: q.options.map((o, j) => ({
            ...o,
            is_correct: j === oIndex,
          })),
        };
      })
    );
  };

  const addOption = (qIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex || q.question_type === "true_false") return q;
        return {
          ...q,
          options: [...q.options, { text: "", is_correct: false }],
        };
      })
    );
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex || q.options.length <= 2) return q;
        const newOptions = q.options.filter((_, j) => j !== oIndex);
        // If the removed option was correct, make the first one correct
        if (!newOptions.some((o) => o.is_correct)) {
          newOptions[0].is_correct = true;
        }
        return { ...q, options: newOptions };
      })
    );
  };

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!lessonId) {
      setError("Vui lòng chọn bài học");
      return;
    }
    if (!title.trim()) {
      setError("Vui lòng nhập tiêu đề quiz");
      return;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) {
        setError(`Câu hỏi ${i + 1} chưa có nội dung`);
        return;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].text.trim()) {
          setError(`Câu ${i + 1}, đáp án ${j + 1} chưa có nội dung`);
          return;
        }
      }
      if (!q.options.some((o) => o.is_correct)) {
        setError(`Câu hỏi ${i + 1} chưa chọn đáp án đúng`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: lessonId,
          title: title.trim(),
          pass_score: passScore,
          questions: questions.map((q) => ({
            question_text: q.question_text.trim(),
            question_type: q.question_type,
            options: q.options.map((o) => ({
              text: o.text.trim(),
              is_correct: o.is_correct,
            })),
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Có lỗi xảy ra. Vui lòng thử lại.");
        return;
      }

      setSuccess(true);
      // Reset form
      setTitle("");
      setLessonId("");
      setPassScore(70);
      setQuestions([
        {
          question_text: "",
          question_type: "multiple_choice",
          options: [
            { text: "", is_correct: true },
            { text: "", is_correct: false },
            { text: "", is_correct: false },
            { text: "", is_correct: false },
          ],
        },
      ]);
      setExpanded(false);
      router.refresh();
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="card-dark overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Plus size={16} className="text-[#D4A843]" />
          <h2 className="text-sm font-semibold text-white">Tạo Quiz mới</h2>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-gray-500" />
        ) : (
          <ChevronDown size={16} className="text-gray-500" />
        )}
      </button>

      {expanded && (
        <form onSubmit={handleSubmit} className="p-4 pt-0 space-y-4">
          {/* Lesson selector */}
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1 block">
              Bài học
            </label>
            <select
              value={lessonId}
              onChange={(e) => setLessonId(e.target.value)}
              className="w-full input-dark text-sm"
            >
              <option value="">-- Chọn bài học --</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.course_title} &rsaquo; {l.chapter_title} &rsaquo;{" "}
                  {l.title}
                </option>
              ))}
            </select>
          </div>

          {/* Title + pass score */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">
                Tiêu đề Quiz
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Bài kiểm tra cuối chương"
                className="w-full input-dark text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">
                Điểm đạt (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={passScore}
                onChange={(e) => setPassScore(Number(e.target.value))}
                className="w-full input-dark text-sm"
              />
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Câu hỏi ({questions.length})
            </h3>

            {questions.map((q, qIndex) => (
              <div
                key={qIndex}
                className="rounded-xl p-4 space-y-3"
                style={{
                  background: "#141414",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex items-start gap-2">
                  <GripVertical
                    size={16}
                    className="text-gray-600 mt-2.5 flex-shrink-0"
                  />
                  <div className="flex-1 space-y-3">
                    {/* Question header */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#D4A843]">
                        Câu {qIndex + 1}
                      </span>
                      <select
                        value={q.question_type}
                        onChange={(e) =>
                          updateQuestionType(
                            qIndex,
                            e.target.value as "multiple_choice" | "true_false"
                          )
                        }
                        className="text-xs bg-transparent border border-white/10 rounded px-2 py-1 text-gray-400"
                      >
                        <option value="multiple_choice">Trắc nghiệm</option>
                        <option value="true_false">Đúng/Sai</option>
                      </select>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(qIndex)}
                          className="ml-auto text-gray-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Question text */}
                    <input
                      type="text"
                      value={q.question_text}
                      onChange={(e) =>
                        updateQuestionText(qIndex, e.target.value)
                      }
                      placeholder="Nhập nội dung câu hỏi..."
                      className="w-full input-dark text-sm"
                    />

                    {/* Options */}
                    <div className="space-y-2">
                      {q.options.map((opt, oIndex) => (
                        <div
                          key={oIndex}
                          className="flex items-center gap-2"
                        >
                          {/* Correct answer radio */}
                          <button
                            type="button"
                            onClick={() => setCorrectOption(qIndex, oIndex)}
                            className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                              opt.is_correct
                                ? "border-[#22c55e] bg-[#22c55e]/20"
                                : "border-white/20 hover:border-white/40"
                            }`}
                            title="Đánh dấu đáp án đúng"
                          >
                            {opt.is_correct && (
                              <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
                            )}
                          </button>

                          {/* Option text */}
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) =>
                              updateOptionText(
                                qIndex,
                                oIndex,
                                e.target.value
                              )
                            }
                            placeholder={`Đáp án ${oIndex + 1}`}
                            disabled={q.question_type === "true_false"}
                            className="flex-1 input-dark text-sm disabled:opacity-50"
                          />

                          {/* Remove option */}
                          {q.question_type !== "true_false" &&
                            q.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() =>
                                  removeOption(qIndex, oIndex)
                                }
                                className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                        </div>
                      ))}

                      {/* Add option */}
                      {q.question_type !== "true_false" && (
                        <button
                          type="button"
                          onClick={() => addOption(qIndex)}
                          className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1 ml-7"
                        >
                          <Plus size={12} />
                          Thêm đáp án
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Add question button */}
            <button
              type="button"
              onClick={addQuestion}
              className="w-full py-2.5 rounded-lg border border-dashed border-white/10 text-sm text-gray-400 hover:text-white hover:border-white/20 transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus size={14} />
              Thêm câu hỏi
            </button>
          </div>

          {/* Error / Success */}
          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {success && (
            <div className="text-xs text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-lg px-3 py-2">
              Quiz đã được tạo thành công!
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-3 py-2"
            >
              Huỷ
            </button>
            <button
              type="submit"
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
              Tạo Quiz
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
