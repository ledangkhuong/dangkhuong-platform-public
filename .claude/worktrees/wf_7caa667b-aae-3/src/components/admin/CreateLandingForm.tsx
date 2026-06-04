"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, RefreshCw } from "lucide-react";

export default function CreateLandingForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [pathname, setPathname] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleReset = () => {
    setPathname("");
    setName("");
    setDescription("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/landing-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathname: pathname.trim(),
          name: name.trim(),
          description: description.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Lỗi khi tạo");
        return;
      }
      handleReset();
      setOpen(false);
      router.refresh();
      // Mở thẳng trang detail vừa tạo để gắn pixel
      if (data.landing?.id) router.push(`/admin/pixel-settings/pages/${data.landing.id}`);
    } catch {
      setError("Lỗi kết nối");
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
        Thêm landing page
      </button>
    );
  }

  return (
    <div className="card-dark overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: "1px solid #2a2a2a" }}
      >
        <h3 className="text-sm font-semibold text-white">Thêm landing page mới</h3>
        <button
          onClick={() => { handleReset(); setOpen(false); }}
          className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Pathname <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={pathname}
            onChange={(e) => setPathname(e.target.value)}
            placeholder="/khoa-hoc-video-ai"
            required
            className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none font-mono"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
          />
          <p className="text-xs text-gray-500 mt-1">
            Đường dẫn trên dangkhuong.com (vd: <code>/khoa-hoc-video-ai</code>). Bắt đầu bằng dấu /.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Tên landing <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Khóa học Video AI — Bán hàng tháng 6"
            required
            className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Mô tả ngắn
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ghi chú nội bộ — chiến dịch, đối tượng..."
            className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg text-sm text-red-400"
               style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            {error}
          </div>
        )}

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
              <><RefreshCw size={14} className="animate-spin" />Đang tạo...</>
            ) : (
              <><Plus size={14} />Tạo + Gắn pixel</>
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
