"use client";

import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type NotificationType = "achievement" | "community" | "system" | "welcome";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_ICON: Record<NotificationType, string> = {
  achievement: "🏆",
  community: "💬",
  system: "⚡",
  welcome: "🎉",
};

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "mock-1",
    type: "welcome",
    title: "Chào mừng!",
    message: "Chào mừng bạn đến với nền tảng! Hãy bắt đầu hành trình học tập.",
    read: false,
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    id: "mock-2",
    type: "achievement",
    title: "Thành tích mới!",
    message: "Bạn đã hoàn thành một bài học và nhận được 30 XP.",
    read: false,
    created_at: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
  },
  {
    id: "mock-3",
    type: "community",
    title: "Cộng đồng",
    message: "Bài viết của bạn đã được đăng thành công (+50 XP).",
    read: true,
    created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "mock-4",
    type: "system",
    title: "Hoạt động hệ thống",
    message: "Bạn đã đăng nhập thành công.",
    read: true,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

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
  return `${days} ngày trước`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Fetch on mount
  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((json: { notifications?: Notification[]; unread_count?: number }) => {
        if (Array.isArray(json.notifications) && json.notifications.length > 0) {
          setNotifications(json.notifications);
          setUnreadCount(json.unread_count ?? 0);
        } else {
          // Fallback mock khi chưa có dữ liệu
          setNotifications(MOCK_NOTIFICATIONS);
          setUnreadCount(MOCK_NOTIFICATIONS.filter((n) => !n.read).length);
        }
      })
      .catch(() => {
        setNotifications(MOCK_NOTIFICATIONS);
        setUnreadCount(MOCK_NOTIFICATIONS.filter((n) => !n.read).length);
      });
  }, []);

  // Click outside → đóng dropdown
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  // Mark single as read
  function markRead(id: string) {
    fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notification_id: id }),
    }).catch(() => {});
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
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
            {visible.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-8">
                Chưa có thông báo nào.
              </p>
            ) : (
              visible.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.read && markRead(notif.id)}
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
                    {TYPE_ICON[notif.type]}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white leading-snug">
                      {notif.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-1">
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
