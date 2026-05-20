"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, MessageSquare, Check, X, Loader2, UserPlus } from "lucide-react";

interface StaffMember {
  id: string;
  full_name: string;
}

interface InterestActionsProps {
  interestId: string;
  currentStatus: string;
  currentNotes: string | null;
  assignedTo: string | null;
  staffList: StaffMember[];
}

export default function InterestActions({
  interestId,
  currentStatus,
  currentNotes,
  assignedTo,
  staffList,
}: InterestActionsProps) {
  const router = useRouter();
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [notes, setNotes] = useState(currentNotes || "");
  const [loading, setLoading] = useState<string | null>(null);

  async function updateInterest(data: Record<string, unknown>, loadingKey: string) {
    setLoading(loadingKey);
    try {
      const res = await fetch("/api/crm/interests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interest_id: interestId, ...data }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      // silently fail
    } finally {
      setLoading(null);
      setShowAssign(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      {/* Contacted button */}
      {currentStatus === "new" && (
        <button
          onClick={() =>
            updateInterest(
              { status: "contacted", contacted: true, contacted_at: new Date().toISOString() },
              "contacted"
            )
          }
          disabled={loading === "contacted"}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors"
          style={{
            background: "rgba(245,158,11,0.1)",
            color: "#f59e0b",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
          title="Đánh dấu đã liên hệ"
        >
          {loading === "contacted" ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <Phone size={11} />
          )}
          Liên hệ
        </button>
      )}

      {/* Converted button */}
      {(currentStatus === "new" || currentStatus === "contacted") && (
        <button
          onClick={() => updateInterest({ status: "converted" }, "converted")}
          disabled={loading === "converted"}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors"
          style={{
            background: "rgba(34,197,94,0.1)",
            color: "#22c55e",
            border: "1px solid rgba(34,197,94,0.2)",
          }}
          title="Đánh dấu đã mua"
        >
          {loading === "converted" ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <Check size={11} />
          )}
          Đã mua
        </button>
      )}

      {/* Dismiss */}
      {currentStatus !== "dismissed" && currentStatus !== "converted" && (
        <button
          onClick={() => updateInterest({ status: "dismissed" }, "dismissed")}
          disabled={loading === "dismissed"}
          className="inline-flex items-center px-1.5 py-1 rounded-lg text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
          style={{
            background: "rgba(107,114,128,0.06)",
            border: "1px solid rgba(107,114,128,0.1)",
          }}
          title="Bỏ qua"
        >
          {loading === "dismissed" ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <X size={11} />
          )}
        </button>
      )}

      {/* Assign sale */}
      <div className="relative">
        <button
          onClick={() => setShowAssign(!showAssign)}
          className={`inline-flex items-center px-1.5 py-1 rounded-lg text-[11px] transition-colors ${
            assignedTo
              ? "text-purple-400"
              : "text-gray-500 hover:text-gray-300"
          }`}
          style={{
            background: assignedTo
              ? "rgba(139,92,246,0.08)"
              : "rgba(107,114,128,0.06)",
            border: `1px solid ${
              assignedTo ? "rgba(139,92,246,0.15)" : "rgba(107,114,128,0.1)"
            }`,
          }}
          title="Gán sale"
        >
          <UserPlus size={11} />
        </button>
        {showAssign && (
          <div
            className="absolute right-0 top-full mt-1 z-30 rounded-lg shadow-xl py-1 min-w-[180px]"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
          >
            <div className="px-3 py-1.5 text-[10px] text-gray-500 font-medium uppercase tracking-wide">
              Gán cho sale
            </div>
            {assignedTo && (
              <button
                onClick={() => updateInterest({ assigned_to: null }, "unassign")}
                className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-white/5 transition-colors"
              >
                Bỏ gán
              </button>
            )}
            {staffList.map((s) => (
              <button
                key={s.id}
                onClick={() => updateInterest({ assigned_to: s.id }, `assign-${s.id}`)}
                disabled={!!loading}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                  assignedTo === s.id
                    ? "text-purple-400 bg-purple-500/5"
                    : "text-gray-300 hover:bg-white/5"
                }`}
              >
                {s.full_name}
                {assignedTo === s.id && (
                  <Check size={10} className="inline ml-1" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Note button */}
      <button
        onClick={() => setShowNoteForm(!showNoteForm)}
        className={`inline-flex items-center px-1.5 py-1 rounded-lg text-[11px] transition-colors ${
          currentNotes ? "text-[#D4A843]" : "text-gray-500 hover:text-gray-300"
        }`}
        style={{
          background: currentNotes
            ? "rgba(212,168,67,0.08)"
            : "rgba(107,114,128,0.06)",
          border: `1px solid ${
            currentNotes ? "rgba(212,168,67,0.15)" : "rgba(107,114,128,0.1)"
          }`,
        }}
        title="Ghi chú"
      >
        <MessageSquare size={11} />
      </button>

      {/* Note modal */}
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
                onClick={() => {
                  updateInterest({ notes: notes.trim() }, "notes");
                  setShowNoteForm(false);
                }}
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
