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

type FilterType = "all" | "unread" | "broadcast" | "personal";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

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
    if (n.link) {
      window.location.href = n.link;
    }
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
              return (
                <div
                  key={`${n.is_broadcast ? "b" : "p"}-${n.id}`}
                  onClick={() => handleClick(n)}
                  className={`card-dark p-4 flex items-start gap-3 transition-colors ${
                    n.link ? "cursor-pointer hover:bg-white/5" : ""
                  }`}
                  style={{
                    borderLeft: n.read ? "none" : "3px solid #D4A843",
                  }}
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
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
