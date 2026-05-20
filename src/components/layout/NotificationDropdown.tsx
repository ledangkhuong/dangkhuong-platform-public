"use client";

import { Bell } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type NotificationType = "achievement" | "community" | "system" | "welcome" | "announcement" | "like" | "course" | string;

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

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, string> = {
  achievement: "🏆",
  community: "💬",
  like: "❤️",
  system: "⚡",
  welcome: "🎉",
  announcement: "📢",
  course: "📚",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  if (hours < 24) return `${hours} tiếng trước`;
  if (days === 1) return "hôm qua";
  if (days < 30) return `${days} ngày trước`;
  return `${Math.floor(days / 30)} tháng trước`;
}

function getIcon(type: string, isBroadcast?: boolean): string {
  if (isBroadcast) return "📢";
  return TYPE_ICON[type] || "⚡";
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((json: { notifications?: Notification[]; unread_count?: number }) => {
        if (Array.isArray(json.notifications)) {
          setNotifications(json.notifications);
          setUnreadCount(json.unread_count ?? 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Fetch on mount + poll every 30s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Click outside → close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Mark all as read
  function markAllRead() {
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  // Mark single as read & navigate
  function handleClick(notif: Notification) {
    if (!notif.read) {
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notif.id, is_broadcast: notif.is_broadcast }),
      }).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    // Navigate to link if available, otherwise go to notifications page
    window.location.href = notif.link || "/notifications";
  }

  const visible = notifications.slice(0, 6);

  return (
    <div className="relative">
      {/* Bell trigger */}
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg transition-colors text-gray-400 hover:text-white"
        style={{ background: open ? "rgba(255,255,255,0.05)" : "transparent" }}
        aria-label="Thông báo"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: "#ef4444" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 mt-2 w-80 rounded-xl shadow-xl z-50"
          style={{
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            top: "100%",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid #2a2a2a" }}
          >
            <span className="text-sm font-semibold text-white">Thông báo</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium transition-colors"
                style={{ color: "#D4A843" }}
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: "360px" }}>
            {!loaded ? (
              <div className="py-8 flex justify-center">
                <div className="w-5 h-5 border-2 border-[#D4A843] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : visible.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-8">
                Chưa có thông báo nào.
              </p>
            ) : (
              visible.map((notif) => (
                <div
                  key={`${notif.is_broadcast ? "b" : "p"}-${notif.id}`}
                  onClick={() => handleClick(notif)}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors"
                  style={{
                    borderBottom: "1px solid #222",
                    background: notif.read ? "transparent" : "rgba(212,168,67,0.04)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = notif.read
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(212,168,67,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = notif.read
                      ? "transparent"
                      : "rgba(212,168,67,0.04)";
                  }}
                >
                  {/* Icon */}
                  <span className="text-base leading-none mt-0.5 shrink-0">
                    {getIcon(notif.type, notif.is_broadcast)}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white leading-snug">
                      {notif.is_broadcast && (
                        <span className="text-[10px] text-[#D4A843] font-medium mr-1">
                          Chung
                        </span>
                      )}
                      {notif.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {relativeTime(notif.created_at)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!notif.read && (
                    <span
                      className="w-2 h-2 rounded-full shrink-0 mt-1"
                      style={{ background: "#D4A843" }}
                    />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            className="px-4 py-2.5 text-center"
            style={{ borderTop: "1px solid #2a2a2a" }}
          >
            <a
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium transition-colors"
              style={{ color: "#D4A843" }}
            >
              Xem tất cả →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
