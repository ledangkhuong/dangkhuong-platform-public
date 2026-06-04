"use client";

import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import {
  Loader2,
  MessageSquare,
  CheckCircle2,
  Pin,
  Send,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
} from "lucide-react";

interface Course {
  id: string;
  title: string;
}

interface Reply {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name: string | null;
  user_avatar: string | null;
}

interface Question {
  id: string;
  user_id: string;
  product_id: string;
  lesson_id: string;
  content: string;
  is_resolved: boolean;
  is_pinned: boolean;
  reply_count: number;
  created_at: string;
  updated_at: string;
  student_name: string | null;
  student_avatar: string | null;
  lesson_title: string | null;
  course_title: string | null;
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

const PAGE_SIZE = 20;

export default function InstructorQuestionsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters
  const [filterCourse, setFilterCourse] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Expanded question
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Replies state per question
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [repliesLoading, setRepliesLoading] = useState<
    Record<string, boolean>
  >({});

  // Reply form state
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [replyLoading, setReplyLoading] = useState<Record<string, boolean>>({});

  // Action loading (resolve/pin)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {}
  );

  // Fetch courses
  useEffect(() => {
    fetch("/api/instructor/courses")
      .then((r) => r.json())
      .then((d) => setCourses(d.courses ?? []))
      .catch(() => {});
  }, []);

  // Fetch questions
  const fetchQuestions = useCallback(
    async (append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      try {
        const params = new URLSearchParams();
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", String(append ? offset : 0));
        if (filterCourse) params.set("product_id", filterCourse);
        if (filterStatus) params.set("status", filterStatus);

        const res = await fetch(
          `/api/instructor/questions?${params.toString()}`
        );
        const data = await res.json();
        const fetched = data.questions ?? [];

        if (append) {
          setQuestions((prev) => [...prev, ...fetched]);
        } else {
          setQuestions(fetched);
        }
        setTotal(data.total ?? 0);
        setHasMore(
          (append ? questions.length + fetched.length : fetched.length) <
            (data.total ?? 0)
        );
      } catch {
        // silently fail
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [offset, filterCourse, filterStatus, questions.length]
  );

  useEffect(() => {
    setOffset(0);
    setQuestions([]);
    fetchQuestions(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCourse, filterStatus]);

  const handleLoadMore = () => {
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
  };

  // Trigger fetch when offset changes (for load more)
  useEffect(() => {
    if (offset > 0) {
      fetchQuestions(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  // Fetch replies when expanding a question
  const fetchReplies = async (questionId: string) => {
    setRepliesLoading((p) => ({ ...p, [questionId]: true }));
    try {
      const res = await fetch(
        `/api/instructor/questions?discussion_id=${questionId}&replies=true`
      );
      const data = await res.json();
      setReplies((p) => ({ ...p, [questionId]: data.replies ?? [] }));
    } catch {
      // silently fail
    } finally {
      setRepliesLoading((p) => ({ ...p, [questionId]: false }));
    }
  };

  const handleToggleExpand = (questionId: string, replyCount: number) => {
    if (expandedId === questionId) {
      setExpandedId(null);
    } else {
      setExpandedId(questionId);
      if (replyCount > 0 && !replies[questionId]) {
        fetchReplies(questionId);
      }
    }
  };

  // Submit reply
  const handleReplySubmit = async (questionId: string) => {
    const content = replyContent[questionId]?.trim();
    if (!content) return;

    setReplyLoading((p) => ({ ...p, [questionId]: true }));
    try {
      const res = await fetch("/api/instructor/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discussion_id: questionId, content }),
      });

      if (res.ok) {
        setReplyContent((p) => ({ ...p, [questionId]: "" }));
        // Refresh replies
        await fetchReplies(questionId);
        // Update reply count in question list
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === questionId ? { ...q, reply_count: q.reply_count + 1 } : q
          )
        );
      }
    } catch {
      // silently fail
    } finally {
      setReplyLoading((p) => ({ ...p, [questionId]: false }));
    }
  };

  // Toggle resolve
  const handleToggleResolve = async (question: Question) => {
    const key = `resolve-${question.id}`;
    setActionLoading((p) => ({ ...p, [key]: true }));
    try {
      const res = await fetch("/api/instructor/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discussion_id: question.id,
          is_resolved: !question.is_resolved,
        }),
      });

      if (res.ok) {
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === question.id
              ? { ...q, is_resolved: !question.is_resolved }
              : q
          )
        );
      }
    } catch {
      // silently fail
    } finally {
      setActionLoading((p) => ({ ...p, [key]: false }));
    }
  };

  // Toggle pin
  const handleTogglePin = async (question: Question) => {
    const key = `pin-${question.id}`;
    setActionLoading((p) => ({ ...p, [key]: true }));
    try {
      const res = await fetch("/api/instructor/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discussion_id: question.id,
          is_pinned: !question.is_pinned,
        }),
      });

      if (res.ok) {
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === question.id
              ? { ...q, is_pinned: !question.is_pinned }
              : q
          )
        );
      }
    } catch {
      // silently fail
    } finally {
      setActionLoading((p) => ({ ...p, [key]: false }));
    }
  };

  return (
    <div>
      <TopBar
        title="Câu hỏi học viên"
        subtitle="Xem và trả lời câu hỏi của học viên"
      />

      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
        {/* Filters */}
        <div className="card-dark p-4 flex flex-wrap gap-3 items-center">
          <Filter size={16} className="text-gray-500 shrink-0" />

          <div className="flex-1 min-w-[180px]">
            <label className="text-xs text-gray-400 mb-1 block">
              Khoá học
            </label>
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4A843] transition-colors"
            >
              <option value="">Tất cả khoá học</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[160px]">
            <label className="text-xs text-gray-400 mb-1 block">
              Trạng thái
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4A843] transition-colors"
            >
              <option value="">Tất cả</option>
              <option value="unresolved">Chưa giải đáp</option>
              <option value="resolved">Đã giải đáp</option>
            </select>
          </div>

          <div className="text-xs text-gray-500 self-end pb-2">
            {total} câu hỏi
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-gray-500" />
          </div>
        )}

        {/* Empty */}
        {!loading && questions.length === 0 && (
          <div className="card-dark p-8 text-center">
            <MessageSquare
              size={32}
              className="text-gray-600 mx-auto mb-3"
            />
            <p className="text-gray-400 text-sm">
              Không có câu hỏi nào phù hợp.
            </p>
          </div>
        )}

        {/* Questions List */}
        {!loading && questions.length > 0 && (
          <div className="space-y-2">
            {questions.map((q) => {
              const isExpanded = expandedId === q.id;
              const isResolved = q.is_resolved;
              const isPinned = q.is_pinned;

              return (
                <div key={q.id} className="card-dark overflow-hidden">
                  {/* Row header */}
                  <button
                    onClick={() =>
                      handleToggleExpand(q.id, q.reply_count)
                    }
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-[#1a1a1a] transition-colors"
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-[#2a2a2a] shrink-0 overflow-hidden flex items-center justify-center">
                      {q.student_avatar ? (
                        <img
                          src={q.student_avatar}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-gray-400 font-medium">
                          {(q.student_name ?? "H")[0].toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-medium text-white truncate">
                          {q.student_name ?? "Học viên"}
                        </span>

                        {isPinned && (
                          <Pin
                            size={12}
                            className="text-[#D4A843] shrink-0"
                          />
                        )}

                        {/* Status badge */}
                        {isResolved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#22c55e]/10 text-[#22c55e]">
                            <CheckCircle2 size={10} />
                            Đã giải đáp
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#f59e0b]/10 text-[#f59e0b]">
                            <Clock size={10} />
                            Chưa giải đáp
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-400 truncate">
                        {q.lesson_title ?? "Bài học"} &middot;{" "}
                        {q.course_title ?? "Khoá học"} &middot;{" "}
                        {timeAgo(q.created_at)}
                      </p>

                      <p className="text-sm text-gray-300 mt-1 line-clamp-2">
                        {q.content}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Reply count */}
                      <div className="flex items-center gap-1 text-gray-500">
                        <MessageSquare size={14} />
                        <span className="text-xs">{q.reply_count}</span>
                      </div>

                      {isExpanded ? (
                        <ChevronUp
                          size={16}
                          className="text-gray-500"
                        />
                      ) : (
                        <ChevronDown
                          size={16}
                          className="text-gray-500"
                        />
                      )}
                    </div>
                  </button>

                  {/* Expanded content */}
                  <div
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{
                      maxHeight: isExpanded ? "2000px" : "0px",
                      opacity: isExpanded ? 1 : 0,
                    }}
                  >
                    <div className="px-4 pb-4 border-t border-[#2a2a2a]">
                      {/* Full question content */}
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 mb-1">
                          Nội dung câu hỏi
                        </p>
                        <div className="bg-[#111] rounded-lg p-3 text-sm text-gray-300 whitespace-pre-line">
                          {q.content}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => handleToggleResolve(q)}
                          disabled={actionLoading[`resolve-${q.id}`]}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            q.is_resolved
                              ? "bg-[#f59e0b]/10 text-[#f59e0b] hover:bg-[#f59e0b]/20"
                              : "bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e]/20"
                          } ${
                            actionLoading[`resolve-${q.id}`]
                              ? "opacity-40 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          {actionLoading[`resolve-${q.id}`] ? (
                            <Loader2
                              size={12}
                              className="animate-spin"
                            />
                          ) : (
                            <CheckCircle2 size={12} />
                          )}
                          {q.is_resolved
                            ? "Đánh dấu chưa giải đáp"
                            : "Đánh dấu đã giải đáp"}
                        </button>

                        <button
                          onClick={() => handleTogglePin(q)}
                          disabled={actionLoading[`pin-${q.id}`]}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            q.is_pinned
                              ? "bg-[#D4A843]/10 text-[#D4A843] hover:bg-[#D4A843]/20"
                              : "bg-gray-500/10 text-gray-400 hover:bg-gray-500/20"
                          } ${
                            actionLoading[`pin-${q.id}`]
                              ? "opacity-40 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          {actionLoading[`pin-${q.id}`] ? (
                            <Loader2
                              size={12}
                              className="animate-spin"
                            />
                          ) : (
                            <Pin size={12} />
                          )}
                          {q.is_pinned ? "Bỏ ghim" : "Ghim câu hỏi"}
                        </button>
                      </div>

                      {/* Replies section */}
                      <div className="mt-4 pt-3 border-t border-[#2a2a2a]">
                        <p className="text-xs text-gray-400 font-medium mb-2">
                          Trả lời ({q.reply_count})
                        </p>

                        {/* Loading replies */}
                        {repliesLoading[q.id] && (
                          <div className="flex items-center justify-center py-4">
                            <Loader2
                              size={16}
                              className="animate-spin text-gray-500"
                            />
                          </div>
                        )}

                        {/* Replies list */}
                        {replies[q.id] &&
                          replies[q.id].length > 0 && (
                            <div className="space-y-3 mb-4">
                              {replies[q.id].map((reply) => (
                                <div
                                  key={reply.id}
                                  className="flex gap-2.5"
                                >
                                  <div className="w-7 h-7 rounded-full bg-[#2a2a2a] shrink-0 overflow-hidden flex items-center justify-center">
                                    {reply.user_avatar ? (
                                      <img
                                        src={reply.user_avatar}
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-[10px] text-gray-400 font-medium">
                                        {(
                                          reply.user_name ?? "U"
                                        )[0].toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="text-xs font-medium text-white">
                                        {reply.user_name ??
                                          "Người dùng"}
                                      </span>
                                      <span className="text-[10px] text-gray-500">
                                        {timeAgo(reply.created_at)}
                                      </span>
                                    </div>
                                    <div className="bg-[#111] rounded-lg p-2.5 text-sm text-gray-300 whitespace-pre-line">
                                      {reply.content}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                        {/* No replies yet */}
                        {!repliesLoading[q.id] &&
                          q.reply_count === 0 && (
                            <p className="text-xs text-gray-500 mb-3">
                              Chưa có trả lời nào.
                            </p>
                          )}

                        {/* Reply form */}
                        <div className="space-y-2">
                          <textarea
                            value={replyContent[q.id] ?? ""}
                            onChange={(e) =>
                              setReplyContent((p) => ({
                                ...p,
                                [q.id]: e.target.value,
                              }))
                            }
                            placeholder="Nhập trả lời..."
                            maxLength={5000}
                            rows={3}
                            className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white placeholder:text-gray-500 resize-none focus:outline-none focus:border-[#D4A843] transition-colors"
                            style={{ minHeight: "80px" }}
                          />
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-600">
                              {(replyContent[q.id] ?? "").length}/5000
                            </span>
                            <button
                              onClick={() => handleReplySubmit(q.id)}
                              disabled={
                                replyLoading[q.id] ||
                                !(replyContent[q.id] ?? "").trim()
                              }
                              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-[#D4A843] text-black hover:bg-[#c49a3a] ${
                                replyLoading[q.id] ||
                                !(replyContent[q.id] ?? "").trim()
                                  ? "opacity-40 cursor-not-allowed"
                                  : ""
                              }`}
                            >
                              {replyLoading[q.id] ? (
                                <Loader2
                                  size={14}
                                  className="animate-spin"
                                />
                              ) : (
                                <Send size={14} />
                              )}
                              Gửi trả lời
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load more */}
        {!loading && hasMore && (
          <div className="flex items-center justify-center pt-4">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors bg-[#1a1a1a] text-gray-300 hover:bg-[#222] border border-[#2a2a2a] ${
                loadingMore ? "opacity-40 cursor-not-allowed" : ""
              }`}
            >
              {loadingMore ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Đang tải...
                </span>
              ) : (
                "Tải thêm"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
