"use client";

import TopBar from "@/components/layout/TopBar";
import { useState, useEffect, useRef } from "react";
import NextImage from "next/image";
import { Heart, MessageCircle, Share2, Image, Link2, Smile, Trophy, Star, Flame, TrendingUp, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Post {
  id: string;
  user_id: string;
  content: string;
  tags: string[] | null;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  pinned: boolean;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    level: number;
    tier: string;
  } | null;
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

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  xp: number;
  level: number;
  tier: string;
  streak: number;
}

interface LeaderboardEntry {
  id: string;
  full_name: string;
  avatar_url: string | null;
  xp: number;
  level: number;
}

const LEVEL_TITLES: Record<number, string> = {
  1: "Người Mới",
  2: "Người Mới",
  3: "Học Viên",
  4: "Học Viên",
  5: "Người Học Chăm",
  6: "Học Viên Tích Cực",
  7: "Học Viên Tích Cực",
  8: "Học Viên VIP",
  9: "Học Giả",
  10: "Học Giả",
  11: "Chuyên Gia",
  12: "Chuyên Gia",
};

function levelTitle(level: number) {
  return LEVEL_TITLES[Math.min(level, 12)] ?? "Chuyên Gia";
}

function rankBadge(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  if (rank <= 5) return "⭐";
  return "🔥";
}

// XP needed per level (simple formula: level * 200)
function xpForLevel(level: number) {
  return level * 200;
}

function getAvatarInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return fullName.slice(0, 2).toUpperCase();
}

