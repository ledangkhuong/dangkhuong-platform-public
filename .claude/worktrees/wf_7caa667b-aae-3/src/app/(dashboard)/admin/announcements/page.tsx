"use client";

import { useEffect, useState, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import {
  Megaphone, Send, Mail, Clock, Loader2, CheckCircle,
  Bell, Users, Link2, Globe,
} from "lucide-react";

interface Announcement {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  created_at: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [postToCommunity, setPostToCommunity] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/admin");
      const data = await res.json();
      if (data.announcements) setAnnouncements(data.announcements);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setSubmitting(true);
    setResult(null);

    try {
      // 1. Create broadcast notification
      const notifRes = await fetch("/api/notifications/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          broadcast: true,
          type: "announcement",
          title: title.trim(),
          message: message.trim(),
          link: link.trim() || undefined,
        }),
      });

      if (!notifRes.ok) {
        const data = await notifRes.json();
        throw new Error(data.error || "Lỗi tạo thông báo");
      }

      // 2. Optionally post to community
      if (postToCommunity) {
        await fetch("/api/admin/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `📢 ${title.trim()}\n\n${message.trim()}${link ? `\n\n🔗 ${link.trim()}` : ""}`,
            send_email: sendEmail,
          }),
        }).catch(() => {});
      }

      setResult({
        type: "success",
        text: `Đã tạo thông báo chung thành công!${postToCommunity ? " Đã đăng lên cộng đồng." : ""}${sendEmail ? " Email đang được gửi." : ""}`,
      });
      setTitle("");
      setMessage("");
      setLink("");
      setPostToCommunity(false);
      setSendEmail(false);
      fetchAnnouncements();
    } catch (err) {
      setResult({
        type: "error",
        text: err instanceof Error ? err.message : "Có lỗi xảy ra",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <TopBar title="Quản lý thông báo" subtitle="Tạo thông báo chung cho toàn bộ người dùng" />

      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
        {/* Create form */}
        <div className="card-dark p-5">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone size={18} className="text-[#D4A843]" />
            <h3 className="text-sm font-bold text-white">Tạo thông báo chung</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                Tiêu đề <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Khoá học mới ra mắt, Bảo trì hệ thống..."
                className="input-dark w-full text-sm"
                maxLength={200}
                required
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                Nội dung <span className="text-red-400">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Nội dung chi tiết thông báo..."
                rows={4}
                className="input-dark w-full resize-none text-sm"
                maxLength={5000}
                required
              />
            </div>

            {/* Link */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium flex items-center gap-1">
                <Link2 size={12} /> Link đính kèm (tuỳ chọn)
              </label>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://dangkhuong.com/courses/..."
                className="input-dark w-full text-sm"
              />
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={postToCommunity}
                  onChange={(e) => setPostToCommunity(e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: "#D4A843" }}
                />
                <span className="text-sm text-gray-400 flex items-center gap-1.5">
                  <Globe size={14} />
                  Đăng lên cộng đồng
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  disabled={!postToCommunity}
                  className="w-4 h-4 rounded disabled:opacity-40"
                  style={{ accentColor: "#D4A843" }}
                />
                <span className={`text-sm flex items-center gap-1.5 ${postToCommunity ? "text-gray-400" : "text-gray-600"}`}>
                  <Mail size={14} />
                  Gửi email cho toàn bộ học viên
                </span>
              </label>
            </div>

            {sendEmail && postToCommunity && (
              <div className="px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-800/30">
                <p className="text-xs text-amber-400">
                  Email sẽ được gửi cho tất cả học viên. Hành động không thể hoàn tác.
                </p>
              </div>
            )}

            {/* Info */}
            <div className="px-3 py-2 rounded-lg bg-blue-900/20 border border-blue-800/30">
              <p className="text-xs text-blue-400 flex items-center gap-1.5">
                <Bell size={12} />
                Thông báo sẽ hiển thị trong chuông thông báo của tất cả người dùng.
              </p>
            </div>

            {/* Result message */}
            {result && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  result.type === "success"
                    ? "bg-green-900/30 text-green-400 border border-green-800/40"
                    : "bg-red-900/30 text-red-400 border border-red-800/40"
                }`}
              >
                {result.type === "success" && <CheckCircle size={14} className="inline mr-1.5" />}
                {result.text}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !title.trim() || !message.trim()}
              className="btn-green flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Send size={15} />
                  Gửi thông báo
                </>
              )}
            </button>
          </form>
        </div>

        {/* Past announcements */}
        <div>
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Users size={14} className="text-gray-400" />
            Thông báo chung đã gửi
          </h3>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card-dark p-4 animate-pulse">
                  <div className="h-4 bg-gray-800 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-800 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="card-dark p-8 text-center">
              <Megaphone size={32} className="text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Chưa có thông báo chung nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div key={ann.id} className="card-dark p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-white">{ann.title}</h4>
                      <p className="text-xs text-gray-400 mt-1 whitespace-pre-wrap">{ann.message}</p>
                      {ann.link && (
                        <a
                          href={ann.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#D4A843] mt-1 inline-flex items-center gap-1 hover:underline"
                        >
                          <Link2 size={10} /> {ann.link}
                        </a>
                      )}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                      {ann.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-3">
                    <Clock size={11} />
                    {formatDate(ann.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
