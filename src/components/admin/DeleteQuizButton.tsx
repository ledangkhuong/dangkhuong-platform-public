"use client";

import { useState } from "react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";

interface DeleteQuizButtonProps {
  quizId: string;
  quizTitle: string;
}

export default function DeleteQuizButton({
  quizId,
  quizTitle,
}: DeleteQuizButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/quizzes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz_id: quizId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert("Lỗi: " + (data.error || "Không thể xoá quiz"));
        return;
      }
      window.location.reload();
    } catch {
      alert("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-gray-500 hover:text-red-400 hover:bg-red-500/10"
        style={{ border: "1px solid #2a2a2a" }}
        title="Xoá quiz"
      >
        <Trash2 size={12} />
      </button>

      {showConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => !deleting && setShowConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(239,68,68,0.1)" }}
              >
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">
                  Xoá quiz?
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Hành động này không thể hoàn tác
                </p>
              </div>
            </div>

            <div
              className="p-3 rounded-lg text-sm text-gray-300"
              style={{ background: "#151515", border: "1px solid #252525" }}
            >
              <span className="text-gray-500">Quiz:</span>{" "}
              <span className="font-medium text-white">{quizTitle}</span>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Tất cả câu hỏi và lịch sử làm bài của học viên sẽ bị xoá vĩnh
              viễn.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                style={{ border: "1px solid #2a2a2a" }}
              >
                Huỷ bỏ
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
                style={{
                  background: deleting ? "#4a1a1a" : "#dc2626",
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Đang xoá...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Xác nhận xoá
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
