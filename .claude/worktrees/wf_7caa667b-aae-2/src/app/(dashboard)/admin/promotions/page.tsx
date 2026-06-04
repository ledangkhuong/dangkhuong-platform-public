"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  Megaphone,
  GripVertical,
  Link2,
  Loader2,
} from "lucide-react";

interface Promotion {
  id: string;
  label: string;
  text: string;
  link: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export default function AdminPromotionsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [formLabel, setFormLabel] = useState("Khoá học mới 🔥");
  const [formText, setFormText] = useState("");
  const [formLink, setFormLink] = useState("");

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

  // Fetch promotions
  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promotions");
      if (res.ok) {
        const data = await res.json();
        setPromotions(data);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const resetForm = () => {
    setFormLabel("Khoá học mới 🔥");
    setFormText("");
    setFormLink("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!formText.trim()) {
      setMessage({ type: "error", text: "Vui lòng nhập nội dung quảng cáo." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      if (editingId) {
        const res = await fetch("/api/admin/promotions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            label: formLabel.trim(),
            text: formText.trim(),
            link: formLink.trim() || null,
          }),
        });
        if (res.ok) {
          setMessage({ type: "success", text: "Cập nhật thành công!" });
        } else {
          const err = await res.json();
          setMessage({ type: "error", text: err.error || "Lỗi cập nhật." });
        }
      } else {
        const res = await fetch("/api/admin/promotions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: formLabel.trim(),
            text: formText.trim(),
            link: formLink.trim() || null,
          }),
        });
        if (res.ok) {
          setMessage({ type: "success", text: "Tạo quảng cáo thành công!" });
        } else {
          const err = await res.json();
          setMessage({ type: "error", text: err.error || "Lỗi tạo mới." });
        }
      }

      resetForm();
      fetchPromotions();
    } catch {
      setMessage({ type: "error", text: "Lỗi kết nối." });
    }

    setSaving(false);
  };

  const handleEdit = (promo: Promotion) => {
    setEditingId(promo.id);
    setFormLabel(promo.label);
    setFormText(promo.text);
    setFormLink(promo.link || "");
    setShowForm(true);
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    await fetch("/api/admin/promotions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !currentActive }),
    });
    fetchPromotions();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá quảng cáo này?")) return;
    await fetch("/api/admin/promotions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchPromotions();
  };

  return (
    <div>
      <TopBar
        title="Quảng cáo đầu trang"
        subtitle="Quản lý banner quảng cáo hiển thị trên Dashboard"
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
              Danh sách quảng cáo
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Các mục quảng cáo hiển thị xoay vòng trên đầu trang Dashboard
            </p>
          </div>
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
        </div>

        {/* Preview */}
        {promotions.filter((p) => p.is_active).length > 0 && (
          <div className="card-dark p-4">
            <p className="text-xs text-gray-500 mb-2 font-medium">
              Xem trước banner:
            </p>
            <div className="notification-bar flex flex-wrap items-center justify-center gap-x-2 gap-y-1 py-1.5 px-3 text-sm rounded-lg">
              <Megaphone size={13} className="text-[#D4A843] shrink-0" />
              <span className="text-gray-400 text-xs">
                Lê Đăng Khương vừa cập nhật:
              </span>
              <span className="badge-green shrink-0">
                {promotions.find((p) => p.is_active)?.label}
              </span>
              <span className="text-white text-xs font-medium">
                {promotions.find((p) => p.is_active)?.text}
              </span>
              <div className="flex gap-1 ml-1">
                {promotions
                  .filter((p) => p.is_active)
                  .map((p, i) => (
                    <div
                      key={p.id}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: i === 0 ? "#D4A843" : "#333" }}
                    />
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="card-dark p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">
              {editingId ? "Chỉnh sửa quảng cáo" : "Thêm quảng cáo mới"}
            </h3>

            <div>
              <label className="text-xs text-gray-400 block mb-1">
                Nhãn (badge)
              </label>
              <input
                type="text"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                className="input-dark w-full"
                placeholder="VD: Khoá học mới 🔥"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">
                Nội dung quảng cáo *
              </label>
              <input
                type="text"
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                className="input-dark w-full"
                placeholder="VD: Học chưa xong tiền đã về"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">
                Đường dẫn (tuỳ chọn)
              </label>
              <input
                type="text"
                value={formLink}
                onChange={(e) => setFormLink(e.target.value)}
                className="input-dark w-full"
                placeholder="VD: /courses/hoc-chua-xong-tien-da-ve"
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
        ) : promotions.length === 0 ? (
          <div className="card-dark flex flex-col items-center justify-center py-16 text-center">
            <Megaphone size={40} className="text-gray-700 mb-3" />
            <p className="text-gray-500 text-sm">
              Chưa có quảng cáo nào.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {promotions.map((promo) => (
              <div
                key={promo.id}
                className={`card-dark p-4 flex items-center gap-4 transition-all ${
                  !promo.is_active ? "opacity-50" : ""
                }`}
              >
                <GripVertical
                  size={16}
                  className="text-gray-600 shrink-0 cursor-grab"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge-green text-[10px] shrink-0">
                      {promo.label}
                    </span>
                    <span className="text-sm text-white font-medium truncate">
                      {promo.text}
                    </span>
                  </div>
                  {promo.link && (
                    <div className="flex items-center gap-1 text-[11px] text-gray-500">
                      <Link2 size={10} />
                      {promo.link}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggleActive(promo.id, promo.is_active)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      promo.is_active
                        ? "text-emerald-400 hover:bg-emerald-500/10"
                        : "text-gray-500 hover:bg-white/5"
                    }`}
                    title={promo.is_active ? "Tắt hiển thị" : "Bật hiển thị"}
                  >
                    {promo.is_active ? (
                      <Eye size={15} />
                    ) : (
                      <EyeOff size={15} />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(promo)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(promo.id)}
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
