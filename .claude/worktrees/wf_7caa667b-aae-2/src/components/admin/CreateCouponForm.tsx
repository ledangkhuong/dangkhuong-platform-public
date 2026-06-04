"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, X, Percent, DollarSign } from "lucide-react";

function generateCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (const byte of array) {
    result += chars[byte % chars.length];
  }
  return result;
}

export default function CreateCouponForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [minOrderAmount, setMinOrderAmount] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const handleAutoGenerate = () => {
    setCode(generateCode());
  };

  const handleReset = () => {
    setCode("");
    setDiscountType("percent");
    setDiscountValue("");
    setMaxUses("");
    setMinOrderAmount("");
    setExpiresAt("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          discount_type: discountType,
          discount_value: Number(discountValue),
          max_uses: maxUses ? Number(maxUses) : null,
          min_order_amount: minOrderAmount ? Number(minOrderAmount) : 0,
          expires_at: expiresAt || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Lỗi khi tạo mã giảm giá");
        return;
      }

      handleReset();
      setOpen(false);
      router.refresh();
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
        style={{
          background: "linear-gradient(135deg, #D4A843, #b8922e)",
          boxShadow: "0 2px 8px rgba(212,168,67,0.3)",
        }}
      >
        <Plus size={16} />
        Tạo mã giảm giá
      </button>
    );
  }

  return (
    <div className="card-dark overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: "1px solid #2a2a2a" }}
      >
        <h3 className="text-sm font-semibold text-white">Tạo mã giảm giá mới</h3>
        <button
          onClick={() => { handleReset(); setOpen(false); }}
          className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Code */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Mã giảm giá
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="VD: SALE2024"
              required
              className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none transition-colors"
              style={{
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
              }}
            />
            <button
              type="button"
              onClick={handleAutoGenerate}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-white transition-colors"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
              title="Tạo mã tự động"
            >
              <RefreshCw size={13} />
              Tạo tự động
            </button>
          </div>
        </div>

        {/* Discount type + value */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Loại giảm giá
            </label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setDiscountType("percent")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  discountType === "percent"
                    ? "text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
                style={{
                  background: discountType === "percent" ? "rgba(212,168,67,0.15)" : "#1a1a1a",
                  border: `1px solid ${discountType === "percent" ? "rgba(212,168,67,0.4)" : "#2a2a2a"}`,
                }}
              >
                <Percent size={13} />
                Phần trăm
              </button>
              <button
                type="button"
                onClick={() => setDiscountType("fixed")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  discountType === "fixed"
                    ? "text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
                style={{
                  background: discountType === "fixed" ? "rgba(212,168,67,0.15)" : "#1a1a1a",
                  border: `1px solid ${discountType === "fixed" ? "rgba(212,168,67,0.4)" : "#2a2a2a"}`,
                }}
              >
                <DollarSign size={13} />
                Cố định
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Giá trị {discountType === "percent" ? "(%)" : "(VNĐ)"}
            </label>
            <input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === "percent" ? "10" : "50000"}
              required
              min={1}
              max={discountType === "percent" ? 100 : undefined}
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none transition-colors"
              style={{
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
              }}
            />
          </div>
        </div>

        {/* Max uses + Min order */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Số lượt sử dụng tối đa
            </label>
            <input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Không giới hạn"
              min={1}
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none transition-colors"
              style={{
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Đơn tối thiểu (VNĐ)
            </label>
            <input
              type="number"
              value={minOrderAmount}
              onChange={(e) => setMinOrderAmount(e.target.value)}
              placeholder="0"
              min={0}
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none transition-colors"
              style={{
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
              }}
            />
          </div>
        </div>

        {/* Expiry */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Ngày hết hạn (tuỳ chọn)
          </label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none transition-colors"
            style={{
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
              colorScheme: "dark",
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div
            className="p-3 rounded-lg flex items-center gap-2 text-sm"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            <span className="text-red-400">{error}</span>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #D4A843, #b8922e)",
              boxShadow: "0 2px 8px rgba(212,168,67,0.3)",
            }}
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Đang tạo...
              </>
            ) : (
              <>
                <Plus size={14} />
                Tạo mã
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => { handleReset(); setOpen(false); }}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition-colors"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
          >
            Huỷ
          </button>
        </div>
      </form>
    </div>
  );
}