function formatCreatedAt(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [postError, setPostError] = useState<string | null>(null);
  const [likeError, setLikeError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [commentPosting, setCommentPosting] = useState<Record<string, boolean>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = "";

    // Client-side validation
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setPostError("Chỉ chấp nhận ảnh JPEG, PNG, GIF, WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPostError("Ảnh quá lớn. Tối đa 5MB.");
      return;
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);
    setUploading(true);
    setPostError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/community-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }
      setImageUrl(data.url);
    } catch (err) {
      setImagePreview(null);
      setImageUrl(null);
      setPostError(err instanceof Error ? err.message : "Tải ảnh lên thất bại.");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageUrl(null);
  };

  const COMMON_EMOJIS = ["😀", "😂", "😍", "🥰", "😎", "🤔", "👍", "👏", "🙌", "❤️", "🔥", "💯", "🎉", "✨", "🚀", "💪", "🌟", "😊", "🤩", "💡"];

  const insertAtCursor = (text: string) => {
    const el = textareaRef.current;
    if (!el) {
      setPostText(prev => prev + text);
      return;
    }
    const start = el.selectionStart ?? postText.length;
    const end = el.selectionEnd ?? postText.length;
    const next = postText.slice(0, start) + text + postText.slice(end);
    setPostText(next);
    // Restore focus and move cursor after inserted text
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const handleEmojiClick = (emoji: string) => {
    insertAtCursor(emoji);
    setShowEmojiPicker(false);
  };

  const handleLinkInsert = () => {
    const url = window.prompt("Nhập URL:");
    if (!url || !url.trim()) return;
    insertAtCursor(`[link](${url.trim()})`);
  };

  useEffect(() => {
    fetch("/api/community/posts?limit=20")
      .then(r => r.json())
      .then(d => { setPosts(d.posts || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    async function fetchSidebarData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, xp, level, tier, streak")
          .eq("id", user.id)
          .single();
        if (profile) setMyProfile(profile as UserProfile);
      }

      const { data: topUsers } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, xp, level")
        .order("xp", { ascending: false })
        .limit(5);
      if (topUsers) setLeaderboard(topUsers as LeaderboardEntry[]);
    }
    fetchSidebarData();
  }, []);

  const handleLike = async (postId: string) => {
    const wasLiked = likedPosts.has(postId);
    setLikedPosts(prev => {
      const next = new Set(prev);
      wasLiked ? next.delete(postId) : next.add(postId);
      return next;
    });
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, likes_count: p.likes_count + (wasLiked ? -1 : 1) }
      : p
    ));
    await fetch("/api/community/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: postId }),
    }).catch(() => {
      setLikedPosts(prev => {
        const next = new Set(prev);
        wasLiked ? next.add(postId) : next.delete(postId);
        return next;
      });
      setPosts(prev => prev.map(p => p.id === postId
        ? { ...p, likes_count: p.likes_count + (wasLiked ? 1 : -1) }
        : p
      ));
      setLikeError("Không thể thực hiện hành động này. Vui lòng thử lại.");
      setTimeout(() => setLikeError(null), 3000);
    });
  };

  const handlePost = async () => {
    if (!postText.trim() || posting || uploading) return;
    setPosting(true);
    setPostError(null);
    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: postText.trim(), tags, image_url: imageUrl || undefined }),
      });
      const data = await res.json();
      if (data.post) {
        setPosts(prev => [data.post, ...prev]);
        setPostText("");
        setTags([]);
        removeImage();
        setPostError(null);
      } else {
        setPostError("Đăng bài thất bại. Vui lòng thử lại.");
      }
    } catch {
      setPostError("Đăng bài thất bại. Vui lòng thử lại.");
    } finally {
      setPosting(false);
    }
  };

  const fetchComments = async (postId: string) => {
    setCommentsLoading(prev => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch(`/api/community/comments?post_id=${postId}`);
      const data = await res.json();
      setCommentsMap(prev => ({ ...prev, [postId]: data.comments || [] }));
    } catch {
      setCommentsMap(prev => ({ ...prev, [postId]: [] }));
    } finally {
      setCommentsLoading(prev => ({ ...prev, [postId]: false }));
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
    setCommentPosting(prev => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch("/api/community/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, content: text }),
      });
      const data = await res.json();
      if (data.comment) {
        setCommentsMap(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data.comment],
        }));
        setCommentText(prev => ({ ...prev, [postId]: "" }));
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
        ));
      }
    } catch {
      // silently fail
    } finally {
      setCommentPosting(prev => ({ ...prev, [postId]: false }));
    }
  };

  return (
    <div>
      <TopBar title="Cộng đồng" subtitle="Kết nối, học hỏi và phát triển cùng nhau" />

      <div className="flex gap-0">
        {/* Main Feed */}
        <div className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto space-y-4">

          {/* Create Post */}
          <div className="card-dark p-4">
            <div className="flex gap-3 mb-3">
              {myProfile?.avatar_url ? (
                <NextImage src={myProfile.avatar_url} alt={myProfile.full_name} width={36} height={36} className="w-9 h-9 rounded-full object-cover shrink-0" unoptimized />
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: "linear-gradient(135deg, #D4A843, #059669)" }}>
                  {myProfile ? getAvatarInitials(myProfile.full_name) : "??"}
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={postText}
                onChange={e => setPostText(e.target.value)}
                placeholder="Chia sẻ học hỏi, thắc mắc hay thành tích của bạn..."
                className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-xl p-3 text-sm text-white placeholder:text-gray-600 resize-none focus:outline-none focus:border-[#D4A843] transition-colors"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-2 relative">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                {/* Image button */}
                <button
                  onClick={() => { fileInputRef.current?.click(); setShowEmojiPicker(false); }}
                  disabled={uploading || !!imageUrl}
                  className={`p-2 rounded-lg transition-colors ${imageUrl ? "text-[#D4A843] bg-white/5" : "text-gray-500 hover:text-white hover:bg-white/5"} ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
                  title="Hình ảnh">
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Image size={16} />}
                </button>

                {/* Link button */}
                <button
                  onClick={handleLinkInsert}
                  className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                  title="Chèn link">
                  <Link2 size={16} />
                </button>

                {/* Emoji button + picker */}
                <div className="relative">
                  <button
                    onClick={() => setShowEmojiPicker(v => !v)}
                    className={`p-2 rounded-lg transition-colors ${showEmojiPicker ? "text-[#D4A843] bg-white/5" : "text-gray-500 hover:text-white hover:bg-white/5"}`}
                    title="Emoji">
                    <Smile size={16} />
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute left-0 bottom-full mb-2 z-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-2 shadow-lg">
                      <div className="grid grid-cols-5 gap-1">
                        {COMMON_EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => handleEmojiClick(emoji)}
                            className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-white/10 transition-colors">
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={handlePost}
                disabled={!postText.trim() || posting || uploading}
                className={`btn-green text-sm py-1.5 px-4 ${(!postText.trim() || posting || uploading) ? "opacity-40 cursor-not-allowed" : ""}`}>
                {posting ? "Đang đăng..." : "Đăng bài"}
              </button>
            </div>
            {/* Image preview */}
            {imagePreview && (
              <div className="mt-3 relative inline-block">
                <NextImage
                  src={imagePreview}
                  alt="Preview"
                  width={200}
                  height={200}
                  className="rounded-xl object-cover max-h-48 w-auto"
                  unoptimized
                />
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                    <Loader2 size={24} className="text-white animate-spin" />
                  </div>
                )}
                {!uploading && (
                  <button
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center bg-red-600 hover:bg-red-500 text-white rounded-full transition-colors shadow-lg"
                    title="Xoá ảnh">
                    <X size={14} />
                  </button>
                )}
              </div>
            )}
            {postError && (
              <p className="mt-2 text-xs text-red-400">{postError}</p>
            )}
          </div>

          {/* Like error toast */}
          {likeError && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-700 text-red-200 text-sm px-4 py-2.5 rounded-xl shadow-lg pointer-events-none">
              {likeError}
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="card-dark p-5 animate-pulse">
                  <div className="flex gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-[#2a2a2a]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-[#2a2a2a] rounded w-1/4" />
                      <div className="h-2 bg-[#2a2a2a] rounded w-1/6" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-[#2a2a2a] rounded" />
                    <div className="h-3 bg-[#2a2a2a] rounded w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Posts */}
          {!loading && posts.map((post) => {
            const fullName = post.profiles?.full_name ?? "Thành viên";
            const initials = getAvatarInitials(fullName);
            const isVip = post.profiles?.tier === "vip";
            const isLiked = likedPosts.has(post.id);

            return (
              <div key={post.id} className={`card-dark p-5 ${post.pinned ? "border-l-2 border-[#D4A843]" : ""}`}>
                {post.pinned && (
                  <div className="flex items-center gap-1.5 mb-3 text-xs text-[#D4A843]">
                    <Star size={12} /> <span>Bài ghim</span>
                  </div>
                )}
                {/* Author */}
                <div className="flex items-center gap-3 mb-3">
                  {post.profiles?.avatar_url ? (
                    <NextImage src={post.profiles.avatar_url} alt={fullName} width={36} height={36} className="w-9 h-9 rounded-full object-cover shrink-0" unoptimized />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: isVip ? "linear-gradient(135deg, #D4A843, #059669)" : "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}>
                      {initials}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{fullName}</span>
                      {isVip && <span className="badge-gold text-[10px]">VIP</span>}
                    </div>
                    <span className="text-xs text-gray-500">{formatCreatedAt(post.created_at)}</span>
                  </div>
                </div>

                {/* Content */}
                <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line mb-3">{post.content}</p>

                {/* Post Image */}
                {post.image_url && (
                  <div className="mb-3 rounded-xl overflow-hidden">
                    <NextImage
                      src={post.image_url}
                      alt="Post image"
                      width={600}
                      height={400}
                      className="w-full h-auto max-h-96 object-cover rounded-xl"
                      unoptimized
                    />
                  </div>
                )}

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex gap-1.5 mb-3 flex-wrap">
                    {post.tags.map(tag => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full text-[#D4A843] cursor-pointer"
                        style={{ background: "rgba(212,168,67,0.1)" }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Reactions */}
                <div className="flex items-center gap-4 pt-3 border-t border-[#2a2a2a]">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-1.5 text-sm transition-colors ${isLiked ? "text-red-400" : "text-gray-500 hover:text-red-400"}`}>
                    <Heart size={15} fill={isLiked ? "currentColor" : "none"} />
                    <span>{post.likes_count}</span>
                  </button>
                  <button
                    onClick={() => toggleComments(post.id)}
                    className={`flex items-center gap-1.5 text-sm transition-colors ${openComments === post.id ? "text-[#D4A843]" : "text-gray-500 hover:text-[#D4A843]"}`}>
                    <MessageCircle size={15} /> <span>{post.comments_count}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-400 transition-colors">
                    <Share2 size={15} />
                  </button>
                </div>

                {/* Comment Section */}
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    maxHeight: openComments === post.id ? "600px" : "0px",
                    opacity: openComments === post.id ? 1 : 0,
                  }}
                >
                  <div className="mt-3 pt-3 border-t border-[#2a2a2a] bg-[#161616] rounded-lg p-3">
                    {/* Loading */}
                    {commentsLoading[post.id] && (
                      <div className="flex items-center gap-2 py-4 justify-center">
                        <div className="w-4 h-4 border-2 border-[#D4A843] border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-gray-500">Đang tải bình luận...</span>
                      </div>
                    )}

                    {/* Comments list */}
                    {!commentsLoading[post.id] && (
                      <div className="max-h-[280px] overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-[#2a2a2a] scrollbar-track-transparent">
                        {(commentsMap[post.id] || []).length === 0 ? (
                          <p className="text-xs text-gray-600 text-center py-3">Chưa có bình luận nào</p>
                        ) : (
                          (commentsMap[post.id] || []).map(comment => {
                            const cName = comment.profiles?.full_name ?? "Thành viên";
                            const cInitials = getAvatarInitials(cName);
                            return (
                              <div key={comment.id} className="flex gap-2">
                                {comment.profiles?.avatar_url ? (
                                  <NextImage
                                    src={comment.profiles.avatar_url}
                                    alt={cName}
                                    width={24}
                                    height={24}
                                    className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                                    unoptimized
                                  />
                                ) : (
                                  <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0 mt-0.5"
                                    style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}
                                  >
                                    {cInitials}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-white">{cName}</span>
                                    <span className="text-[10px] text-gray-600">{formatCreatedAt(comment.created_at)}</span>
                                  </div>
                                  <p className="text-xs text-gray-300 leading-relaxed mt-0.5 break-words">{comment.content}</p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* Comment input */}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-[#2a2a2a]">
                      <input
                        type="text"
                        value={commentText[post.id] || ""}
                        onChange={e => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleCommentSubmit(post.id); } }}
                        placeholder="Viết bình luận..."
                        className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-[#D4A843] transition-colors"
                      />
                      <button
                        onClick={() => handleCommentSubmit(post.id)}
                        disabled={!(commentText[post.id] || "").trim() || commentPosting[post.id]}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                          (commentText[post.id] || "").trim() && !commentPosting[post.id]
                            ? "bg-[#D4A843] text-black hover:bg-[#c49a3a]"
                            : "bg-[#2a2a2a] text-gray-600 cursor-not-allowed"
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

        {/* Right Sidebar */}
        <aside className="hidden xl:block w-72 p-4 border-l border-[#1f1f1f] shrink-0 space-y-4" style={{ background: "#0d0d0d" }}>
          {/* XP Card */}
          <div className="card-dark p-4">
            <div className="flex items-center gap-2 mb-3">
              <Flame size={15} className="text-[#f59e0b]" />
              <span className="text-sm font-semibold text-white">XP của bạn</span>
            </div>
            {myProfile ? (
              <>
                <div className="text-2xl font-bold text-[#D4A843] mb-1">{myProfile.xp.toLocaleString()} XP</div>
                <div className="text-xs text-gray-500 mb-2">Level {myProfile.level} — {levelTitle(myProfile.level)}</div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min(100, Math.round(((myProfile.xp - (myProfile.level - 1) * 200) / 200) * 100))}%` }} />
                </div>
                <div className="text-xs text-gray-600 mt-1">{Math.max(0, myProfile.level * 200 - myProfile.xp)} XP để lên Level {myProfile.level + 1}</div>
              </>
            ) : (
              <div className="space-y-2 animate-pulse">
                <div className="h-6 bg-[#2a2a2a] rounded w-24" />
                <div className="h-3 bg-[#2a2a2a] rounded w-32" />
                <div className="h-2 bg-[#2a2a2a] rounded" />
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div className="card-dark p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={15} className="text-[#f59e0b]" />
              <span className="text-sm font-semibold text-white">Top tuần này</span>
            </div>
            <div className="space-y-2">
              {leaderboard.length === 0 ? (
                <div className="space-y-2 animate-pulse">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center gap-2.5 p-2">
                      <div className="w-5 h-5 bg-[#2a2a2a] rounded" />
                      <div className="w-7 h-7 bg-[#2a2a2a] rounded-full" />
                      <div className="flex-1 h-3 bg-[#2a2a2a] rounded" />
                    </div>
                  ))}
                </div>
              ) : (
                leaderboard.map((user, index) => {
                  const rank = index + 1;
                  const isMe = myProfile?.id === user.id;
                  return (
                    <div key={user.id}
                      className={`flex items-center gap-2.5 p-2 rounded-lg ${isMe ? "bg-[#D4A843]/10" : "hover:bg-white/3"} transition-colors`}>
                      <span className="text-sm">{rankBadge(rank)}</span>
                      {user.avatar_url ? (
                        <NextImage src={user.avatar_url} alt={user.full_name} width={28} height={28} className="w-7 h-7 rounded-full object-cover" unoptimized />
                      ) : (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ background: isMe ? "linear-gradient(135deg,#D4A843,#059669)" : "linear-gradient(135deg,#3b82f6,#1d4ed8)" }}>
                          {getAvatarInitials(user.full_name)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-medium truncate ${isMe ? "text-[#D4A843]" : "text-white"}`}>
                          {isMe ? "Bạn" : user.full_name}
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-500">{user.xp.toLocaleString()} XP</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Weekly Challenge */}
          <div className="card-dark p-4 border border-[#D4A843]/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={15} className="text-[#D4A843]" />
              <span className="text-sm font-semibold text-white">Thử thách tuần</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">Học 5 bài trong 7 ngày để nhận <strong className="text-[#f59e0b]">badge đặc biệt</strong> và 500 XP</p>
            <div className="flex gap-1 mb-2">
              {[1, 2, 3, 4, 5].map(d => (
                <div key={d} className="flex-1 h-6 rounded flex items-center justify-center text-xs"
                  style={{ background: d <= Math.min((myProfile?.streak ?? 0), 5) ? "#D4A843" : "#2a2a2a", color: d <= Math.min((myProfile?.streak ?? 0), 5) ? "white" : "#444" }}>
                  {d <= Math.min((myProfile?.streak ?? 0), 5) ? "✓" : d}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-600">{Math.min((myProfile?.streak ?? 0), 5)}/5 ngày hoàn thành</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
