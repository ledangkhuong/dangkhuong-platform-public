"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  MessageSquare,
  Send,
  Loader2,
  Reply,
  ChevronDown,
  ChevronUp,
  Pin,
  CheckCircle2,
} from "lucide-react";
import UserAvatarBase from "@/components/admin/UserAvatar";

/* ---------- Types ---------- */

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  level: number | null;
  tier: string | null;
}

interface Discussion {
  id: string;
  lesson_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  is_pinned: boolean;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
  profiles: Profile | null;
  reply_count?: number;
}

interface LessonDiscussionProps {
  lessonId: string;
}

/* ---------- Helpers ---------- */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  return `${months} tháng trước`;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();
}

function getLevelBadge(level: number | null): string | null {
  if (!level || level < 2) return null;
  if (level < 5) return "Lv." + level;
  if (level < 10) return "Lv." + level;
  return "Lv." + level;
}

function getLevelColor(level: number | null): string {
  if (!level || level < 5) return "#6b7280";
  if (level < 10) return "#3b82f6";
  if (level < 20) return "#8b5cf6";
  return "#D4A843";
}

/* ---------- Avatar component ---------- */

function UserAvatar({
  profile,
  size = 32,
}: {
  profile: Profile | null;
  size?: number;
}) {
  return (
    <UserAvatarBase
      src={profile?.avatar_url}
      initials={getInitials(profile?.full_name ?? null)}
      size={size}
      gradient="linear-gradient(135deg, #D4A843, #b8912e)"
    />
  );
}

/* ---------- Single reply component ---------- */

function ReplyItem({ reply }: { reply: Discussion }) {
  return (
    <div className="flex items-start gap-2.5 py-2.5">
      <UserAvatar profile={reply.profiles} size={24} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-[#f5f5f5]">
            {reply.profiles?.full_name ?? "Thành viên"}
          </span>
          {reply.profiles?.level != null && getLevelBadge(reply.profiles.level) && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{
                color: getLevelColor(reply.profiles.level),
                background: getLevelColor(reply.profiles.level) + "18",
              }}
            >
              {getLevelBadge(reply.profiles.level)}
            </span>
          )}
          <span className="text-[10px] text-gray-500">
            {timeAgo(reply.created_at)}
          </span>
        </div>
        <p className="text-sm text-gray-300 whitespace-pre-line break-words">
          {reply.content}
        </p>
      </div>
    </div>
  );
}

/* ---------- Single discussion thread ---------- */

