"use client";

import TopBar from "@/components/layout/TopBar";
import { useState, useEffect } from "react";
import {
  Shield, Eye, EyeOff, Trash2, CheckCircle, AlertTriangle,
  Flag, Filter, Loader2, RefreshCw, MessageSquare,
} from "lucide-react";
import UserAvatar from "@/components/admin/UserAvatar";

interface Report {
  id: string;
  reason: string;
  status: string;
  reporter_id: string;
  created_at: string;
}

interface ModerationPost {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  status: string;
  flagged: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  } | null;
  post_reports: Report[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAvatarInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return fullName.slice(0, 2).toUpperCase();
}

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  inappropriate: "Không phù hợp",
  harassment: "Quấy rối",
  misinformation: "Thông tin sai",
  other: "Khác",
};

type FilterType = "all" | "reported" | "flagged" | "hidden";

export default function ModerationPage() {
  const [posts, setPosts] = useState<ModerationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [pendingReports, setPendingReports] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchPosts = async (f: FilterType = filter) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/community/moderation?filter=${f}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Lỗi tải dữ liệu");
      }
      const data = await res.json();
      setPosts(data.posts || []);
      setPendingReports(data.pendingReports ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (f: FilterType) => {
    setFilter(f);
    fetchPosts(f);
  };

  const handleAction = async (postId: string, action: string) => {
    setActionLoading(`${postId}-${action}`);
    setError(null);
    try {
      const res = await fetch("/api/community/moderation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, action }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Lỗi thực hiện hành động");
      }
      setSuccess(
        action === "hide" ? "Bài viết đã bị ẩn" :
        action === "unhide" ? "Bài viết đã hiện lại" :
        action === "delete" ? "Bài viết đã bị xoá" :
        "Báo cáo đã bị bỏ qua"
      );
      setTimeout(() => setSuccess(null), 3000);
      // Refresh list
      fetchPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi thực hiện hành động");
    } finally {
      setActionLoading(null);
    }
  };

  const filters: { key: FilterType; label: string; icon: typeof Shield }[] = [
    { key: "all", label: "Tất cả", icon: Shield },
    { key: "reported", label: "Bị báo cáo", icon: Flag },
    { key: "flagged", label: "Từ khoá nhạy cảm", icon: AlertTriangle },
    { key: "hidden", label: "Đã ẩn", icon: EyeOff },
  ];

  return (
    <div>
      <TopBar title="Kiểm duyệt cộng đồng" subtitle="Quản lý bài viết bị báo cáo và gắn cờ" />

      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card-dark p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">{pendingReports}</div>
            <div className="text-xs text-gray-400 mt-1">Báo cáo chờ xử lý</div>
          </div>
          <div className="card-dark p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {posts.filter(p => p.flagged).length}
            </div>
            <div className="text-xs text-gray-400 mt-1">Bài gắn cờ</div>
          </div>
          <div className="card-dark p-4 text-center">
            <div className="text-2xl font-bold text-red-400">
              {posts.filter(p => p.status === "hidden").length}
            </div>
            <div className="text-xs text-gray-400 mt-1">Bài đã ẩn</div>
          </div>
          <div className="card-dark p-4 text-center">
            <div className="text-2xl font-bold text-white">{posts.length}</div>
            <div className="text-xs text-gray-400 mt-1">Tổng cần xem</div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={16} className="text-gray-400" />
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => handleFilterChange(f.key)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                filter === f.key
                  ? "bg-[#D4A843] text-black font-medium"
                  : "bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
              }`}
            >
              <f.icon size={12} />
              {f.label}
            </button>
          ))}
          <button
            onClick={() => fetchPosts()}
            className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#2a2a2a] transition-colors"
          >
            <RefreshCw size={12} />
            Làm mới
          </button>
        </div>

        {/* Error/Success toasts */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 text-sm px-4 py-2.5 rounded-xl">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-900/50 border border-green-700 text-green-200 text-sm px-4 py-2.5 rounded-xl">
            {success}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="text-[#D4A843] animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && posts.length === 0 && (
          <div className="card-dark p-12 text-center">
            <Shield size={40} className="text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-1">Không có bài viết nào</h3>
            <p className="text-sm text-gray-400">Cộng đồng đang an toàn! Không có nội dung cần kiểm duyệt.</p>
          </div>
        )}

        {/* Posts list */}
        {!loading && posts.map(post => {
          const fullName = post.profiles?.full_name ?? "Thành viên";
          const initials = getAvatarInitials(fullName);
          const pendingPostReports = post.post_reports?.filter(r => r.status === "pending") ?? [];

          return (
            <div key={post.id} className="card-dark p-5 space-y-3">
              {/* Status badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {post.status === "hidden" && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-900/50 text-red-400 border border-red-800">
                    Đã ẩn
                  </span>
                )}
                {post.status === "deleted" && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-900/50 text-red-300 border border-red-800">
                    Đã xoá
                  </span>
                )}
                {post.flagged && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-900/50 text-yellow-400 border border-yellow-800">
                    <AlertTriangle size={10} className="inline mr-1" />
                    Từ khoá nhạy cảm
                  </span>
                )}
                {pendingPostReports.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-900/50 text-orange-400 border border-orange-800">
                    <Flag size={10} className="inline mr-1" />
                    {pendingPostReports.length} báo cáo
                  </span>
                )}
              </div>

              {/* Author */}
              <div className="flex items-center gap-3">
                <UserAvatar
                  src={post.profiles?.avatar_url}
                  initials={initials}
                  size={32}
                  gradient="linear-gradient(135deg, #3b82f6, #1d4ed8)"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-white">{fullName}</span>
                  <div className="text-xs text-gray-500">{formatDate(post.created_at)}</div>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <MessageSquare size={12} /> {post.comments_count}
                  </span>
                  <span>ID: {post.id.slice(0, 8)}</span>
                </div>
              </div>

              {/* Content */}
              <div className="bg-[#111] rounded-lg p-3 border border-[#2a2a2a]">
                <p className="text-sm text-gray-200 whitespace-pre-line leading-relaxed">
                  {post.content.length > 500 ? post.content.slice(0, 500) + "..." : post.content}
                </p>
              </div>

              {/* Reports */}
              {pendingPostReports.length > 0 && (
                <div className="bg-orange-950/30 rounded-lg p-3 border border-orange-900/50">
                  <div className="text-xs font-medium text-orange-400 mb-2">Báo cáo:</div>
                  <div className="space-y-1.5">
                    {pendingPostReports.map(report => (
                      <div key={report.id} className="flex items-center gap-2 text-xs text-gray-300">
                        <span className="px-1.5 py-0.5 rounded bg-orange-900/40 text-orange-300 text-[10px]">
                          {REASON_LABELS[report.reason] || report.reason}
                        </span>
                        <span className="text-gray-500">{formatDate(report.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-[#2a2a2a]">
                {post.status === "visible" && (
                  <button
                    onClick={() => handleAction(post.id, "hide")}
                    disabled={actionLoading === `${post.id}-hide`}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === `${post.id}-hide` ? <Loader2 size={12} className="animate-spin" /> : <EyeOff size={12} />}
                    Ẩn bài
                  </button>
                )}
                {post.status === "hidden" && (
                  <button
                    onClick={() => handleAction(post.id, "unhide")}
                    disabled={actionLoading === `${post.id}-unhide`}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-900/30 text-green-400 hover:bg-green-900/50 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === `${post.id}-unhide` ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
                    Hiện lại
                  </button>
                )}
                {post.status !== "deleted" && (
                  <button
                    onClick={() => handleAction(post.id, "delete")}
                    disabled={actionLoading === `${post.id}-delete`}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === `${post.id}-delete` ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    Xoá
                  </button>
                )}
                {pendingPostReports.length > 0 && (
                  <button
                    onClick={() => handleAction(post.id, "dismiss_reports")}
                    disabled={actionLoading === `${post.id}-dismiss_reports`}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#2a2a2a] text-gray-300 hover:bg-[#333] transition-colors disabled:opacity-50"
                  >
                    {actionLoading === `${post.id}-dismiss_reports` ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                    Bỏ qua báo cáo
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
