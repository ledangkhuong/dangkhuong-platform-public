"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addActivity } from "@/lib/actions/crm";
import {
  FileText,
  Phone,
  Mail,
  Calendar,
  ListTodo,
  Send,
  Loader2,
} from "lucide-react";

type ActivityType = "note" | "call" | "email" | "meeting" | "task";
type InterestLevel = "high" | "medium" | "low";

interface ActivityComposerProps {
  contactId: string;
  contactName: string | null;
  contactEmail: string | null;
  currentInterestLevel: InterestLevel | null;
  canEmail: boolean;
}

const TYPE_OPTIONS: {
  value: ActivityType;
  label: string;
  icon: typeof FileText;
  color: string;
}[] = [
  { value: "note", label: "Ghi chú", icon: FileText, color: "#6b7280" },
  { value: "call", label: "Gọi điện", icon: Phone, color: "#3b82f6" },
  { value: "email", label: "Email", icon: Mail, color: "#8b5cf6" },
  { value: "meeting", label: "Họp", icon: Calendar, color: "#f59e0b" },
  { value: "task", label: "Việc cần làm", icon: ListTodo, color: "#ec4899" },
];

const OUTCOME_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "— Kết quả —" },
  { value: "reached", label: "Đã liên hệ" },
  { value: "no_answer", label: "Không bắt máy" },
  { value: "busy", label: "Bận" },
  { value: "rejected", label: "Từ chối" },
  { value: "callback_later", label: "Gọi lại sau" },
  { value: "other", label: "Khác" },
];

const INTEREST_OPTIONS: {
  value: InterestLevel;
  label: string;
  color: string;
  bg: string;
  border: string;
}[] = [
  {
    value: "high",
    label: "Cao",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.45)",
  },
  {
    value: "medium",
    label: "Trung bình",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.45)",
  },
  {
    value: "low",
    label: "Thấp",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.45)",
  },
];

