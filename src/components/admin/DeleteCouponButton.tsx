"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle, CheckCircle2, X } from "lucide-react";

interface Props {
  couponId: string;
  couponCode: string;
}

export default function DeleteCouponButton({ couponId, couponCode }: Props) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleDelete() {
    setLoading(true);
    setResult(null);
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coupon_id: couponId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult("success");
        setTimeout(() => {
          router.refresh();
          setShowConfirm(false);
          setResult(null);
        }, 1500);
      } else {
        setResult("error");
        setErrorMsg(data.error || "Lỗi không xác định");
      }
    } catch {
      setResult("error");
      setErrorMsg("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        title="Xoá mã giảm giá"
        className="p-1.5 rounded-lg transition-all hover:scale-110"
        style={{
          color: "#6b7280",
          background: "transparent",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#ef4444";
          e.currentTarget.style.background = "rgba(239,68,68,0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#6b7280";
          e.currentTarget.style.background = "transparent";
        }}
      >
        <Trash2 size={15} />
      </button>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
        >
          <div
            className="card-dark p-6 max-w-md w-full relative"
            style={{ border: "1px solid rgba(239,68,68,0.3)" }}
          >
            <button
              onClick={() => {
                setShowConfirm(false);
                setResult(null);
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(239,68,68,0.15)" }}
              >
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Xoá mã giảm giá
                </h3>
                <p className="text-xs text-gray-500">
                  Hành động không thể hoàn tác
                </p>
              </div>
            </div>

            {result === "success" ? (
              <div
                className="flex items-center gap-2 p-3 rounded-lg text-sm text-amber-400 border border-amber-400/20"
                style={{ background: "rgba(212,168,67,0.08)" }}
              >
                <CheckCircle2 size={16} />
                Đã xoá mã giảm giá thành công
              </div>
            ) : result === "error" ? (
              <div
                className="p-3 rounded-lg text-sm text-red-400 border border-red-400/20"
                style={{ background: "rgba(239,68,68,0.08)" }}
              >
                {errorMsg}
              </div>
            ) : (
              <>
                <div
                  className="rounded-lg p-4 mb-4"
                  style={{
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                  }}
                >
                  <p className="text-sm text-gray-300">
                    Bạn có chắc muốn xoá mã giảm giá{" "}
                    <span className="text-red-400 font-bold font-mono">
                      {couponCode}
                    </span>{" "}
                    không?
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                    style={{
                      background: "rgba(239,68,68,0.15)",
                      color: "#ef4444",
                      border: "1px solid rgba(239,68,68,0.4)",
                    }}
                  >
                    {loading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Trash2 size={15} />
                    )}
                    {loading ? "Đang xoá..." : "Xác nhận xoá"}
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition-colors"
                    style={{
                      background: "#1f1f1f",
                      border: "1px solid #333",
                    }}
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
