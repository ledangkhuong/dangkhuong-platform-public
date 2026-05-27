"use client";

import { useId, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { setContactTags } from "@/lib/actions/contact-tags";
import {
  CONTACT_TAGS_MAX_COUNT,
  CONTACT_TAGS_MAX_LENGTH,
  parseContactTags,
} from "@/lib/contact-tags";
import { Tag as TagIcon, X, Plus, Loader2 } from "lucide-react";

/**
 * Inline editor for crm_contacts.tags (freeform multi-value labels).
 *
 * Read mode: just renders chips. Empty state shows a muted hint.
 *
 * Edit mode (canEdit=true): chips become removable with an ✕ button, a
 * datalist-backed input lets reps add a tag (Enter or "Thêm" button),
 * and a "Lưu thay đổi" button submits the whole list via the server
 * action `setContactTags`. The save button is hidden until the local
 * draft differs from the initial list — keeps the card quiet for the
 * common case of "I'm just looking".
 *
 * The server runs the same `parseContactTags` normalisation, so the
 * displayed chips will always match what's persisted even if the rep
 * typed odd casing or whitespace.
 */

interface TagsEditorProps {
  contactId: string;
  initialTags: string[];
  canEdit: boolean;
  /** Union of every distinct tag currently in use across all contacts. */
  existingTagSuggestions: string[];
}

function areSameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  for (const t of b) if (!set.has(t)) return false;
  return true;
}

export default function TagsEditor({
  contactId,
  initialTags,
  canEdit,
  existingTagSuggestions,
}: TagsEditorProps) {
  const datalistId = useId();
  // Local draft list — server normalises on save anyway, but we mirror
  // its rules here so chips look identical pre/post save.
  const [tags, setTags] = useState<string[]>(() =>
    parseContactTags(initialTags),
  );
  const [input, setInput] = useState("");

  const baseline = useMemo(() => parseContactTags(initialTags), [initialTags]);
  const dirty = !areSameSet(baseline, tags);
  const atCap = tags.length >= CONTACT_TAGS_MAX_COUNT;

  // Suggestions that aren't already on this contact, so the datalist
  // doesn't propose duplicates.
  const suggestionList = useMemo(() => {
    const onContact = new Set(tags);
    return existingTagSuggestions.filter((t) => !onContact.has(t));
  }, [existingTagSuggestions, tags]);

  function addTag(raw: string) {
    if (atCap) return;
    const [next] = parseContactTags(raw);
    if (!next) return;
    if (tags.includes(next)) {
      // Already present — just clear the input.
      setInput("");
      return;
    }
    setTags([...tags, next]);
    setInput("");
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  return (
    <div className="card-dark p-5">
      <div className="flex items-center gap-2 mb-4">
        <TagIcon size={16} className="text-[#D4A843]" />
        <h3 className="font-semibold text-white text-sm">Nhãn</h3>
        <span className="text-xs text-gray-500 ml-auto">
          {tags.length}/{CONTACT_TAGS_MAX_COUNT}
        </span>
      </div>

      {/* Chip list */}
      {tags.length === 0 ? (
        <p className="text-xs text-gray-500 mb-3">Chưa có nhãn nào.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                background: "rgba(212,168,67,0.08)",
                color: "#D4A843",
                border: "1px solid rgba(212,168,67,0.35)",
              }}
            >
              {tag}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="-mr-0.5 rounded-full p-0.5 transition-colors hover:bg-[rgba(212,168,67,0.18)]"
                  aria-label={`Xoá nhãn ${tag}`}
                >
                  <X size={11} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Add input (edit only) */}
      {canEdit && (
        <>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(input);
                }
              }}
              list={datalistId}
              maxLength={CONTACT_TAGS_MAX_LENGTH}
              disabled={atCap}
              placeholder={
                atCap
                  ? `Đã đạt tối đa ${CONTACT_TAGS_MAX_COUNT} nhãn`
                  : "Thêm nhãn..."
              }
              className="flex-1 px-3 py-1.5 text-sm rounded-md bg-[#1a1a1a] border border-[#2a2a2a] text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-[#D4A843] disabled:opacity-50"
            />
            <datalist id={datalistId}>
              {suggestionList.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <button
              type="button"
              onClick={() => addTag(input)}
              disabled={atCap || !input.trim()}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md text-black transition-opacity disabled:opacity-40"
              style={{ background: "#D4A843" }}
            >
              <Plus size={12} />
              Thêm
            </button>
          </div>

          {/* Save form — only when local list differs from initial. */}
          {dirty && (
            <form action={setContactTags} className="mt-3">
              <input type="hidden" name="contact_id" value={contactId} />
              <input type="hidden" name="tags" value={tags.join("\n")} />
              <SaveButton />
            </form>
          )}
        </>
      )}
    </div>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md text-black transition-opacity disabled:opacity-60"
      style={{ background: "#D4A843" }}
    >
      {pending ? (
        <>
          <Loader2 size={12} className="animate-spin" />
          Đang lưu...
        </>
      ) : (
        "Lưu thay đổi"
      )}
    </button>
  );
}
