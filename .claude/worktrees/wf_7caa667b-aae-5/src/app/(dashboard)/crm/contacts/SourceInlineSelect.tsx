"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { setContactSource } from "@/lib/actions/contact-source";

/**
 * Inline source editor for a row in the /crm/contacts list.
 *
 * Read-only mode (`canEdit=false`) renders the same coloured pill the
 * table used before. Edit mode shows the same pill, and on click it
 * swaps to a free-text input backed by a <datalist> of known source
 * labels (the built-in palette + any extras passed via `existingSources`
 * — typically the `crm_sources` table rows fetched on page.tsx).
 *
 * Submit happens on blur or Enter via a hidden <form action={setContactSource}>.
 * Empty input clears the source (server stores NULL); the pill then
 * shows a "+" placeholder so the cell still looks editable.
 *
 * Palette is copied inline from ContactsTable to avoid a circular
 * import (ContactsTable already imports this file).
 */

type SourceStyle = { label: string; color: string; bg: string };

const SOURCE_STYLE: Record<string, SourceStyle> = {
  manual: { label: "Thủ công", color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
  import: { label: "Import", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  website: { label: "Website", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  referral: { label: "Giới thiệu", color: "#D4A843", bg: "rgba(212,168,67,0.1)" },
  ads: { label: "Quảng cáo", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  social: { label: "MXH", color: "#ec4899", bg: "rgba(236,72,153,0.1)" },
};

const DEFAULT_STYLE: SourceStyle = {
  label: "",
  color: "#9ca3af",
  bg: "rgba(156,163,175,0.1)",
};

function getStyle(value: string | null): SourceStyle {
  if (!value) return DEFAULT_STYLE;
  return SOURCE_STYLE[value] ?? { ...DEFAULT_STYLE, label: value };
}

interface SourceInlineSelectProps {
  contactId: string;
  currentSource: string | null;
  /** True for admin/manager OR the sale rep assigned to this contact. */
  canEdit: boolean;
  /** Extra source labels to surface in the datalist (from crm_sources). */
  existingSources: string[];
}

export default function SourceInlineSelect({
  contactId,
  currentSource,
  canEdit,
  existingSources,
}: SourceInlineSelectProps) {
  const style = getStyle(currentSource);

  if (!canEdit) {
    if (!currentSource) {
      return <span className="text-gray-700 text-xs">&mdash;</span>;
    }
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ background: style.bg, color: style.color }}
      >
        {style.label}
      </span>
    );
  }

  return (
    <EditableSource
      contactId={contactId}
      currentSource={currentSource}
      existingSources={existingSources}
    />
  );
}

function EditableSource({
  contactId,
  currentSource,
  existingSources,
}: {
  contactId: string;
  currentSource: string | null;
  existingSources: string[];
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const style = getStyle(currentSource);

  // Datalist combines the built-in keys + the labels from `crm_sources`,
  // de-duplicated. We surface raw values so the user sees them exactly
  // as they were entered/imported.
  const suggestions = Array.from(
    new Set<string>([
      ...Object.keys(SOURCE_STYLE),
      ...existingSources.filter((s) => s && s.trim().length > 0),
    ]),
  );

  const datalistId = `source-suggestions-${contactId}`;

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    const form = formRef.current;
    if (!form) return;
    const next = (inputRef.current?.value ?? "").trim();
    const prev = (currentSource ?? "").trim();
    setEditing(false);
    if (next === prev) return; // no-op — don't even ping the server
    form.requestSubmit();
  }

  function cancel() {
    if (inputRef.current) inputRef.current.value = currentSource ?? "";
    setEditing(false);
  }

  if (!editing) {
    // Pill in display mode — click to edit.
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Bấm để đổi nguồn"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:brightness-110 transition"
        style={{
          background: currentSource ? style.bg : "rgba(156,163,175,0.08)",
          color: currentSource ? style.color : "#6b7280",
          border: currentSource
            ? "1px solid transparent"
            : "1px dashed rgba(156,163,175,0.4)",
          minWidth: 60,
        }}
      >
        {currentSource ? (
          style.label || currentSource
        ) : (
          <>
            <Plus size={10} />
            <span>Nguồn</span>
          </>
        )}
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={setContactSource}
      className="inline-block"
      onSubmit={() => setEditing(false)}
    >
      <input type="hidden" name="contact_id" value={contactId} />
      <SourceInput
        inputRef={inputRef}
        defaultValue={currentSource ?? ""}
        datalistId={datalistId}
        onBlur={commit}
        onEnter={commit}
        onEscape={cancel}
      />
      <datalist id={datalistId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </form>
  );
}

function SourceInput({
  inputRef,
  defaultValue,
  datalistId,
  onBlur,
  onEnter,
  onEscape,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  defaultValue: string;
  datalistId: string;
  onBlur: () => void;
  onEnter: () => void;
  onEscape: () => void;
}) {
  const { pending } = useFormStatus();
  return (
    <input
      ref={inputRef}
      name="source"
      type="text"
      list={datalistId}
      defaultValue={defaultValue}
      disabled={pending}
      onBlur={onBlur}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onEnter();
        } else if (e.key === "Escape") {
          e.preventDefault();
          onEscape();
        }
      }}
      placeholder="Nguồn…"
      className="text-xs rounded-full px-2 py-0.5 focus:outline-none disabled:opacity-60"
      style={{
        background: "#1a1a1a",
        border: "1px solid #2a2a2a",
        color: "#e5e7eb",
        minWidth: 80,
        maxWidth: 110,
      }}
    />
  );
}
