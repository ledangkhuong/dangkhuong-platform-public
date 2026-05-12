"use client";

import TopBar from "@/components/layout/TopBar";
import { useState, useEffect } from "react";
import { Heart, MessageCircle, Share2, Image, Link2, Smile, Trophy, Star, Flame, TrendingUp } from "lucide-react";
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
    });
  };

  const handlePost = async () => {
    if (!postText.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: postText.trim(), tags }),
      });
      const data = await res.json();
      if (data.post) {
        setPosts(prev => [data.post, ...prev]);
        setPostText("");
        setTags([]);
      }
    } finally {
      setPosting(false);
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
                <img src={myProfile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: "linear-gradient(135deg, #D4A843, #059669)" }}>
                  {myProfile ? getAvatarInitials(myProfile.full_name) : "??"}
                </div>
              )}
              <textarea
                value={postText}
                onChange={e => setPostText(e.target.value)}
                placeholder="Chia sẻ học hỏi, thắc mắc hay thành tích của bạn..."
                className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-xl p-3 text-sm text-white placeholder:text-gray-600 resize-none focus:outline-none focus:border-[#D4A843] transition-colors"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"><Image size={16} /></button>
                <button className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"><Link2 size={16} /></button>
                <button className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"><Smile size={16} /></button>
              </div>
              <button
                onClick={handlePost}
                disabled={!postText.trim() || posting}
                className={`btn-green text-sm py-1.5 px-4 ${(!postText.trim() || posting) ? "opacity-40 cursor-not-allowed" : ""}`}>
                {posting ? "Đang đăng..." : "Đăng bài"}
              </button>
            </div>
          </div>

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
                    <img src={post.profiles.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
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
                  <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#D4A843] transition-colors">
                    <MessageCircle size={15} /> <span>{post.comments_count}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-400 transition-colors">
                    <Share2 size={15} />
                  </button>
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
                  <div className="progress-fill" style={{ width: `${Math.min(100, (myProfile.xp % xpForLevel(myProfile.level)) / xpForLevel(myProfile.level) * 100)}%` }} />
                </div>
                <div className="text-xs text-gray-600 mt-1">{xpForLevel(myProfile.level) - (myProfile.xp % xpForLevel(myProfile.level))} XP để lên Level {myProfile.level + 1}</div>
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
                        <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
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
                  style={{ background: d <= 2 ? "#D4A843" : "#2a2a2a", color: d <= 2 ? "white" : "#444" }}>
                  {d <= 2 ? "✓" : d}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-600">2/5 ngày hoàn thành</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
