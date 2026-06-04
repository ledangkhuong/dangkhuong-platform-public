"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageSquare, Send, Loader2, MessageCircle } from "lucide-react";
import UserAvatar from "@/components/admin/UserAvatar";

interface DiscussionPost {
  id: string;
  content: string;
  created_at: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    level: number;
    tier: string;
  };
}

interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    level: number;
  } | null;
}

interface CourseDiscussionProps {
  productId: string;
  productTitle: string;
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

function formatDate(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

export default function CourseDiscussion({
  productId,
  productTitle,
}: CourseDiscussionProps) {
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // Comments
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<
    Record<string, boolean>
  >({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [commentPosting, setCommentPosting] = useState<
    Record<string, boolean>
  >({});

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/community/posts?product_id=${productId}&limit=50`
      );
      const data = await res.json();
      if (data.posts) setPosts(data.posts);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    setPostError(null);
    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          product_id: productId,
          category: "discussion",
        }),
      });

      const data = await res.json();
      if (res.ok && data.post) {
        setPosts((prev) => [data.post, ...prev]);
        setContent("");
      } else {
        setPostError(data.error || "Đăng bài thất bại. Vui lòng thử lại.");
      }
    } catch {
      setPostError("Đăng bài thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  const fetchComments = async (postId: string) => {
    setCommentsLoading((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch(`/api/community/comments?post_id=${postId}`);
      const data = await res.json();
      setCommentsMap((prev) => ({ ...prev, [postId]: data.comments || [] }));
    } catch {
      setCommentsMap((prev) => ({ ...prev, [postId]: [] }));
    } finally {
      setCommentsLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const toggleComments = (postId: string) => {
    if (openComments === postId) {
      setOpenComments(null);
    } else {
      setOpenComments(postId);
      if (!commentsMap[postId]) {
        fetchComments(postId);
      }
    }
  };

  const handleCommentSubmit = async (postId: string) => {
    const text = (commentText[postId] || "").trim();
    if (!text || commentPosting[postId]) return;
    setCommentPosting((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch("/api/community/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, content: text }),
      });
      const data = await res.json();
      if (data.comment) {
        setCommentsMap((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data.comment],
        }));
        setCommentText((prev) => ({ ...prev, [postId]: "" }));
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, comments_count: (p.comments_count ?? 0) + 1 }
              : p
          )
        );
      }
    } catch {
      // silently fail
    } finally {
      setCommentPosting((prev) => ({ ...prev, [postId]: false }));
    }
  };

  return (
    <div className="card-dark p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={18} className="text-[#D4A843]" />
        <h3 className="text-sm font-bold text-white">
          Thảo luận &mdash; {productTitle}
        </h3>
        <span className="text-xs text-gray-500 ml-auto">
          {posts.length} bài viết
        </span>
      </div>

      {/* New post form */}
      <form onSubmit={handleSubmit} className="mb-5">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Chia sẻ câu hỏi hoặc thảo luận với các học viên khác..."
          rows={3}
          className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl p-3 text-sm text-white placeholder:text-gray-500 resize-none focus:outline-none focus:border-[#D4A843] transition-colors"
          maxLength={5000}
        />
        {postError && (
          <p className="mt-1 text-xs text-red-400">{postError}</p>
        )}
        <div className="flex justify-end mt-2">
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className={`btn-green text-sm py-1.5 px-4 inline-flex items-center gap-1.5 ${
              submitting || !content.trim()
                ? "opacity-40 cursor-not-allowed"
                : ""
            }`}
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            Đăng bài
          </button>
        </div>
      </form>

      {/* Posts list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-[#2a2a2a]" />
              <div className="flex-1">
                <div className="h-3 bg-[#2a2a2a] rounded w-1/4 mb-2" />
                <div className="h-4 bg-[#2a2a2a] rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare size={28} className="text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            Chưa có bài viết nào. Hãy là người đầu tiên!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const authorName = post.profiles?.full_name || "Thành viên";
            const initials = getInitials(post.profiles?.full_name ?? null);
            const isVip = post.profiles?.tier === "vip";

            return (
              <div
                key={post.id}
                className="rounded-xl p-4"
                style={{ background: "#161616", border: "1px solid #222" }}
              >
                {/* Author */}
                <div className="flex items-center gap-3 mb-2">
                  <UserAvatar
                    src={post.profiles?.avatar_url}
                    initials={initials}
                    size={36}
                    gradient={
                      isVip
                        ? "linear-gradient(135deg, #D4A843, #059669)"
                        : "linear-gradient(135deg, #3b82f6, #1d4ed8)"
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {authorName}
                      </span>
                      {isVip && (
                        <span className="badge-gold text-[10px]">VIP</span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-500">
                      {formatDate(post.created_at)}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <p className="text-sm text-gray-300 whitespace-pre-wrap break-words leading-relaxed mb-2">
                  {post.content}
                </p>

                {/* Image */}
                {post.image_url && (
                  <div className="mb-2 rounded-lg overflow-hidden">
                    <img
                      src={post.image_url}
                      alt=""
                      className="w-full h-auto max-h-80 object-cover rounded-lg"
                    />
                  </div>
                )}

                {/* Comment toggle */}
                <div className="pt-2 border-t border-[#2a2a2a]">
                  <button
                    onClick={() => toggleComments(post.id)}
                    className={`flex items-center gap-1.5 text-xs transition-colors ${
                      openComments === post.id
                        ? "text-[#D4A843]"
                        : "text-gray-500 hover:text-[#D4A843]"
                    }`}
                  >
                    <MessageCircle size={13} />
                    <span>
                      {post.comments_count ?? 0} bình luận
                    </span>
                  </button>
                </div>

                {/* Comments section */}
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    maxHeight: openComments === post.id ? "500px" : "0px",
                    opacity: openComments === post.id ? 1 : 0,
                  }}
                >
                  <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
                    {/* Loading */}
                    {commentsLoading[post.id] && (
                      <div className="flex items-center gap-2 py-3 justify-center">
                        <div className="w-4 h-4 border-2 border-[#D4A843] border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-gray-500">
                          Đang tải...
                        </span>
                      </div>
                    )}

                    {/* Comment list */}
                    {!commentsLoading[post.id] && (
                      <div className="max-h-[240px] overflow-y-auto space-y-2.5">
                        {(commentsMap[post.id] || []).length === 0 ? (
                          <p className="text-xs text-gray-500 text-center py-2">
                            Chưa có bình luận
                          </p>
                        ) : (
                          (commentsMap[post.id] || []).map((comment) => {
                            const cName =
                              comment.profiles?.full_name ?? "Thành viên";
                            const cInitials = getInitials(cName);
                            return (
                              <div key={comment.id} className="flex gap-2">
                                <UserAvatar
                                  src={comment.profiles?.avatar_url}
                                  initials={cInitials}
                                  size={24}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-white">
                                      {cName}
                                    </span>
                                    <span className="text-[10px] text-gray-500">
                                      {formatDate(comment.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-300 leading-relaxed mt-0.5 break-words">
                                    {comment.content}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* Comment input */}
                    <div className="flex gap-2 mt-3 pt-2 border-t border-[#2a2a2a]">
                      <input
                        type="text"
                        value={commentText[post.id] || ""}
                        onChange={(e) =>
                          setCommentText((prev) => ({
                            ...prev,
                            [post.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleCommentSubmit(post.id);
                          }
                        }}
                        placeholder="Viết bình luận..."
                        className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#D4A843] transition-colors"
                      />
                      <button
                        onClick={() => handleCommentSubmit(post.id)}
                        disabled={
                          !(commentText[post.id] || "").trim() ||
                          commentPosting[post.id]
                        }
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                          (commentText[post.id] || "").trim() &&
                          !commentPosting[post.id]
                            ? "bg-[#D4A843] text-black hover:bg-[#c49a3a]"
                            : "bg-[#2a2a2a] text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        {commentPosting[post.id] ? "..." : "Gửi"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
