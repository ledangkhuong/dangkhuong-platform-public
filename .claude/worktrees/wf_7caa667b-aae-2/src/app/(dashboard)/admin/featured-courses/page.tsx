"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import TopBar from "@/components/layout/TopBar";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Eye,
  EyeOff,
  Sparkles,
  BookOpen,
  Loader2,
} from "lucide-react";

interface Product {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  price: number | null;
  sale_price: number | null;
}

interface FeaturedCourse {
  id: string;
  product_id: string;
  badge_text: string;
  highlight_text: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  products: Product;
}

export default function AdminFeaturedCoursesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FeaturedCourse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [formProductId, setFormProductId] = useState("");
  const [formBadgeText, setFormBadgeText] = useState("Mới");
  const [formHighlightText, setFormHighlightText] = useState("");

  // Auth check
  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (!profile || !["admin", "manager"].includes(profile.role)) {
        router.push("/dashboard");
        return;
      }
    }
    check();
  }, []);

  // Fetch featured courses
  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/featured-courses");
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  };

  // Fetch all products for selection dropdown
  const fetchProducts = async () => {
    try {
      const { data } = await supabase
        .from("products")
        .select("id, title, slug, thumbnail, price, sale_price")
        .order("title", { ascending: true });
      setProducts(data ?? []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchItems();
    fetchProducts();
  }, []);

  const resetForm = () => {
    setFormProductId("");
    setFormBadgeText("Mới");
    setFormHighlightText("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!editingId && !formProductId) {
      setMessage({ type: "error", text: "Vui lòng chọn khoá học." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      if (editingId) {
        const res = await fetch("/api/admin/featured-courses", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            badge_text: formBadgeText.trim() || "Mới",
            highlight_text: formHighlightText.trim() || null,
          }),
        });
        if (res.ok) {
          setMessage({ type: "success", text: "Cập nhật thành công!" });
        } else {
          const err = await res.json();
          setMessage({ type: "error", text: err.error || "Lỗi cập nhật." });
        }
      } else {
        const res = await fetch("/api/admin/featured-courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: formProductId,
            badge_text: formBadgeText.trim() || "Mới",
            highlight_text: formHighlightText.trim() || null,
          }),
        });
        if (res.ok) {
          setMessage({ type: "success", text: "Thêm khoá học nổi bật thành công!" });
        } else {
          const err = await res.json();
          setMessage({ type: "error", text: err.error || "Lỗi thêm mới." });
        }
      }

      resetForm();
      fetchItems();
    } catch {
      setMessage({ type: "error", text: "Lỗi kết nối." });
    }

    setSaving(false);
  };

  const handleEdit = (item: FeaturedCourse) => {
    setEditingId(item.id);
    setFormProductId(item.product_id);
    setFormBadgeText(item.badge_text);
    setFormHighlightText(item.highlight_text || "");
    setShowForm(true);
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    await fetch("/api/admin/featured-courses", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !currentActive }),
    });
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá khoá học nổi bật này?")) return;
    await fetch("/api/admin/featured-courses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchItems();
  };

  // Products not yet featured (for dropdown)
  const availableProducts = products.filter(
    (p) => !items.some((i) => i.product_id === p.id)
  );

  const formatPrice = (price: number | null) => {
    if (!price) return "Miễn phí";
    return new Intl.NumberFormat("vi-VN").format(price) + "đ";
  };

  return (
    <div>
      <TopBar
        title="Khoá học nổi bật"
        subtitle="Quản lý khoá học quảng bá trên Dashboard (tối đa 3)"
      />

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Message */}
        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-emerald-900/30 text-emerald-400 border border-emerald-800/40"
                : "bg-red-900/30 text-red-400 border border-red-800/40"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white text-base">
              Khoá học nổi bật ({items.length}/3)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Hiển thị trên Dashboard của tất cả thành viên
            </p>
          </div>
          {items.length < 3 && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="btn-green"
            >
              <Plus size={15} />
              Thêm mới
            </button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <div className="card-dark p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">
              {editingId ? "Chỉnh sửa khoá học nổi bật" : "Thêm khoá học nổi bật"}
            </h3>

            {!editingId && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Chọn khoá học *
                </label>
                <select
                  value={formProductId}
                  onChange={(e) => setFormProductId(e.target.value)}
                  className="input-dark w-full"
                >
                  <option value="">-- Chọn khoá học --</option>
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} — {formatPrice(p.sale_price || p.price)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs text-gray-400 block mb-1">
                Badge (nhãn hiển thị)
              </label>
              <input
                type="text"
                value={formBadgeText}
                onChange={(e) => setFormBadgeText(e.target.value)}
                className="input-dark w-full"
                placeholder="VD: Mới, Hot, Best Seller"
                maxLength={30}
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">
                Mô tả ngắn (tuỳ chọn)
              </label>
              <input
                type="text"
                value={formHighlightText}
                onChange={(e) => setFormHighlightText(e.target.value)}
                className="input-dark w-full"
                placeholder="VD: Khoá học bán chạy nhất tháng này"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-green"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                {editingId ? "Cập nhật" : "Thêm"}
              </button>
              <button onClick={resetForm} className="btn-outline">
                <X size={14} />
                Huỷ
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-gray-500" size={24} />
          </div>
        ) : items.length === 0 ? (
          <div className="card-dark flex flex-col items-center justify-center py-16 text-center">
            <Sparkles size={40} className="text-gray-700 mb-3" />
            <p className="text-gray-500 text-sm">
              Chưa có khoá học nổi bật nào.
            </p>
            <p className="text-gray-600 text-xs mt-1">
              Thêm tối đa 3 khoá học để quảng bá trên Dashboard.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`card-dark p-4 flex items-center gap-4 transition-all ${
                  !item.is_active ? "opacity-50" : ""
                }`}
              >
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-lg bg-[#222] overflow-hidden shrink-0">
                  {item.products?.thumbnail ? (
                    <Image
                      src={item.products.thumbnail}
                      alt={item.products.title}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={20} className="text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge-green text-[10px] shrink-0">
                      {item.badge_text}
                    </span>
                    <span className="text-sm text-white font-medium truncate">
                      {item.products?.title || "Khoá học"}
                    </span>
                  </div>
                  {item.highlight_text && (
                    <p className="text-[11px] text-gray-500 truncate">
                      {item.highlight_text}
                    </p>
                  )}
                  <p className="text-[11px] text-[#D4A843] mt-0.5">
                    {formatPrice(
                      item.products?.sale_price || item.products?.price
                    )}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() =>
                      handleToggleActive(item.id, item.is_active)
                    }
                    className={`p-1.5 rounded-lg transition-colors ${
                      item.is_active
                        ? "text-emerald-400 hover:bg-emerald-500/10"
                        : "text-gray-500 hover:bg-white/5"
                    }`}
                    title={item.is_active ? "Tắt hiển thị" : "Bật hiển thị"}
                  >
                    {item.is_active ? (
                      <Eye size={15} />
                    ) : (
                      <EyeOff size={15} />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
