"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  RefreshCw,
  Check,
  X,
  Shield,
  ShieldOff,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type { LandingPage, PixelConfig } from "@/types/pixel-config";

interface Props {
  landing: LandingPage;
  attached: PixelConfig[];       // pixels hiện đang gắn (theo thứ tự position)
  allPixels: PixelConfig[];      // tất cả pixel_configs available
}

export default function LandingPixelEditor({ landing, attached, allPixels }: Props) {
  const router = useRouter();
  const [name, setName] = useState(landing.name);
  const [pathname, setPathnameVal] = useState(landing.pathname);
  const [description, setDescription] = useState(landing.description ?? "");
  const [isActive, setIsActive] = useState(landing.is_active);
  const [notes, setNotes] = useState(landing.notes ?? "");

  // Selected pixel ids — array preserving order
  const [selectedIds, setSelectedIds] = useState<string[]>(attached.map((p) => p.id));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const toggle = (id: string) => {
    setSelectedIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  };

  const move = (id: string, dir: "up" | "down") => {
    setSelectedIds((cur) => {
      const i = cur.indexOf(id);
      if (i < 0) return cur;
      const j = dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= cur.length) return cur;
      const out = [...cur];
      [out[i], out[j]] = [out[j], out[i]];
      return out;
    });
  };

  const handleSave = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/landing-pages/${landing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          pathname: pathname.trim(),
          description: description.trim() || null,
          is_active: isActive,
          notes: notes.trim() || null,
          pixel_config_ids: selectedIds,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Lỗi khi lưu");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    } catch {
      setError("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  };

  // Sort all pixels: attached first (by selected order), then unattached
  const sortedPixels = [
    ...selectedIds
      .map((id) => allPixels.find((p) => p.id === id))
      .filter((p): p is PixelConfig => Boolean(p)),
    ...allPixels.filter((p) => !selectedIds.includes(p.id)),
  ];

  return (
    <div className="space-y-6">
      {/* Landing info */}
      <div className="card-dark overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid #2a2a2a" }}
        >
          <h3 className="text-sm font-semibold text-white">Thông tin landing</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Pathname
              </label>
              <input
                type="text"
                value={pathname}
                onChange={(e) => setPathnameVal(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none font-mono"
                style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Tên</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Mô tả</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Ghi chú nội bộ
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-y"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-[#D4A843]"
            />
            <span className="text-sm text-gray-300">
              Landing đang hoạt động{" "}
              <span className="text-gray-500">(tắt để dừng track toàn bộ Pixel ở landing này)</span>
            </span>
          </label>
        </div>
      </div>

      {/* Pixels picker */}
      <div className="card-dark overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid #2a2a2a" }}
        >
          <h3 className="text-sm font-semibold text-white">
            Pixel & CAPI gắn vào landing này
          </h3>
          <span className="text-xs text-gray-500">
            Đã chọn <span className="text-white font-semibold">{selectedIds.length}</span> /{" "}
            {allPixels.length}
          </span>
        </div>

        {allPixels.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            Chưa có cấu hình Pixel nào. Vào{" "}
            <a href="/admin/pixel-settings" className="text-[#D4A843] hover:underline">
              Pixel & CAPI
            </a>{" "}
            tạo trước.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "#1f1f1f" }}>
            {sortedPixels.map((p) => {
              const selected = selectedIds.includes(p.id);
              const order = selectedIds.indexOf(p.id);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors"
                  style={{ borderBottom: "1px solid #1f1f1f" }}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggle(p.id)}
                    className="flex items-center justify-center w-6 h-6 rounded-md transition-colors flex-shrink-0"
                    style={{
                      background: selected ? "rgba(212,168,67,0.15)" : "#1a1a1a",
                      border: `1px solid ${selected ? "rgba(212,168,67,0.5)" : "#2a2a2a"}`,
                    }}
                  >
                    {selected && <Check size={14} className="text-[#D4A843]" />}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-[#D4A843] font-semibold">
                        {p.slug}
                      </span>
                      {!p.is_active && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded text-orange-400"
                              style={{ background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.2)" }}>
                          Tắt
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">
                      {p.name} · <span className="font-mono">{p.pixel_id}</span>{" "}
                      {p.capi_access_token ? (
                        <span className="text-green-400">
                          <Shield size={10} className="inline" /> CAPI
                        </span>
                      ) : (
                        <span className="text-gray-600">
                          <ShieldOff size={10} className="inline" /> Pixel-only
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Position controls (chỉ hiện khi selected) */}
                  {selected && (
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-gray-500 mb-0.5">#{order + 1}</span>
                      <div className="flex gap-0.5">
                        <button
                          onClick={() => move(p.id, "up")}
                          disabled={order === 0}
                          className="p-1 text-gray-500 hover:text-white disabled:opacity-30"
                          title="Di chuyển lên"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          onClick={() => move(p.id, "down")}
                          disabled={order === selectedIds.length - 1}
                          className="p-1 text-gray-500 hover:text-white disabled:opacity-30"
                          title="Di chuyển xuống"
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          className="p-3 rounded-lg text-sm text-red-400"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          {error}
        </div>
      )}

      {/* Save bar — sticky */}
      <div
        className="sticky bottom-4 flex items-center justify-between p-4 rounded-2xl"
        style={{
          background: "rgba(20,20,20,0.95)",
          border: "1px solid #2a2a2a",
          backdropFilter: "blur(10px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}
      >
        <div className="flex items-center gap-2 text-sm text-gray-400">
          {saved ? (
            <>
              <Check size={14} className="text-green-400" />
              <span className="text-green-400">Đã lưu thành công</span>
            </>
          ) : (
            <span>
              Bấm <strong className="text-white">Lưu thay đổi</strong> để áp dụng.
              Hiệu lực ngay, không cần deploy.
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition-colors"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
          >
            <X size={13} className="inline mr-1" /> Huỷ
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #D4A843, #b8922e)",
              boxShadow: "0 2px 8px rgba(212,168,67,0.3)",
            }}
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {loading ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}
