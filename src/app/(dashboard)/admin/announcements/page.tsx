"use client";

import { useEffect, useState, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import { Megaphone, Send, Mail, Clock, Loader2, CheckCircle } from "lucide-react";

interface Announcement {
  id: string;
  content: string;
  created_at: string;
  profiles?: { full_name: string | null; avatar_url: string | null };
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    const res = await fetch("/api/admin/announcements");
    const data = await res.json();
    if (data.announcements) setAnnouncements(data.announcements);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), send_email: sendEmail }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({
          type: "success",
          text: `Đã tạo thông báo thành công!${sendEmail ? ` Đã gửi email cho ${data.emails_queued || 0} học viên.` : ""}`,
        });
        setContent("");
        setSendEmail(false);
        fetchAnnouncements();
      } else {
        setMessage({ type: "error", text: data.error || "Có lỗi xảy ra" });
      }
    } catch {
      setMessage({ type: "error", text: "Lỗi kết nối" });
    } finally {
      setSubmitting(false);
    }
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

  return (
    <div>
      <TopBar title="Thông báo" subtitle="Gửi thông báo tới toàn bộ học viên" />

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Create announcement form */}
        <div className="card-dark p-5">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone size={18} className="text-[#D4A843]" />
            <h3 className="text-sm font-bold text-white">Tạo thông báo mới</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung thông báo..."
              rows={4}
              className="input-dark w-full resize-none"
              maxLength={5000}
            />

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: "#D4A843" }}
                />
                <span className="text-sm text-gray-400 flex items-center gap-1.5">
                  <Mail size={14} />
                  Gửi email cho toàn bộ học viên
                </span>
              </label>
            </div>

            {sendEmail && (
              <div className="px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-800/30">
                <p className="text-xs text-amber-400">
                  ⚠️ Email sẽ được gửi cho tất cả học viên. Hành động này không thể hoàn tác.
                </p>
              </div>
            )}

            {message && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  message.type === "success"
                    ? "bg-green-900/30 text-green-400 border border-green-800/40"
                    : "bg-red-900/30 text-red-400 border border-red-800/40"
                }`}
              >
                {message.type === "success" && <CheckCircle size={14} className="inline mr-1.5" />}
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !content.trim()}
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
                  Đăng thông báo
                </>
              )}
            </button>
          </form>
        </div>

        {/* Announcements list */}
        <div>
          <h3 className="text-sm font-bold text-white mb-3">Thông báo đã gửi</h3>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card-dark p-4 animate-pulse">
                  <div className="h-4 bg-gray-800 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-800 rounded w-1/4" />
                </div>
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="card-dark p-8 text-center">
              <Megaphone size={32} className="text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Chưa có thông báo nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div key={ann.id} className="card-dark p-4">
                  <p className="text-sm text-gray-300 whitespace-pre-wrap mb-2">{ann.content}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock size={12} />
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
