"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";

type NotificationType = "achievement" | "community" | "system" | "welcome";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

const TYPE_ICON: Record<NotificationType, string> = {
  achievement: "\u{1F3C6}",
  community: "\u{1F4AC}",
  system: "\u{26A1}",
  welcome: "\u{1F389}",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} tiếng trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => {
        setNotifications(d.notifications || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell size={20} className="text-[#D4A843]" /> Thông báo
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Tất cả thông báo của bạn
          </p>
        </div>
        {notifications.some((n) => !n.read) && (
          <button
            onClick={markAllRead}
            className="text-xs text-[#D4A843] hover:underline flex items-center gap-1"
          >
            <CheckCheck size={14} /> Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-dark p-4 animate-pulse">
              <div className="h-4 bg-white/5 rounded w-1/3 mb-2" />
              <div className="h-3 bg-white/5 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="card-dark p-10 text-center">
          <div className="text-4xl mb-3">🔔</div>
          <h3 className="font-bold text-white mb-1">Chưa có thông báo</h3>
          <p className="text-sm text-gray-400">
            Các thông báo mới sẽ xuất hiện ở đây.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="card-dark p-4 flex items-start gap-3 transition-colors"
              style={{
                borderLeft: n.read ? "none" : "3px solid #D4A843",
              }}
            >
              <span className="text-2xl shrink-0">
                {TYPE_ICON[n.type] || "\u{1F514}"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-white">
                    {n.title}
                  </h3>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-[#D4A843] shrink-0" />
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  {n.message}
                </p>
                <span className="text-[10px] text-gray-600 mt-1 block">
                  {timeAgo(n.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
