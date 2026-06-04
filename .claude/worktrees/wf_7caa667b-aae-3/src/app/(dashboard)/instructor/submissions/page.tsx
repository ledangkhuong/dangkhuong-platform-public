"use client";

import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import {
  Loader2,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Send,
} from "lucide-react";

interface Course {
  id: string;
  title: string;
}

interface SubmissionLink {
  url: string;
  label: string;
}

interface Submission {
  id: string;
  user_id: string;
  lesson_id: string;
  product_id: string;
  content: string;
  links: SubmissionLink[];
  status: "pending" | "reviewed" | "approved";
  feedback: string | null;
  score: number | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  student_name: string | null;
  lesson_title: string | null;
}

const STATUS_CONFIG = {
  pending: {
    label: "Chờ duyệt",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: Clock,
  },
  reviewed: {
    label: "Đã xem",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    icon: CheckCircle2,
  },
  approved: {
    label: "Đạt",
    color: "text-[#22c55e]",
    bg: "bg-[#22c55e]/10",
    border: "border-[#22c55e]/20",
    icon: CheckCircle2,
  },
};

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

export default function InstructorSubmissionsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);

  // Filters
  const [filterCourse, setFilterCourse] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Expanded submission
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Review form state
  const [reviewFeedback, setReviewFeedback] = useState<Record<string, string>>(
    {}
  );
  const [reviewScore, setReviewScore] = useState<Record<string, string>>({});
  const [reviewStatus, setReviewStatus] = useState<Record<string, string>>({});
  const [reviewSaving, setReviewSaving] = useState<Record<string, boolean>>(
    {}
  );

  // Fetch courses
  useEffect(() => {
    fetch("/api/instructor/courses")
      .then((r) => r.json())
      .then((d) => setCourses(d.courses ?? []))
      .catch(() => {});
  }, []);

  // Fetch submissions
  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));
      if (filterCourse) params.set("product_id", filterCourse);
      if (filterStatus) params.set("status", filterStatus);

      const res = await fetch(
        `/api/instructor/submissions?${params.toString()}`
      );
      const data = await res.json();
      setSubmissions(data.submissions ?? []);
      setTotal(data.total ?? 0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [offset, filterCourse, filterStatus]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0);
  }, [filterCourse, filterStatus]);

  const handleReviewSubmit = async (submissionId: string) => {
    setReviewSaving((p) => ({ ...p, [submissionId]: true }));
    try {
      const body: Record<string, unknown> = { id: submissionId };
      const feedback = reviewFeedback[submissionId];
      const score = reviewScore[submissionId];
      const status = reviewStatus[submissionId];

      if (feedback !== undefined) body.feedback = feedback;
      if (score !== undefined && score !== "") body.score = Number(score);
      if (status) body.status = status;

      const res = await fetch("/api/instructor/submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        // Update in list
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === submissionId
              ? {
                  ...s,
                  status: data.submission?.status ?? s.status,
                  feedback: data.submission?.feedback ?? s.feedback,
                  score: data.submission?.score ?? s.score,
                }
              : s
          )
        );
      }
    } catch {
      // silently fail
    } finally {
      setReviewSaving((p) => ({ ...p, [submissionId]: false }));
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div>
      <TopBar
        title="Chấm bài"
        subtitle="Xem và đánh giá bài tập học viên"
      />

      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
        {/* Filters */}
        <div className="card-dark p-4 flex flex-wrap gap-3 items-center">
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
              <option value="pending">Chờ duyệt</option>
              <option value="reviewed">Đã xem</option>
              <option value="approved">Đạt</option>
            </select>
          </div>

          <div className="text-xs text-gray-500 self-end pb-2">
            {total} bài nộp
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-gray-500" />
          </div>
        )}

        {/* Empty */}
        {!loading && submissions.length === 0 && (
          <div className="card-dark p-8 text-center">
            <p className="text-gray-400 text-sm">
              Không có bài nộp nào phù hợp.
            </p>
          </div>
        )}

        {/* Submissions List */}
        {!loading && submissions.length > 0 && (
          <div className="space-y-2">
            {submissions.map((sub) => {
              const config = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.pending;
              const StatusIcon = config.icon;
              const isExpanded = expandedId === sub.id;

              return (
                <div key={sub.id} className="card-dark overflow-hidden">
                  {/* Row header */}
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : sub.id)
                    }
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-[#1a1a1a] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white truncate">
                          {sub.student_name ?? "Học viên"}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${config.bg} ${config.color}`}
                        >
                          <StatusIcon size={10} />
                          {config.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {sub.lesson_title ?? "Bài học"} &middot;{" "}
                        {timeAgo(sub.created_at)}
                      </p>
                    </div>

                    {sub.score !== null && (
                      <div className="text-sm font-bold text-[#D4A843] shrink-0">
                        {sub.score}/100
                      </div>
                    )}

                    {isExpanded ? (
                      <ChevronUp size={16} className="text-gray-500 shrink-0" />
                    ) : (
                      <ChevronDown
                        size={16}
                        className="text-gray-500 shrink-0"
                      />
                    )}
                  </button>

                  {/* Expanded content */}
                  <div
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{
                      maxHeight: isExpanded ? "800px" : "0px",
                      opacity: isExpanded ? 1 : 0,
                    }}
                  >
                    <div className="px-4 pb-4 border-t border-[#2a2a2a]">
                      {/* Submission content */}
                      {sub.content && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-500 mb-1">
                            Nội dung bài nộp
                          </p>
                          <div className="bg-[#111] rounded-lg p-3 text-sm text-gray-300 whitespace-pre-line">
                            {sub.content}
                          </div>
                        </div>
                      )}

                      {/* Links */}
                      {sub.links && sub.links.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-500 mb-1">
                            Liên kết
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {sub.links.map((link, i) => (
                              <a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#111] border border-[#2a2a2a] rounded-lg text-xs text-[#D4A843] hover:bg-[#1a1a1a] transition-colors"
                              >
                                <ExternalLink size={12} />
                                {link.label || link.url}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Existing feedback */}
                      {sub.feedback && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-500 mb-1">
                            Nhận xét hiện tại
                          </p>
                          <div className="bg-[#0d1a0d] border border-[#22c55e]/20 rounded-lg p-3 text-sm text-gray-300 whitespace-pre-line">
                            {sub.feedback}
                          </div>
                        </div>
                      )}

                      {/* Review form */}
                      <div className="mt-4 pt-3 border-t border-[#2a2a2a]">
                        <p className="text-xs text-gray-400 font-medium mb-2">
                          Đánh giá bài nộp
                        </p>
                        <div className="space-y-3">
                          <textarea
                            value={reviewFeedback[sub.id] ?? sub.feedback ?? ""}
                            onChange={(e) =>
                              setReviewFeedback((p) => ({
                                ...p,
                                [sub.id]: e.target.value,
                              }))
                            }
                            placeholder="Nhập nhận xét cho học viên..."
                            rows={3}
                            className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white placeholder:text-gray-500 resize-none focus:outline-none focus:border-[#D4A843] transition-colors"
                          />
                          <div className="flex flex-wrap gap-3 items-end">
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">
                                Điểm (0-100)
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={
                                  reviewScore[sub.id] ??
                                  (sub.score !== null ? String(sub.score) : "")
                                }
                                onChange={(e) =>
                                  setReviewScore((p) => ({
                                    ...p,
                                    [sub.id]: e.target.value,
                                  }))
                                }
                                className="w-24 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4A843] transition-colors"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">
                                Trạng thái
                              </label>
                              <select
                                value={reviewStatus[sub.id] ?? sub.status}
                                onChange={(e) =>
                                  setReviewStatus((p) => ({
                                    ...p,
                                    [sub.id]: e.target.value,
                                  }))
                                }
                                className="bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4A843] transition-colors"
                              >
                                <option value="pending">Chờ duyệt</option>
                                <option value="reviewed">Đã xem</option>
                                <option value="approved">Đạt</option>
                              </select>
                            </div>
                            <button
                              onClick={() => handleReviewSubmit(sub.id)}
                              disabled={reviewSaving[sub.id]}
                              className={`btn-green text-sm py-2 px-4 inline-flex items-center gap-1.5 ${
                                reviewSaving[sub.id]
                                  ? "opacity-40 cursor-not-allowed"
                                  : ""
                              }`}
                            >
                              {reviewSaving[sub.id] ? (
                                <Loader2
                                  size={14}
                                  className="animate-spin"
                                />
                              ) : (
                                <Send size={14} />
                              )}
                              Lưu đánh giá
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={offset === 0}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                offset === 0
                  ? "bg-[#1a1a1a] text-gray-600 cursor-not-allowed"
                  : "bg-[#1a1a1a] text-gray-300 hover:bg-[#222]"
              }`}
            >
              Trước
            </button>
            <span className="text-xs text-gray-400">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={currentPage >= totalPages}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                currentPage >= totalPages
                  ? "bg-[#1a1a1a] text-gray-600 cursor-not-allowed"
                  : "bg-[#1a1a1a] text-gray-300 hover:bg-[#222]"
              }`}
            >
              Sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
