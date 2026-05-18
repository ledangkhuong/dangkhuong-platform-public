"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import TopBar from "@/components/layout/TopBar";
import {
  MessageCircleQuestion,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  Filter,
  MessageSquare,
  BookOpen,
  PlayCircle,
  Phone,
  Mail,
  MailCheck,
} from "lucide-react";

interface Reply {
  id: string;
  content: string;
  created_at: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
}

interface Question {
  id: string;
  content: string;
  reply: string | null;
  status: string;
  created_at: string;
  replied_at: string | null;
  profiles: { full_name: string | null; avatar_url: string | null; phone: string | null } | null;
  replier: { full_name: string | null; avatar_url: string | null } | null;
  email: string | null;
  reply_count: number;
  course_name: string | null;
  lesson_name: string | null;
  product_id: string | null;
  lesson_id: string | null;
  all_replies: Reply[];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

export default function AdminQuestionsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "answered">("all");
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sendEmailWithReply, setSendEmailWithReply] = useState(true);

  // Auth check
  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (
        !profile ||
        !["admin", "manager", "support"].includes(profile.role)
      ) {
        router.push("/dashboard");
        return;
      }

      setLoading(false);
    }
    check();
  }, []);

  // Fetch questions
  const fetchQuestions = useCallback(async () => {
    const params = new URLSearchParams({ limit: "100" });
    if (filter !== "all") params.set("status", filter);

    const res = await fetch(`/api/questions?${params}`);
    if (res.ok) {
      const json = await res.json();
      setQuestions(json.questions ?? []);
    }
  }, [filter]);

  useEffect(() => {
    if (!loading) fetchQuestions();
  }, [loading, fetchQuestions]);

  // Submit reply
  const handleReply = async (questionId: string) => {
    if (!replyContent.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: questionId,
          reply: replyContent.trim(),
          sendEmail: sendEmailWithReply,
        }),
      });

      if (res.ok) {
        setReplyingId(null);
        setReplyContent("");
        fetchQuestions();
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <TopBar title="Câu hỏi học viên" subtitle="Đang tải..." />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-gray-500" size={24} />
        </div>
      </div>
    );
  }

  const pendingCount = questions.filter((q) => q.status === "pending").length;

  return (
    <div>
      <TopBar
        title="Câu hỏi học viên"
        subtitle={`${pendingCount} câu hỏi chờ phản hồi`}
      />

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card-dark p-4 text-center">
            <div className="text-2xl font-bold text-white">
              {questions.length}
            </div>
            <div className="text-xs text-gray-500 mt-1">Tổng câu hỏi</div>
          </div>
          <div className="card-dark p-4 text-center">
            <div className="text-2xl font-bold text-[#f59e0b]">
              {pendingCount}
            </div>
            <div className="text-xs text-gray-500 mt-1">Chờ phản hồi</div>
          </div>
          <div className="card-dark p-4 text-center">
            <div className="text-2xl font-bold text-[#D4A843]">
              {questions.filter((q) => q.status === "answered").length}
            </div>
            <div className="text-xs text-gray-500 mt-1">Đã trả lời</div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-500" />
          {(["all", "pending", "answered"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-[#D4A843]/15 text-[#D4A843] border border-[#D4A843]/30"
                  : "bg-[#1a1a1a] text-gray-400 border border-[#2a2a2a] hover:text-white"
              }`}
            >
              {f === "all"
                ? "Tất cả"
                : f === "pending"
                ? "Chờ phản hồi"
                : "Đã trả lời"}
            </button>
          ))}
        </div>

        {/* Questions list */}
        {questions.length === 0 ? (
          <div className="card-dark p-10 text-center">
            <MessageCircleQuestion
              size={40}
              className="text-gray-700 mx-auto mb-3"
            />
            <p className="text-gray-400 text-sm">
              {filter === "pending"
                ? "Không có câu hỏi nào chờ phản hồi"
                : "Chưa có câu hỏi nào"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q) => (
              <div key={q.id} className="card-dark p-5 space-y-3">
                {/* Course & Lesson context */}
                {(q.course_name || q.lesson_name) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {q.course_name && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <BookOpen size={10} />
                        {q.course_name}
                      </span>
                    )}
                    {q.lesson_name && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <PlayCircle size={10} />
                        {q.lesson_name}
                      </span>
                    )}
                  </div>
                )}

                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {q.profiles?.avatar_url ? (
                      <img src={q.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{
                          background:
                            "linear-gradient(135deg, #3b82f6, #2563eb)",
                        }}
                      >
                        {(q.profiles?.full_name ?? "?")
                          .split(" ")
                          .map((w: string) => w[0])
                          .slice(-2)
                          .join("")
                          .toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white">
                          {q.profiles?.full_name ?? "Thành viên"}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {timeAgo(q.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 flex-wrap">
                        {q.email && (
                          <a
                            href={`mailto:${q.email}`}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#D4A843]/30 hover:text-[#D4A843] transition-colors"
                            title={`Email: ${q.email}`}
                          >
                            <Mail size={9} />
                            {q.email}
                          </a>
                        )}
                        {q.profiles?.phone && (
                          <a
                            href={`tel:${q.profiles.phone}`}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] hover:border-green-500/30 hover:text-green-400 transition-colors"
                            title={`Điện thoại: ${q.profiles.phone}`}
                          >
                            <Phone size={9} />
                            {q.profiles.phone}
                          </a>
                        )}
                        {q.reply_count > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-[#1a1a1a] border border-[#2a2a2a]">
                            {q.reply_count} phản hồi
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      q.status === "pending"
                        ? "bg-[#f59e0b]/15 text-[#f59e0b]"
                        : q.status === "answered"
                        ? "bg-[#D4A843]/15 text-[#D4A843]"
                        : "bg-gray-500/15 text-gray-400"
                    }`}
                  >
                    {q.status === "pending"
                      ? "Chờ phản hồi"
                      : q.status === "answered"
                      ? "Đã trả lời"
                      : "Đã đóng"}
                  </span>
                </div>

                {/* Question content */}
                <p className="text-sm text-gray-300 whitespace-pre-line pl-11">
                  {q.content}
                </p>

                {/* All Replies */}
                {q.all_replies && q.all_replies.length > 0 && (
                  <div className="ml-11 space-y-2">
                    {q.all_replies.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-lg p-3"
                        style={{
                          background: "rgba(212,168,67,0.06)",
                          border: "1px solid rgba(212,168,67,0.15)",
                        }}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <CheckCircle2 size={12} className="text-[#D4A843]" />
                          <span className="text-[10px] font-medium text-[#D4A843]">
                            {r.profiles?.full_name ?? "Staff"}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            • {timeAgo(r.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 whitespace-pre-line">
                          {r.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply form */}
                {replyingId === q.id ? (
                  <div className="ml-11 space-y-2">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Nhập câu trả lời..."
                      className="w-full input-dark resize-none text-sm"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleReply(q.id)}
                        disabled={submitting || !replyContent.trim()}
                        className="btn-green text-xs py-1.5 px-3 disabled:opacity-40"
                      >
                        {submitting ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Send size={12} />
                        )}
                        Gửi phản hồi
                      </button>
                      {q.email && (
                        <label className="flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={sendEmailWithReply}
                            onChange={(e) => setSendEmailWithReply(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-gray-600 bg-[#1a1a1a] text-[#D4A843] focus:ring-[#D4A843]/30"
                          />
                          <MailCheck size={12} className={sendEmailWithReply ? "text-[#D4A843]" : "text-gray-500"} />
                          Gửi email thông báo
                        </label>
                      )}
                      <button
                        onClick={() => {
                          setReplyingId(null);
                          setReplyContent("");
                        }}
                        className="text-xs text-gray-500 hover:text-white transition-colors px-3 py-1.5"
                      >
                        Huỷ
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="ml-11">
                    <button
                      onClick={() => {
                        setReplyingId(q.id);
                        setReplyContent("");
                      }}
                      className="flex items-center gap-1.5 text-xs text-[#3b82f6] hover:text-[#60a5fa] transition-colors"
                    >
                      <MessageSquare size={12} />
                      Trả lời
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
