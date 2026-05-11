"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle, CheckCircle2, X } from "lucide-react";

interface Props {
  userIds: string[];
  count: number;
}

export default function DeleteFakeUsers({ userIds, count }: Props) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ deleted: number; errors: string[] } | null>(null);

  async function handleDelete() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: userIds }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setTimeout(() => {
          router.refresh();
          setShowConfirm(false);
          setResult(null);
        }, 2000);
      } else {
        setResult({ deleted: 0, errors: [data.error || "Lỗi không xác định"] });
      }
    } catch {
      setResult({ deleted: 0, errors: ["Lỗi kết nối"] });
    } finally {
      setLoading(false);
    }
  }

  if (count === 0) return null;

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
        style={{
          background: "rgba(239,68,68,0.1)",
          color: "#ef4444",
          border: "1px solid rgba(239,68,68,0.3)",
        }}
      >
        <Trash2 size={15} />
        Xoá {count} tài khoản ảo
      </button>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="card-dark p-6 max-w-md w-full relative" style={{ border: "1px solid rgba(239,68,68,0.3)" }}>
            <button
              onClick={() => { setShowConfirm(false); setResult(null); }}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Xoá tài khoản ảo</h3>
                <p className="text-xs text-gray-500">Hành động không thể hoàn tác</p>
              </div>
            </div>

            {result ? (
              <div className="space-y-3">
                {result.deleted > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg text-sm text-green-400 border border-green-400/20" style={{ background: "rgba(34,197,94,0.08)" }}>
                    <CheckCircle2 size={16} />
                    Đã xoá thành công {result.deleted} tài khoản
                  </div>
                )}
                {result.errors.length > 0 && (
                  <div className="p-3 rounded-lg text-sm text-red-400 border border-red-400/20" style={{ background: "rgba(239,68,68,0.08)" }}>
                    {result.errors.map((e, i) => <div key={i}>{e}</div>)}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="rounded-lg p-4 mb-4" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
                  <p className="text-sm text-gray-300 mb-3">
                    Sẽ xoá <span className="text-red-400 font-bold">{count}</span> tài khoản có các dấu hiệu:
                  </p>
                  <ul className="space-y-1.5 text-xs text-gray-400">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      Chưa bao giờ đăng nhập
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      XP = 0, không hoạt động
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      Không có đơn hàng nào
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      Không phải nhân viên (admin/manager/...)
                    </li>
                  </ul>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                    style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.4)" }}
                  >
                    {loading ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    {loading ? "Đang xoá..." : `Xác nhận xoá ${count} tài khoản`}
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition-colors"
                    style={{ background: "#1f1f1f", border: "1px solid #333" }}
                  >
                    Huỷ
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
