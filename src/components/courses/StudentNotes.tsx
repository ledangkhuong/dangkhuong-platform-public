"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookMarked,
  PenLine,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  Loader2,
  Star,
  Clock,
  Check,
  X,
} from "lucide-react";

interface Note {
  id: string;
  content: string;
  timestamp_sec: number;
  is_bookmark: boolean;
  created_at: string;
  updated_at: string;
}

interface StudentNotesProps {
  lessonId: string;
  productId: string;
}

function formatTimestamp(sec: number): string {
  if (sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  return `${days} ngày trước`;
}

export default function StudentNotes({
  lessonId,
  productId,
}: StudentNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [content, setContent] = useState("");
  const [timestampSec, setTimestampSec] = useState("");
  const [isBookmark, setIsBookmark] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  // Feedback
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/notes?lesson_id=${lessonId}&product_id=${productId}`
      );
      if (res.ok) {
        const json = await res.json();
        setNotes(json.notes ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [lessonId, productId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setError(null);

    // Parse timestamp "m:ss" to seconds
    let ts = 0;
    if (timestampSec.trim()) {
      const parts = timestampSec.trim().split(":");
      if (parts.length === 2) {
        ts = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      } else if (parts.length === 1) {
        ts = parseInt(parts[0], 10);
      }
      if (isNaN(ts)) ts = 0;
    }

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: lessonId,
          product_id: productId,
          content: content.trim(),
          timestamp_sec: ts,
          is_bookmark: isBookmark,
        }),
      });

      if (res.ok) {
        setContent("");
        setTimestampSec("");
        setIsBookmark(false);
        setShowForm(false);
        fetchNotes();
      } else {
        const json = await res.json();
        setError(json.error || "Không thể tạo ghi chú.");
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editContent.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, content: editContent.trim() }),
      });

      if (res.ok) {
        setEditingId(null);
        setEditContent("");
        fetchNotes();
      } else {
        const json = await res.json();
        setError(json.error || "Không thể cập nhật ghi chú.");
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
      } else {
        const json = await res.json();
        setError(json.error || "Không thể xóa ghi chú.");
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    }
  };

  const handleToggleBookmark = async (note: Note) => {
    setError(null);
    try {
      const res = await fetch("/api/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: note.id, is_bookmark: !note.is_bookmark }),
      });

      if (res.ok) {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === note.id ? { ...n, is_bookmark: !n.is_bookmark } : n
          )
        );
      }
    } catch {
      // silent
    }
  };

  const bookmarkCount = notes.filter((n) => n.is_bookmark).length;

  return (
    <div className="card-dark overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookMarked size={16} className="text-[#D4A843]" />
          <h3 className="font-semibold text-white text-sm">
            Ghi chú & Bookmark
          </h3>
          {notes.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#D4A843]/15 text-[#D4A843] font-medium">
              {notes.length}
            </span>
          )}
          {bookmarkCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 font-medium flex items-center gap-0.5">
              <Star size={8} className="fill-current" />
              {bookmarkCount}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-gray-500" />
        ) : (
          <ChevronDown size={16} className="text-gray-500" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Error message */}
          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Add note button / form */}
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-[#D4A843] border border-[#D4A843]/20 hover:bg-[#D4A843]/5 transition-colors"
            >
              <Plus size={14} />
              Thêm ghi chú
            </button>
          ) : (
            <form onSubmit={handleCreate} className="space-y-2">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nội dung ghi chú..."
                className="w-full input-dark resize-none text-sm"
                rows={3}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 flex-1">
                  <Clock size={12} className="text-gray-500 shrink-0" />
                  <input
                    type="text"
                    value={timestampSec}
                    onChange={(e) => setTimestampSec(e.target.value)}
                    placeholder="0:00"
                    className="input-dark text-xs w-16 py-1 px-2 text-center"
                  />
                  <button
                    type="button"
                    onClick={() => setIsBookmark(!isBookmark)}
                    className={`p-1.5 rounded transition-colors ${
                      isBookmark
                        ? "text-yellow-400 bg-yellow-500/15"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                    title={isBookmark ? "Bỏ bookmark" : "Đánh dấu bookmark"}
                  >
                    <Star
                      size={14}
                      className={isBookmark ? "fill-current" : ""}
                    />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setContent("");
                      setTimestampSec("");
                      setIsBookmark(false);
                      setError(null);
                    }}
                    className="p-1.5 rounded text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
                  >
                    <X size={14} />
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !content.trim()}
                    className="flex items-center gap-1 text-xs py-1.5 px-3 rounded-lg font-medium bg-[#D4A843]/15 text-[#D4A843] border border-[#D4A843]/30 hover:bg-[#D4A843]/25 disabled:opacity-40 transition-colors"
                  >
                    {submitting ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Plus size={12} />
                    )}
                    Lưu
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Notes list */}
          {loading ? (
            <div className="flex items-center justify-center py-6 text-gray-500">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : notes.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-4">
              Chưa có ghi chú nào. Thêm ghi chú đầu tiên!
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="group rounded-lg p-3 space-y-1.5"
                  style={{
                    background: note.is_bookmark
                      ? "rgba(212,168,67,0.04)"
                      : "#161616",
                    border: note.is_bookmark
                      ? "1px solid rgba(212,168,67,0.15)"
                      : "1px solid #222",
                  }}
                >
                  {editingId === note.id ? (
                    /* Edit mode */
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full input-dark resize-none text-sm"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditContent("");
                          }}
                          className="p-1.5 rounded text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
                        >
                          <X size={14} />
                        </button>
                        <button
                          onClick={() => handleUpdate(note.id)}
                          disabled={saving || !editContent.trim()}
                          className="flex items-center gap-1 text-xs py-1 px-2.5 rounded-lg font-medium bg-[#D4A843]/15 text-[#D4A843] border border-[#D4A843]/30 hover:bg-[#D4A843]/25 disabled:opacity-40 transition-colors"
                        >
                          {saving ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Check size={12} />
                          )}
                          Lưu
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {note.timestamp_sec > 0 && (
                            <span className="inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-[#D4A843] mb-1">
                              {formatTimestamp(note.timestamp_sec)}
                            </span>
                          )}
                          <p className="text-sm text-gray-300 whitespace-pre-line break-words">
                            {note.content}
                          </p>
                        </div>
                        {/* Actions — show on hover */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => handleToggleBookmark(note)}
                            className={`p-1 rounded transition-colors ${
                              note.is_bookmark
                                ? "text-yellow-400"
                                : "text-gray-600 hover:text-yellow-400"
                            }`}
                            title={
                              note.is_bookmark
                                ? "Bỏ bookmark"
                                : "Đánh dấu bookmark"
                            }
                          >
                            <Star
                              size={12}
                              className={
                                note.is_bookmark ? "fill-current" : ""
                              }
                            />
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(note.id);
                              setEditContent(note.content);
                            }}
                            className="p-1 rounded text-gray-600 hover:text-gray-300 transition-colors"
                            title="Sửa ghi chú"
                          >
                            <PenLine size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="p-1 rounded text-gray-600 hover:text-red-400 transition-colors"
                            title="Xóa ghi chú"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-600">
                        {timeAgo(note.created_at)}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
