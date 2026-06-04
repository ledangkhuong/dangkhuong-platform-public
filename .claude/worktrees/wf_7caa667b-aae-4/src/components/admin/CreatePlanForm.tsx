"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, X } from "lucide-react";

type BillingPeriod = "monthly" | "3months" | "6months" | "yearly";

const BILLING_OPTIONS: { value: BillingPeriod; label: string }[] = [
  { value: "monthly", label: "Hàng tháng" },
  { value: "3months", label: "3 tháng" },
  { value: "6months", label: "6 tháng" },
  { value: "yearly", label: "1 năm" },
];

const TIER_OPTIONS = [
  { value: "member", label: "Member" },
  { value: "vip", label: "VIP" },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function CreatePlanForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [features, setFeatures] = useState("");
  const [tierGranted, setTierGranted] = useState("member");
  const [sortOrder, setSortOrder] = useState("0");

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(slugify(val));
  };

  const handleReset = () => {
    setName("");
    setSlug("");
    setDescription("");
    setBillingPeriod("monthly");
    setPrice("");
    setOriginalPrice("");
    setFeatures("");
    setTierGranted("member");
    setSortOrder("0");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      // Parse features: each line is one feature
      const featuresList = features
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean);

      const res = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          billing_period: billingPeriod,
          price: Number(price),
          original_price: originalPrice ? Number(originalPrice) : null,
          features: featuresList,
          tier_granted: tierGranted,
          sort_order: Number(sortOrder) || 0,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Lỗi khi tạo gói đăng ký");
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
        Tạo gói đăng ký
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
        <h3 className="text-sm font-semibold text-white">
          Tạo gói đăng ký mới
        </h3>
        <button
          onClick={() => {
            handleReset();
            setOpen(false);
          }}
          className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Name + Slug */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Tên gói
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="VD: Gói Member 6 tháng"
              required
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none transition-colors"
              style={{
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Slug (tự động)
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="member-6-thang"
              required
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none transition-colors"
              style={{
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
              }}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Mô tả
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả ngắn gọn về gói"
            className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none transition-colors"
            style={{
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
            }}
          />
        </div>

        {/* Billing period + Tier */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Chu kỳ thanh toán
            </label>
            <select
              value={billingPeriod}
              onChange={(e) =>
                setBillingPeriod(e.target.value as BillingPeriod)
              }
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none transition-colors"
              style={{
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
                colorScheme: "dark",
              }}
            >
              {BILLING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Tier cấp quyền
            </label>
            <select
              value={tierGranted}
              onChange={(e) => setTierGranted(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none transition-colors"
              style={{
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
                colorScheme: "dark",
              }}
            >
              {TIER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Price + Original Price */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Giá (VND)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="299000"
              required
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
              Giá gốc (VND, tuỳ chọn)
            </label>
            <input
              type="number"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              placeholder="399000"
              min={0}
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none transition-colors"
              style={{
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
              }}
            />
          </div>
        </div>

        {/* Features */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Tính năng (mỗi dòng 1 tính năng)
          </label>
          <textarea
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            placeholder={"Truy cập toàn bộ khoá học\nHỗ trợ 1-1\nCộng đồng VIP"}
            rows={4}
            className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none transition-colors resize-none"
            style={{
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
            }}
          />
        </div>

        {/* Sort order */}
        <div className="w-1/2">
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Thứ tự hiển thị
          </label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            placeholder="0"
            min={0}
            className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none transition-colors"
            style={{
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
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
                Tạo gói
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              handleReset();
              setOpen(false);
            }}
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