function DiscussionThread({
  discussion,
  lessonId,
  onRefresh,
}: {
  discussion: Discussion;
  lessonId: string;
  onRefresh: () => void;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<Discussion[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchReplies = useCallback(async () => {
    setLoadingReplies(true);
    try {
      const res = await fetch(
        `/api/lessons/${lessonId}/discussions?parent_id=${discussion.id}`
      );
      if (res.ok) {
        const json = await res.json();
        setReplies(json.discussions ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoadingReplies(false);
    }
  }, [lessonId, discussion.id]);

  const handleToggleReplies = () => {
    if (!showReplies && replies.length === 0) {
      fetchReplies();
    }
    setShowReplies(!showReplies);
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    setSubmittingReply(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/discussions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyContent.trim(),
          parent_id: discussion.id,
        }),
      });

      if (res.ok) {
        setReplyContent("");
        setShowReplyBox(false);
        setShowReplies(true);
        fetchReplies();
        onRefresh();
      }
    } catch {
      // silent
    } finally {
      setSubmittingReply(false);
    }
  };

  const replyCount = discussion.reply_count ?? 0;

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: "#161616", border: "1px solid #222" }}
    >
      {/* Main discussion */}
      <div className="flex items-start gap-3">
        <UserAvatar profile={discussion.profiles} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-[#f5f5f5]">
              {discussion.profiles?.full_name ?? "Thành viên"}
            </span>
            {discussion.profiles?.level != null &&
              getLevelBadge(discussion.profiles.level) && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                  style={{
                    color: getLevelColor(discussion.profiles.level),
                    background:
                      getLevelColor(discussion.profiles.level) + "18",
                  }}
                >
                  {getLevelBadge(discussion.profiles.level)}
                </span>
              )}
            <span className="text-[10px] text-gray-500">
              {timeAgo(discussion.created_at)}
            </span>
            {discussion.is_pinned && (
              <Pin size={10} className="text-[#D4A843]" />
            )}
            {discussion.is_resolved && (
              <CheckCircle2 size={12} className="text-[#22c55e]" />
            )}
          </div>
          <p className="text-sm text-gray-300 whitespace-pre-line break-words leading-relaxed">
            {discussion.content}
          </p>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-4 ml-12">
        <button
          onClick={() => setShowReplyBox(!showReplyBox)}
          className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-[#D4A843] transition-colors"
        >
          <Reply size={12} />
          Trả lời
        </button>

        {replyCount > 0 && (
          <button
            onClick={handleToggleReplies}
            className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-[#D4A843] transition-colors"
          >
            {showReplies ? (
              <ChevronUp size={12} />
            ) : (
              <ChevronDown size={12} />
            )}
            {replyCount} phản hồi
          </button>
        )}
      </div>

      {/* Reply compose box */}
      {showReplyBox && (
        <form onSubmit={handleSubmitReply} className="ml-12 space-y-2">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Viết phản hồi..."
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] placeholder-gray-600 focus:outline-none focus:border-[#D4A843]/50 resize-none transition-colors"
            rows={2}
            maxLength={5000}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowReplyBox(false);
                setReplyContent("");
              }}
              className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submittingReply || !replyContent.trim()}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#D4A843] text-black hover:bg-[#c49a3a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submittingReply ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Send size={12} />
              )}
              Gửi
            </button>
          </div>
        </form>
      )}

      {/* Replies list */}
      {showReplies && (
        <div className="ml-12 border-l-2 border-[#2a2a2a] pl-3">
          {loadingReplies ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={16} className="animate-spin text-gray-500" />
            </div>
          ) : replies.length === 0 ? (
            <p className="text-xs text-gray-500 py-2">
              Chưa có phản hồi nào.
            </p>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {replies.map((reply) => (
                <ReplyItem key={reply.id} reply={reply} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Main component ---------- */

export default function LessonDiscussion({ lessonId }: LessonDiscussionProps) {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiscussions = useCallback(async () => {
    try {
      const res = await fetch(`/api/lessons/${lessonId}/discussions`);
      if (res.ok) {
        const json = await res.json();
        setDiscussions(json.discussions ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    fetchDiscussions();
  }, [fetchDiscussions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/lessons/${lessonId}/discussions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });

      const json = await res.json();

      if (res.ok) {
        setContent("");
        fetchDiscussions();
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
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "#111", border: "1px solid #1e1e1e" }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <MessageSquare size={16} className="text-[#D4A843]" />
          <h3 className="font-semibold text-[#f5f5f5] text-sm">
            Thảo luận bài học
          </h3>
          {discussions.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#D4A843]/15 text-[#D4A843] font-medium">
              {discussions.length}
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
          {/* Compose box */}
          <form onSubmit={handleSubmit} className="space-y-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Đặt câu hỏi hoặc chia sẻ ý kiến về bài học này..."
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-[#f5f5f5] placeholder-gray-600 focus:outline-none focus:border-[#D4A843]/50 resize-none transition-colors"
              rows={3}
              maxLength={5000}
            />
            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-gray-500">
                {content.length > 0 && `${content.length}/5000`}
              </p>
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg bg-[#D4A843] text-black hover:bg-[#c49a3a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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

          {/* Discussions list */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-gray-500" />
            </div>
          ) : discussions.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare
                size={32}
                className="mx-auto mb-3 text-gray-700"
              />
              <p className="text-sm text-gray-500">
                Chưa có câu hỏi nào. Hãy là người đầu tiên!
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {discussions.map((d) => (
                <DiscussionThread
                  key={d.id}
                  discussion={d}
                  lessonId={lessonId}
                  onRefresh={fetchDiscussions}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
