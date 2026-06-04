"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { ChevronDown } from "lucide-react";
import { setContactStatus } from "@/lib/actions/contact-status";
import {
  CONTACT_STATUS_VALUES,
  getContactStatusLabel,
} from "@/lib/contact-status";

/**
 * Inline status editor for a row in the /crm/contacts list.
 *
 * Read-only mode (`canEdit=false`) renders the exact same coloured
 * pill the table used before (`ContactsTable.statusConfig`). Edit
 * mode renders a native <select> styled as the pill, plus a tiny
 * chevron, so the column width budget (100px) is respected.
 *
 * On change we submit a hidden <form action={setContactStatus}>
 * with an empty `note` — the server fills in the default
 * "Cập nhật trạng thái từ danh sách khách hàng" automatically.
 *
 * The pill colour palette is copied inline from ContactsTable to
 * avoid a circular import (ContactsTable already imports this file).
 */

type StatusStyle = {
  label: string;
  color: string;
  bg: string;
  border: string;
};

/** Same palette as ContactsTable.statusConfig — kept inline on purpose. */
const STATUS_STYLE: Record<string, StatusStyle> = {
  new: {
    label: "Mới",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.25)",
  },
  contacted: {
    label: "Đã liên hệ",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.25)",
  },
  qualified: {
    label: "Tiềm năng",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.1)",
    border: "rgba(168,85,247,0.25)",
  },
  negotiation: {
    label: "Đàm phán",
    color: "#f97316",
    bg: "rgba(249,115,22,0.1)",
    border: "rgba(249,115,22,0.25)",
  },
  won: {
    label: "Thành công",
    color: "#D4A843",
    bg: "rgba(212,168,67,0.1)",
    border: "rgba(212,168,67,0.25)",
  },
  lost: {
    label: "Mất",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.25)",
  },
  paused: {
    label: "Tạm dừng",
    color: "#eab308",
    bg: "rgba(234,179,8,0.1)",
    border: "rgba(234,179,8,0.25)",
  },
  cold: {
    label: "Khách nguội",
    color: "#64748b",
    bg: "rgba(100,116,139,0.1)",
    border: "rgba(100,116,139,0.25)",
  },
  churned: {
    label: "Rời bỏ",
    color: "#6b7280",
    bg: "rgba(107,114,128,0.1)",
    border: "rgba(107,114,128,0.25)",
  },
};

function getStyle(value: string): StatusStyle {
  return (
    STATUS_STYLE[value] ?? {
      label: getContactStatusLabel(value),
      color: "#9ca3af",
      bg: "rgba(156,163,175,0.1)",
      border: "rgba(156,163,175,0.25)",
    }
  );
}

interface StatusInlineSelectProps {
  contactId: string;
  currentStatus: string;
  /** True for admin/manager OR the sale rep assigned to this contact. */
  canEdit: boolean;
}

export default function StatusInlineSelect({
  contactId,
  currentStatus,
  canEdit,
}: StatusInlineSelectProps) {
  const style = getStyle(currentStatus);

  if (!canEdit) {
    return (
      <span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
        style={{
          background: style.bg,
          color: style.color,
          border: `1px solid ${style.border}`,
        }}
      >
        {style.label}
      </span>
    );
  }

  return (
    <InlineForm
      contactId={contactId}
      currentStatus={currentStatus}
      style={style}
    />
  );
}

function InlineForm({
  contactId,
  currentStatus,
  style,
}: {
  contactId: string;
  currentStatus: string;
  style: StatusStyle;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <form ref={formRef} action={setContactStatus} className="inline-block">
      <input type="hidden" name="contact_id" value={contactId} />
      {/* Server fills the default when note is empty. */}
      <input type="hidden" name="note" value="" />
      <InlineSelect
        currentStatus={currentStatus}
        style={style}
        onChange={(next) => {
          if (next === currentStatus) return;
          // Set the hidden new_status on the form before submit.
          const form = formRef.current;
          if (!form) return;
          let input = form.querySelector<HTMLInputElement>(
            'input[name="new_status"]',
          );
          if (!input) {
            input = document.createElement("input");
            input.type = "hidden";
            input.name = "new_status";
            form.appendChild(input);
          }
          input.value = next;
          form.requestSubmit();
        }}
      />
    </form>
  );
}

function InlineSelect({
  currentStatus,
  style,
  onChange,
}: {
  currentStatus: string;
  style: StatusStyle;
  onChange: (next: string) => void;
}) {
  const { pending } = useFormStatus();

  return (
    <span
      className="relative inline-flex items-center"
      style={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        borderRadius: 9999,
        paddingLeft: 10,
        paddingRight: 22,
        paddingTop: 1,
        paddingBottom: 1,
        opacity: pending ? 0.6 : 1,
      }}
    >
      <select
        value={currentStatus}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Đổi trạng thái"
        title={pending ? "Đang lưu…" : "Đổi trạng thái"}
        className="appearance-none bg-transparent border-0 outline-none text-xs font-semibold cursor-pointer pr-0 disabled:cursor-wait"
        style={{
          color: style.color,
          // keep the text on top of the pill background
          paddingRight: 0,
        }}
      >
        {CONTACT_STATUS_VALUES.map((s) => (
          <option key={s} value={s} style={{ color: "#111" }}>
            {getStyle(s).label}
          </option>
        ))}
        {/* Preserve a legacy value (e.g. 'churned') so the select
            doesn't visually flip to the first option. */}
        {!(CONTACT_STATUS_VALUES as readonly string[]).includes(currentStatus) && (
          <option value={currentStatus} style={{ color: "#111" }}>
            {style.label || currentStatus}
          </option>
        )}
      </select>
      <ChevronDown
        size={10}
        className="absolute pointer-events-none"
        style={{ right: 6, top: "50%", transform: "translateY(-50%)", opacity: 0.7 }}
      />
    </span>
  );
}
