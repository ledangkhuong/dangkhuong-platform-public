"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, MessageSquare, Check, X, Loader2 } from "lucide-react";

interface InterestActionsProps {
  interestId: string;
  currentStatus: string;
  currentNotes: string | null;
  contactedByName: string | null;
  contactedAt: string | null;
}

export default function InterestActions({
  interestId,
  currentStatus,
  currentNotes,
  contactedByName,
  contactedAt,
}: InterestActionsProps) {
  const router = useRouter();
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [notes, setNotes] = useState(currentNotes || "");
  const [loading, setLoading] = useState<string | null>(null);

  async function updateStatus(status: string, extraData?: Record<string, unknown>) {
    setLoading(status);
    try {
      const res = await fetch("/api/crm/interests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interest_id: interestId,
          status,
          ...extraData,
        }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      // silently fail
    } finally {
      setLoading(null);
    }
  }

  async function saveNotes() {
    setLoading("notes");
    try {
      const res = await fetch("/api/crm/interests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interest_id: interestId,
          notes: notes.trim(),
        }),
      });
      if (res.ok) {
        setShowNoteForm(false);
        router.refresh();
      }
    } catch {
      // silently fail
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {currentStatus === "new" && (
        <button
          onClick={() =>
            updateStatus("contacted", {
              contacted: true,
              contacted_at: new Date().toISOString(),
            })
          }
          disabled={loading === "contacted"}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: "rgba(245,158,11,0.1)",
            color: "#f59e0b",
            border: "1px solid rgba(245,158,11,0.25)",
          }}
          title="Đánh dấu đã liên hệ"
        >
          {loading === "contacted" ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Phone size={12} />
          )}
          Đã liên hệ
        </button>
      )}

      {(currentStatus === "new" || currentStatus === "contacted") && (
        <button
          onClick={() => updateStatus("converted")}
          disabled={loading === "converted"}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: "rgba(34,197,94,0.1)",
            color: "#22c55e",
            border: "1px solid rgba(34,197,94,0.25)",
          }}
          title="Đánh dấu đã mua"
        >
          {loading === "converted" ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Check size={12} />
          )}
          Đã mua
        </button>
      )}

      {currentStatus !== "dismissed" && (
        <button
          onClick={() => updateStatus("dismissed")}
          disabled={loading === "dismissed"}
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors text-gray-500 hover:text-gray-300"
          style={{
            background: "rgba(107,114,128,0.1)",
            border: "1px solid rgba(107,114,128,0.15)",
          }}
          title="Bỏ qua"
        >
          {loading === "dismissed" ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <X size={12} />
          )}
        </button>
      )}

      {/* Note toggle */}
      <button
        onClick={() => setShowNoteForm(!showNoteForm)}
        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white transition-colors"
        style={{
          background: "rgba(107,114,128,0.08)",
          border: "1px solid rgba(107,114,128,0.15)",
        }}
        title="Ghi chú"
      >
        <MessageSquare size={12} />
      </button>

      {/* Note form (inline) */}
      {showNoteForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="rounded-xl p-5 w-full max-w-md mx-4"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
          >
            <h4 className="text-sm font-semibold text-white mb-3">
              Ghi chú chăm sóc
            </h4>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nhập ghi chú về khách hàng này..."
              rows={4}
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white placeholder:text-gray-500 resize-none focus:outline-none focus:border-[#D4A843] transition-colors"
              maxLength={2000}
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setShowNoteForm(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
                style={{
                  background: "rgba(107,114,128,0.1)",
                  border: "1px solid #2a2a2a",
                }}
              >
                Huỷ
              </button>
              <button
                onClick={saveNotes}
                disabled={loading === "notes"}
                className="btn-green text-xs py-1.5 px-4 inline-flex items-center gap-1"
              >
                {loading === "notes" ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Check size={12} />
                )}
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
