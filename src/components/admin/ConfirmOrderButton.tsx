"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2, ShieldCheck, X } from "lucide-react";

interface Props {
  orderCode: string;
  customerName: string | null;
  amount: number;
}

export default function ConfirmOrderButton({
  orderCode,
  customerName,
  amount,
}: Props) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    enrolled?: boolean;
  } | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/orders/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_code: orderCode }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult({ success: true, enrolled: data.enrolled });
        setTimeout(() => {
          router.refresh();
          setShowConfirm(false);
          setResult(null);
        }, 1800);
      } else {
        setResult({ success: false, message: data.error || "Lỗi không xác định" });
      }
    } catch {
      setResult({ success: false, message: "Lỗi kết nối" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        title="Xác nhận thanh toán"
        className="p-1.5 rounded-lg transition-all hover:scale-110"
        style={{ color: "#6b7280", background: "transparent" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#22c55e";
          e.currentTarget.style.background = "rgba(34,197,94,0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#6b7280";
          e.currentTarget.style.background = "transparent";
        }}
      >
        <CheckCircle size={15} />
      </button>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
        >
          <div
            className="card-dark p-6 max-w-md w-full relative"
            style={{ border: "1px solid rgba(34,197,94,0.3)" }}
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
                style={{ background: "rgba(34,197,94,0.15)" }}
              >
                <ShieldCheck size={20} className="text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Xác nhận thanh toán
                </h3>
                <p className="text-xs text-gray-500">
                  Cập nhật trạng thái &amp; cấp quyền truy cập
                </p>
              </div>
            </div>

            {result ? (
              <div className="space-y-3">
                {result.success ? (
                  <div
                    className="flex items-center gap-2 p-3 rounded-lg text-sm text-green-400 border border-green-400/20"
                    style={{ background: "rgba(34,197,94,0.08)" }}
                  >
                    <CheckCircle size={16} />
                    <div>
                      <div>Xác nhận thành công!</div>
                      {result.enrolled && (
                        <div className="text-xs text-green-500/70 mt-0.5">
                          Đã cấp quyền truy cập khoá học
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    className="p-3 rounded-lg text-sm text-red-400 border border-red-400/20"
                    style={{ background: "rgba(239,68,68,0.08)" }}
                  >
                    {result.message}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div
                  className="rounded-lg p-4 mb-4 space-y-2"
                  style={{
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                  }}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Mã đơn</span>
                    <span className="text-white font-mono font-bold">
                      {orderCode}
                    </span>
                  </div>
                  {customerName && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Khách hàng</span>
                      <span className="text-gray-300">{customerName}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Số tiền</span>
                    <span className="text-[#D4A843] font-bold">
                      {amount.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-4">
                  Thao tác sẽ cập nhật trạng thái thành <span className="text-green-400 font-medium">Đã thanh toán</span>,
                  cấp quyền truy cập khoá học và gửi email xác nhận cho khách.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                    style={{
                      background: "rgba(34,197,94,0.15)",
                      color: "#22c55e",
                      border: "1px solid rgba(34,197,94,0.4)",
                    }}
                  >
                    {loading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <CheckCircle size={15} />
                    )}
                    {loading ? "Đang xử lý..." : "Xác nhận đã thanh toán"}
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
