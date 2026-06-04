"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Upload,
  Send,
  Loader2,
  ExternalLink,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface SubmissionLink {
  url: string;
  label: string;
}

interface Submission {
  id: string;
  content: string;
  links: SubmissionLink[];
  status: "pending" | "reviewed" | "approved";
  feedback: string | null;
  created_at: string;
  updated_at: string;
}

interface LessonSubmissionProps {
  lessonId: string;
  productId: string;
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

const STATUS_CONFIG = {
  pending: {
    label: "Đang chờ duyệt",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    icon: Clock,
  },
  reviewed: {
    label: "Đã xem",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    icon: CheckCircle2,
  },
  approved: {
    label: "Đạt",
    color: "text-[#22c55e]",
    bg: "bg-[#22c55e]/10",
    icon: CheckCircle2,
  },
};

export default function LessonSubmission({
  lessonId,
  productId,
}: LessonSubmissionProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [links, setLinks] = useState<SubmissionLink[]>([]);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/submissions?lesson_id=${lessonId}&product_id=${productId}`
      );
      if (res.ok) {
        const json = await res.json();
        setSubmissions(json.submissions ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [lessonId, productId]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleAddLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      setError("Liên kết phải bắt đầu bằng http:// hoặc https://");
      return;
    }
    setLinks([...links, { url, label: linkLabel.trim() || url }]);
    setLinkUrl("");
    setLinkLabel("");
    setShowLinkInput(false);
    setError(null);
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && links.length === 0) {
      setError("Vui lòng nhập nội dung hoặc thêm liên kết bài nộp.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: lessonId,
          product_id: productId,
          content: content.trim(),
          links,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        setContent("");
        setLinks([]);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        fetchSubmissions();
      } else {
        setError(json.error || "Không thể nộp bài. Vui lòng thử lại.");
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
          <Upload size={16} className="text-[#D4A843]" />
          <h3 className="font-semibold text-white text-sm">Nộp bài</h3>
          {submissions.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#D4A843]/15 text-[#D4A843] font-medium">
              {submissions.length}
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
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung bài nộp, mô tả bài làm của bạn..."
              className="w-full input-dark resize-none text-sm"
              rows={3}
            />

            {/* Links list */}
            {links.length > 0 && (
              <div className="space-y-1.5">
                {links.map((link, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid #2a2a2a",
                    }}
                  >
                    <ExternalLink
                      size={14}
                      className="text-[#D4A843] shrink-0"
                    />
                    <span className="flex-1 min-w-0 text-gray-300 truncate">
                      {link.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLink(i)}
                      className="text-gray-500 hover:text-red-400 transition-colors shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add link form */}
            {showLinkInput ? (
              <div
                className="rounded-lg p-3 space-y-2"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid #2a2a2a",
                }}
              >
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full input-dark text-sm"
                  autoFocus
                />
                <input
                  type="text"
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  placeholder="Tên liên kết (không bắt buộc)"
                  className="w-full input-dark text-sm"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddLink}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                    style={{
                      background: "rgba(212,168,67,0.15)",
                      color: "#D4A843",
                    }}
                  >
                    Thêm
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLinkInput(false);
                      setLinkUrl("");
                      setLinkLabel("");
                    }}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Huỷ
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowLinkInput(true)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#D4A843] transition-colors"
              >
                <Plus size={14} />
                Thêm liên kết (Google Drive, Notion, v.v.)
              </button>
            )}

            {error && (
              <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 text-xs text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-lg px-3 py-2">
                <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                Nộp bài thành công!
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-[10px] text-gray-500">
                Giảng viên sẽ xem và phản hồi bài nộp của bạn
              </p>
              <button
                type="submit"
                disabled={
                  submitting || (!content.trim() && links.length === 0)
                }
                className="flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg font-medium transition-all disabled:opacity-40"
                style={{
                  background: "linear-gradient(135deg, #D4A843, #B8922E)",
                  color: "#000",
                }}
              >
                {submitting ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Send size={12} />
                )}
                Nộp bài
              </button>
            </div>
          </form>

          {/* Submissions list */}
          {loading ? (
            <div className="flex items-center justify-center py-6 text-gray-500">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : submissions.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">
              Chưa có bài nộp nào. Hãy nộp bài đầu tiên!
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {submissions.map((sub) => {
                const statusCfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusCfg.icon;

                return (
                  <div
                    key={sub.id}
                    className="rounded-lg p-3 space-y-2"
                    style={{
                      background: "#161616",
                      border: "1px solid #222",
                    }}
                  >
                    {/* Header with status */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">
                        {timeAgo(sub.created_at)}
                      </span>
                      <span
                        className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${statusCfg.color} ${statusCfg.bg}`}
                      >
                        <StatusIcon size={10} />
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Content */}
                    {sub.content && (
                      <p className="text-sm text-gray-300 whitespace-pre-line">
                        {sub.content}
                      </p>
                    )}

                    {/* Links */}
                    {sub.links && sub.links.length > 0 && (
                      <div className="space-y-1">
                        {sub.links.map((link, i) => (
                          <a
                            key={i}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs text-[#D4A843] hover:text-[#B8922E] transition-colors"
                          >
                            <ExternalLink size={12} className="shrink-0" />
                            <span className="truncate">
                              {link.label || link.url}
                            </span>
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Feedback from instructor */}
                    {sub.feedback && (
                      <div
                        className="rounded-lg p-2.5 mt-2"
                        style={{
                          background: "rgba(212,168,67,0.06)",
                          border: "1px solid rgba(212,168,67,0.15)",
                        }}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <CheckCircle2
                            size={12}
                            className="text-[#D4A843]"
                          />
                          <span className="text-[10px] font-medium text-[#D4A843]">
                            Phản hồi từ giảng viên
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 whitespace-pre-line">
                          {sub.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