export default function ActivityComposer({
  contactId,
  contactName,
  contactEmail,
  currentInterestLevel,
  canEmail,
}: ActivityComposerProps) {
  const router = useRouter();
  const [type, setType] = useState<ActivityType>("note");
  const [interestLevel, setInterestLevel] = useState<InterestLevel | "">(
    currentInterestLevel ?? ""
  );
  const [submitting, setSubmitting] = useState(false);

  // Email-only state
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const isEmailMode = type === "email";
  const activeType = TYPE_OPTIONS.find((t) => t.value === type) ?? TYPE_OPTIONS[0];
  const ActiveIcon = activeType.icon;

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(null);

    const subject = emailSubject.trim();
    const body = emailBody.trim();
    if (!subject) {
      setEmailError("Vui lòng nhập tiêu đề");
      return;
    }
    if (!body) {
      setEmailError("Vui lòng nhập nội dung");
      return;
    }
    if (!contactEmail) {
      setEmailError("Khách chưa có email");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/crm/contacts/${contactId}/send-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, body }),
        }
      );

      if (res.ok) {
        setEmailSubject("");
        setEmailBody("");
        setEmailSuccess("Đã gửi email thành công.");
        startTransition(() => {
          router.refresh();
        });
      } else {
        if (res.status === 400) {
          let msg = "Thiếu thông tin hoặc khách chưa có email";
          try {
            const data = (await res.json()) as { error?: string };
            if (data?.error?.toLowerCase().includes("no email")) {
              msg = "Khách chưa có email";
            } else if (data?.error) {
              msg = data.error;
            }
          } catch {
            /* keep default */
          }
          setEmailError(msg);
        } else if (res.status === 403) {
          setEmailError("Bạn không có quyền gửi cho khách này");
        } else if (res.status === 401) {
          setEmailError("Phiên đăng nhập hết hạn");
        } else if (res.status === 404) {
          setEmailError("Không tìm thấy khách hàng");
        } else if (res.status === 502) {
          setEmailError("Không gửi được, thử lại");
        } else {
          setEmailError("Lỗi máy chủ, vui lòng thử lại");
        }
      }
    } catch {
      setEmailError("Lỗi kết nối, vui lòng thử lại");
    } finally {
      setSubmitting(false);
    }
  }

  // Type selector + (form for non-email types | composer for email type)
  return (
    <div>
      {/* ── Type selector tabs ───────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {TYPE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = opt.value === type;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setType(opt.value);
                setEmailError(null);
                setEmailSuccess(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: isActive
                  ? `${opt.color}1a`
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${
                  isActive ? `${opt.color}66` : "#2a2a2a"
                }`,
                color: isActive ? opt.color : "#9ca3af",
              }}
            >
              <Icon size={13} />
              {opt.label}
            </button>
          );
        })}
      </div>

      {isEmailMode ? (
        /* ── EMAIL COMPOSER MODE ────────────────────────────────────────── */
        <form onSubmit={handleSendEmail} className="space-y-3">
          {/* Recipient hint */}
          <div className="text-xs text-gray-400">
            Gửi tới:{" "}
            {contactEmail ? (
              <span className="text-gray-200 font-medium">
                {contactName ? `${contactName} <${contactEmail}>` : contactEmail}
              </span>
            ) : (
              <span className="text-red-400">Khách chưa có email</span>
            )}
          </div>

          {!canEmail && contactEmail && (
            <div
              className="text-xs px-3 py-2 rounded-lg"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#fca5a5",
              }}
            >
              Bạn không có quyền gửi email cho khách này.
            </div>
          )}

          <input
            type="text"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            placeholder="Tiêu đề email…"
            required
            disabled={!canEmail || submitting}
            className="input-dark px-3 py-2 text-sm"
          />

          <textarea
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            rows={6}
            placeholder="Nội dung email gửi cho khách…"
            required
            disabled={!canEmail || submitting}
            className="input-dark px-3 py-2 text-sm resize-y"
            style={{ minHeight: 140 }}
          />

          {emailError && (
            <div
              className="text-xs px-3 py-2 rounded-lg"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#fca5a5",
              }}
            >
              {emailError}
            </div>
          )}

          {emailSuccess && (
            <div
              className="text-xs px-3 py-2 rounded-lg"
              style={{
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.25)",
                color: "#86efac",
              }}
            >
              {emailSuccess}
            </div>
          )}

          <div className="flex items-center gap-2 justify-end">
            <button
              type="submit"
              disabled={!canEmail || submitting}
              className="btn-gold px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Đang gửi…
                </>
              ) : (
                <>
                  <Send size={14} />
                  Gửi email
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* ── NOTE / CALL / MEETING / TASK FORM ──────────────────────────── */
        <form
          action={addActivity}
          onSubmit={() => setSubmitting(true)}
          className="space-y-3"
        >
          <input type="hidden" name="contact_id" value={contactId} />
          <input type="hidden" name="type" value={type} />

          {/* Conditional CALL fields */}
          {type === "call" && (
            <div className="flex flex-col sm:flex-row gap-2.5">
              <select
                name="outcome"
                className="input-dark px-3 py-2 text-sm sm:w-[180px]"
                defaultValue=""
              >
                {OUTCOME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                name="duration_minutes"
                min={0}
                step={1}
                placeholder="Thời lượng (phút)"
                className="input-dark px-3 py-2 text-sm sm:w-[180px]"
              />
            </div>
          )}

          {/* Notes textarea — always required for non-email */}
          <textarea
            name="content"
            required
            rows={3}
            placeholder={
              type === "call"
                ? "Ghi chú cuộc gọi…"
                : type === "meeting"
                ? "Nội dung cuộc họp…"
                : type === "task"
                ? "Mô tả việc cần làm…"
                : "Nội dung ghi chú…"
            }
            className="input-dark px-3 py-2 text-sm resize-y"
            style={{ minHeight: 80 }}
          />

          {/* Interest level segmented control */}
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1.5">
              Mức độ quan tâm (tuỳ chọn)
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setInterestLevel("")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background:
                    interestLevel === ""
                      ? "rgba(255,255,255,0.06)"
                      : "transparent",
                  border: `1px solid ${
                    interestLevel === "" ? "#3a3a3a" : "#2a2a2a"
                  }`,
                  color: interestLevel === "" ? "#e5e7eb" : "#6b7280",
                }}
              >
                — Không đổi —
              </button>
              {INTEREST_OPTIONS.map((opt) => {
                const isActive = opt.value === interestLevel;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setInterestLevel(opt.value)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: isActive ? opt.bg : "transparent",
                      border: `1px solid ${isActive ? opt.border : "#2a2a2a"}`,
                      color: isActive ? opt.color : "#9ca3af",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {/* Hidden field carries the value */}
            {interestLevel && (
              <input
                type="hidden"
                name="interest_level"
                value={interestLevel}
              />
            )}
          </div>

          {/* Next follow-up datetime */}
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1.5">
              Hẹn theo dõi tiếp (tuỳ chọn)
            </label>
            <input
              type="datetime-local"
              name="next_follow_up_at"
              className="input-dark px-3 py-2 text-sm sm:max-w-[260px]"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="btn-green px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Đang lưu…
                </>
              ) : (
                <>
                  <ActiveIcon size={14} />
                  Thêm {activeType.label.toLowerCase()}
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
