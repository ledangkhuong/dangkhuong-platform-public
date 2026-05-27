"use client";

import TopBar from "@/components/layout/TopBar";
import { useEffect, useState, useCallback } from "react";
import {
  Bell,
  BookOpen,
  Trophy,
  MessageCircle,
  CheckCheck,
  Heart,
  Megaphone,
  Filter,
  ChevronDown,
  ExternalLink,
  Clock,
} from "lucide-react";

type NotificationType = "achievement" | "community" | "system" | "welcome" | "course" | "like" | "announcement" | string;

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  created_at: string;
  is_broadcast?: boolean;
}

const TYPE_ICON: Record<string, typeof Bell> = {
  system: Bell,
  achievement: Trophy,
  course: BookOpen,
  community: MessageCircle,
  like: Heart,
  welcome: Bell,
  announcement: Megaphone,
};

function getIcon(type: string, isBroadcast?: boolean) {
  if (isBroadcast) return Megaphone;
  return TYPE_ICON[type] || Bell;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  return `${months} tháng trước`;
}

/** XSS guard: only allow http(s) and relative URLs — block javascript: etc. */
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function formatFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

type FilterType = "all" | "unread" | "broadcast" | "personal";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // silently fail
    }
  };

  const handleClick = async (n: Notification) => {
    // Mark as read
    if (!n.read) {
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: n.id, is_broadcast: n.is_broadcast }),
        });
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
        );
      } catch {
        // silently fail
      }
    }

    // Toggle expand / collapse
    const key = `${n.is_broadcast ? "b" : "p"}-${n.id}`;
    setExpandedId((prev) => (prev === key ? null : key));
  };

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "broadcast") return n.is_broadcast;
    if (filter === "personal") return !n.is_broadcast;
    return true;
  });

  const hasUnread = notifications.some((n) => !n.read);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const broadcastCount = notifications.filter((n) => n.is_broadcast).length;

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "Tất cả" },
    { key: "unread", label: `Chưa đọc (${unreadCount})` },
    { key: "broadcast", label: `Chung (${broadcastCount})` },
    { key: "personal", label: "Cá nhân" },
  ];

  return (
    <div>
      <TopBar title="Thông báo" subtitle="Tất cả thông báo chung và cá nhân của bạn" />

      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        {/* Header actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={14} className="text-gray-400" />
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                  filter === f.key
                    ? "bg-[#D4A843] text-black font-medium"
                    : "bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {hasUnread && (
            <button
              onClick={markAllRead}
              className="text-xs text-[#D4A843] hover:underline flex items-center gap-1 shrink-0"
            >
              <CheckCheck size={14} /> Đã đọc tất cả
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-dark p-4 animate-pulse">
                <div className="h-4 bg-white/5 rounded w-1/3 mb-2" />
                <div className="h-3 bg-white/5 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-dark p-10 text-center">
            <Bell size={40} className="mx-auto mb-3 text-gray-500" />
            <h3 className="font-bold text-white mb-1">
              {filter === "all" ? "Chưa có thông báo" : "Không có thông báo"}
            </h3>
            <p className="text-sm text-gray-400">
              {filter === "unread"
                ? "Bạn đã đọc tất cả thông báo."
                : "Các thông báo mới sẽ xuất hiện ở đây."}
            </p>
          </div>
        ) : (
          <div className="space-y-2" aria-live="polite">
            {filtered.map((n) => {
              const Icon = getIcon(n.type, n.is_broadcast);
              const key = `${n.is_broadcast ? "b" : "p"}-${n.id}`;
              const isExpanded = expandedId === key;

              return (
                <div
                  key={key}
                  className="card-dark overflow-hidden transition-colors"
                  style={{
                    borderLeft: n.read ? "none" : "3px solid #D4A843",
                  }}
                >
                  {/* Clickable header */}
                  <div
                    onClick={() => handleClick(n)}
                    className="p-4 flex items-start gap-3 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <div className="shrink-0 mt-0.5">
                      <Icon
                        size={20}
                        className={n.read ? "text-gray-500" : n.is_broadcast ? "text-blue-400" : "text-[#D4A843]"}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {n.is_broadcast && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                            Chung
                          </span>
                        )}
                        <h3
                          className={`font-semibold text-sm ${
                            n.read ? "text-gray-400" : "text-white"
                          }`}
                        >
                          {n.title}
                        </h3>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-[#D4A843] shrink-0" />
                        )}
                      </div>
                      <p className={`text-xs text-gray-400 mt-0.5 leading-relaxed ${isExpanded ? "" : "line-clamp-2"}`}>
                        {n.message}
                      </p>
                      <span className="text-[10px] text-gray-500 mt-1 block">
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-gray-500 shrink-0 mt-1 transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div
                      className="px-4 pb-4 pt-0 ml-[32px]"
                      style={{ borderTop: "1px solid #222" }}
                    >
                      <div className="pt-3 space-y-3">
                        {/* Full message */}
                        <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {n.message}
                        </div>

                        {/* Meta info */}
                        <div className="flex items-center gap-4 text-[11px] text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {formatFullDate(n.created_at)}
                          </span>
                          {n.is_broadcast && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              Thông báo chung
                            </span>
                          )}
                          {!n.is_broadcast && (
                            <span className="px-1.5 py-0.5 rounded bg-[#D4A843]/10 text-[#D4A843] border border-[#D4A843]/20">
                              Cá nhân
                            </span>
                          )}
                        </div>

                        {/* Link button — only render safe URLs (http/https) */}
                        {n.link && isSafeUrl(n.link) && (
                          <a
                            href={n.link}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D4A843] hover:underline mt-1"
                          >
                            <ExternalLink size={12} />
                            Xem chi tiết
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
