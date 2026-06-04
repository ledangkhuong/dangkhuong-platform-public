"use client";

import { useState, useRef, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { setContactStatus } from "@/lib/actions/contact-status";
import { ChevronDown, Check, Loader2, AlertCircle } from "lucide-react";

/**
 * Pipeline-status badge + popover for the contact detail page.
 *
 * Renders the current status as a coloured pill. Clicking it opens a
 * popover listing every allowed status. Picking one (other than the
 * current one) reveals an inline "note" textarea — the note is the
 * accountability trail and is required (min 5 chars) before the
 * server action is allowed to run.
 *
 * The server action is `setContactStatus` from
 * `@/lib/actions/contact-status` — it writes the new status, inserts
 * a `crm_activities` row of type='status_change', and revalidates
 * the contact pages.
 */

type StatusOption = {
  value: string;
  label: string;
  color: string;
  bg: string;
  border: string;
};

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: "new",
    label: "Khách mới",
    color: "#9ca3af",
    bg: "rgba(156,163,175,0.12)",
    border: "rgba(156,163,175,0.4)",
  },
  {
    value: "contacted",
    label: "Đã liên hệ",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.4)",
  },
  {
    value: "qualified",
    label: "Đủ điều kiện",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.12)",
    border: "rgba(168,85,247,0.4)",
  },
  {
    value: "negotiation",
    label: "Đàm phán",
    color: "#f97316",
    bg: "rgba(249,115,22,0.14)",
    border: "rgba(249,115,22,0.45)",
  },
  {
    value: "won",
    label: "Chốt thành công",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.4)",
  },
  {
    value: "lost",
    label: "Mất khách",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.4)",
  },
  {
    value: "paused",
    label: "Tạm dừng",
    color: "#eab308",
    bg: "rgba(234,179,8,0.14)",
    border: "rgba(234,179,8,0.45)",
  },
  {
    value: "cold",
    label: "Khách nguội",
    color: "#64748b",
    bg: "rgba(100,116,139,0.14)",
    border: "rgba(100,116,139,0.45)",
  },
];

/** Legacy/fallback styling for any status not in STATUS_OPTIONS (e.g. 'churned'). */
const FALLBACK_OPTION: StatusOption = {
  value: "",
  label: "",
  color: "#9ca3af",
  bg: "rgba(156,163,175,0.1)",
  border: "rgba(156,163,175,0.3)",
};

function getOption(value: string): StatusOption {
  return (
    STATUS_OPTIONS.find((o) => o.value === value) ?? {
      ...FALLBACK_OPTION,
      value,
      label: value === "churned" ? "Rời bỏ" : value,
    }
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="btn-gold px-4 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
    >
      {pending ? (
        <>
          <Loader2 size={12} className="animate-spin" />
          Đang lưu…
        </>
      ) : (
        <>
          <Check size={12} />
          Lưu
        </>
      )}
    </button>
  );
}

interface StatusChangerProps {
  contactId: string;
  currentStatus: string;
  /** True for admin/manager OR the sale rep assigned to this contact. */
  canEdit: boolean;
}

export default function StatusChanger({
  contactId,
  currentStatus,
  canEdit,
}: StatusChangerProps) {
  const [open, setOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const current = getOption(currentStatus);
  const pending = pendingStatus ? getOption(pendingStatus) : null;
  const noteTooShort = note.trim().length < 5;

  // Close the popover when clicking outside
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPendingStatus(null);
        setNote("");
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // ESC closes the popover
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setPendingStatus(null);
        setNote("");
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Read-only display when viewer can't edit
  if (!canEdit) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
        title="Trạng thái pipeline (chỉ admin/manager hoặc sale phụ trách có quyền đổi)"
        style={{
          background: current.bg,
          color: current.color,
          border: `1px solid ${current.border}`,
        }}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: current.color }}
        />
        {current.label}
      </span>
    );
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (open) {
            setPendingStatus(null);
            setNote("");
          }
        }}
        aria-expanded={open}
        aria-haspopup="true"
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all hover:brightness-110"
        style={{
          background: current.bg,
          color: current.color,
          border: `1px solid ${current.border}`,
        }}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: current.color }}
        />
        {current.label}
        <ChevronDown size={12} style={{ opacity: 0.7 }} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-2 z-30 rounded-xl shadow-xl"
          style={{
            background: "#161616",
            border: "1px solid #2a2a2a",
            minWidth: 280,
          }}
        >
          {/* Status list */}
          <div className="p-2">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 px-2 py-1">
              Chọn trạng thái mới
            </p>
            <div className="flex flex-col gap-0.5">
              {STATUS_OPTIONS.map((opt) => {
                const isCurrent = opt.value === currentStatus;
                const isPicked = opt.value === pendingStatus;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      if (isCurrent) return;
                      setPendingStatus(opt.value);
                    }}
                    disabled={isCurrent}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors disabled:cursor-not-allowed"
                    style={{
                      background: isPicked
                        ? "rgba(212,168,67,0.08)"
                        : "transparent",
                      color: isCurrent ? "#6b7280" : "#e5e7eb",
                      border: `1px solid ${
                        isPicked ? "rgba(212,168,67,0.35)" : "transparent"
                      }`,
                    }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: opt.color }}
                    />
                    <span className="flex-1">{opt.label}</span>
                    {isCurrent && (
                      <span className="text-[10px] text-gray-500">
                        hiện tại
                      </span>
                    )}
                    {isPicked && !isCurrent && (
                      <Check size={12} style={{ color: "#D4A843" }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Confirm form */}
          {pending && (
            <form
              action={setContactStatus}
              className="p-3 border-t"
              style={{ borderColor: "#2a2a2a" }}
            >
              <input type="hidden" name="contact_id" value={contactId} />
              <input type="hidden" name="new_status" value={pending.value} />

              <div className="flex items-center gap-2 text-xs mb-2">
                <span className="text-gray-400">Đổi sang:</span>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    background: pending.bg,
                    color: pending.color,
                    border: `1px solid ${pending.border}`,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: pending.color }}
                  />
                  {pending.label}
                </span>
              </div>

              <label
                htmlFor="status-note"
                className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1"
              >
                Lý do đổi trạng thái (bắt buộc)
              </label>
              <textarea
                id="status-note"
                name="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                required
                minLength={5}
                placeholder="VD: Khách báo bận cuối tháng, hẹn gọi lại tuần sau…"
                className="input-dark px-2 py-2 text-xs leading-relaxed resize-y w-full"
                style={{ minHeight: 70 }}
              />

              {noteTooShort && note.length > 0 && (
                <div
                  className="mt-2 text-[11px] inline-flex items-center gap-1.5"
                  style={{ color: "#fca5a5" }}
                >
                  <AlertCircle size={11} />
                  Ghi chú phải dài tối thiểu 5 ký tự.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setPendingStatus(null);
                    setNote("");
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors hover:bg-white/[0.04]"
                  style={{ color: "#9ca3af", border: "1px solid #2a2a2a" }}
                >
                  Huỷ
                </button>
                <SubmitButton disabled={noteTooShort} />
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
