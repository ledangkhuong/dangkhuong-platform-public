"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, RefreshCw, Save, Eye, EyeOff, Copy, Check, Globe, Layers } from "lucide-react";
import type { PixelConfig, LandingPage } from "@/types/pixel-config";

interface Props {
  /** Khi truyền vào → form ở edit mode; bỏ trống → create mode. */
  config?: PixelConfig;
  /** Danh sách landing_page_id đang attach (chỉ dùng ở edit mode). */
  attachedLandingIds?: string[];
  /** Khi true, form luôn mở (dùng trong trang detail). Default false (toggle Add). */
  alwaysOpen?: boolean;
  onSaved?: () => void;
}

export default function PixelConfigForm({ config, attachedLandingIds, alwaysOpen = false, onSaved }: Props) {
  const router = useRouter();
  const isEdit = !!config;

  const [open, setOpen] = useState(alwaysOpen);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Form state
  const [slug, setSlug] = useState(config?.slug ?? "");
  const [name, setName] = useState(config?.name ?? "");
  const [description, setDescription] = useState(config?.description ?? "");
  const [pixelId, setPixelId] = useState(config?.pixel_id ?? "");
  const [capiToken, setCapiToken] = useState(config?.capi_access_token ?? "");
  const [testEventCode, setTestEventCode] = useState(config?.test_event_code ?? "");
  const [isActive, setIsActive] = useState(config?.is_active ?? true);
  const [notes, setNotes] = useState(config?.notes ?? "");

  // Apply scope
  const [applyMode, setApplyMode] = useState<"all" | "specific">(
    config?.apply_to_all_pages ? "all" : "specific",
  );
  const [selectedLandingIds, setSelectedLandingIds] = useState<string[]>(
    attachedLandingIds ?? [],
  );

  // Available landings (fetched from API)
  const [landings, setLandings] = useState<LandingPage[]>([]);
  const [landingsLoading, setLandingsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/landing-pages");
        const data = await res.json();
        if (!cancelled && Array.isArray(data?.landings)) {
          setLandings(data.landings as LandingPage[]);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLandingsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Reset state khi config prop thay đổi
  useEffect(() => {
    if (config) {
      setSlug(config.slug);
      setName(config.name);
      setDescription(config.description ?? "");
      setPixelId(config.pixel_id);
      setCapiToken(config.capi_access_token ?? "");
      setTestEventCode(config.test_event_code ?? "");
      setIsActive(config.is_active);
      setNotes(config.notes ?? "");
      setApplyMode(config.apply_to_all_pages ? "all" : "specific");
    }
  }, [config]);

  useEffect(() => {
    if (attachedLandingIds) setSelectedLandingIds(attachedLandingIds);
  }, [attachedLandingIds]);

  const handleReset = () => {
    setSlug("");
    setName("");
    setDescription("");
    setPixelId("");
    setCapiToken("");
    setTestEventCode("");
    setIsActive(true);
    setNotes("");
    setApplyMode("specific");
    setSelectedLandingIds([]);
    setError("");
  };

  const toggleLanding = (id: string) => {
    setSelectedLandingIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const url = isEdit
        ? `/api/admin/pixel-configs/${config!.id}`
        : "/api/admin/pixel-configs";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug.trim().toLowerCase(),
          name: name.trim(),
          description: description.trim() || null,
          pixel_id: pixelId.trim(),
          capi_access_token: capiToken.trim() || null,
          test_event_code: testEventCode.trim() || null,
          is_active: isActive,
          apply_to_all_pages: applyMode === "all",
          landing_page_ids: applyMode === "specific" ? selectedLandingIds : [],
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Lỗi khi lưu cấu hình");
        return;
      }

      if (!isEdit) handleReset();
      if (!alwaysOpen) setOpen(false);
      onSaved?.();
      router.refresh();
    } catch {
      setError("Lỗi kết nối. Thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const copySnippet = async () => {
    const snippet = `<PagePixel slug="${slug || "your-slug"}" />`;
    try {
      await navigator.clipboard.writeText(snippet);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    } catch {
      /* ignore */
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
        Tạo cấu hình Pixel
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
          {isEdit ? `Sửa cấu hình: ${config!.name}` : "Tạo cấu hình Pixel mới"}
        </h3>
        {!alwaysOpen && (
          <button
            onClick={() => { handleReset(); setOpen(false); }}
            className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Slug + Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Slug <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
              }
              placeholder="khoa-hoc-video-ai"
              required
              disabled={isEdit}
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none transition-colors disabled:opacity-50"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
            />
            <p className="text-xs text-gray-500 mt-1">
              Dùng trong code: <code className="text-[#D4A843]">{`<PagePixel slug="${slug || "..."}" />`}</code>
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Tên cấu hình <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Pixel — Khóa học Video AI"
              required
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
            />
          </div>
        </div>

        {/* Pixel ID */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Pixel ID <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={pixelId}
            onChange={(e) => setPixelId(e.target.value.replace(/\D/g, ""))}
            placeholder="VD: 1234567890123456"
            required
            inputMode="numeric"
            className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none font-mono"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
          />
          <p className="text-xs text-gray-500 mt-1">
            Lấy từ Events Manager &gt; Data Sources &gt; Pixel của bạn (15-16 chữ số).
          </p>
        </div>

        {/* CAPI token */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            CAPI Access Token{" "}
            <span className="text-gray-600 font-normal">(khuyến nghị — server-side)</span>
          </label>
          <div className="relative">
            <input
              type={showToken ? "text" : "password"}
              value={capiToken}
              onChange={(e) => setCapiToken(e.target.value)}
              placeholder="EAAxx... (dán từ Events Manager > Settings > Conversions API)"
              className="w-full px-3 py-2 pr-10 rounded-lg text-sm text-white placeholder-gray-600 outline-none font-mono"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
            />
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-white"
              title={showToken ? "Ẩn" : "Hiện"}
            >
              {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Nếu bỏ trống, chỉ Pixel client-side hoạt động (sẽ mất ~30% data do
            adblock/iOS). Cấu hình để bù qua CAPI server-side.
          </p>
        </div>

        {/* Test Event Code */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Test Event Code <span className="text-gray-600 font-normal">(chỉ khi test)</span>
          </label>
          <input
            type="text"
            value={testEventCode}
            onChange={(e) => setTestEventCode(e.target.value)}
            placeholder="VD: TEST12345 (xoá khi go-live)"
            className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none font-mono"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
          />
          <p className="text-xs text-gray-500 mt-1">
            Lấy từ Events Manager &gt; Test Events. <strong>Bỏ trống khi production</strong>{" "}
            — nếu để code này, event sẽ không tính vào ads tracking thật.
          </p>
        </div>

        {/* ── Áp dụng cho ── */}
        <div
          className="p-4 rounded-xl space-y-3"
          style={{ background: "#0f0f0f", border: "1px solid #2a2a2a" }}
        >
          <label className="block text-xs font-medium text-gray-400">
            Áp dụng Pixel cho <span className="text-red-400">*</span>
          </label>

          {/* Radio: Toàn site */}
          <button
            type="button"
            onClick={() => setApplyMode("all")}
            className="w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all"
            style={{
              background: applyMode === "all" ? "rgba(212,168,67,0.08)" : "#1a1a1a",
              border: `1px solid ${applyMode === "all" ? "rgba(212,168,67,0.4)" : "#2a2a2a"}`,
            }}
          >
            <div
              className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center"
              style={{
                background: applyMode === "all" ? "#D4A843" : "transparent",
                border: `2px solid ${applyMode === "all" ? "#D4A843" : "#3a3a3a"}`,
              }}
            >
              {applyMode === "all" && (
                <div className="w-1.5 h-1.5 rounded-full bg-black" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-[#D4A843]" />
                <span className="text-sm font-semibold text-white">Toàn site</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Pixel fire trên <strong>mọi page</strong> dangkhuong.com (homepage, courses,
                blog, mọi landing...). Phù hợp khi cần track conversion toàn website.
              </p>
            </div>
          </button>

          {/* Radio: Landing cụ thể */}
          <button
            type="button"
            onClick={() => setApplyMode("specific")}
            className="w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all"
            style={{
              background: applyMode === "specific" ? "rgba(212,168,67,0.08)" : "#1a1a1a",
              border: `1px solid ${applyMode === "specific" ? "rgba(212,168,67,0.4)" : "#2a2a2a"}`,
            }}
          >
            <div
              className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center"
              style={{
                background: applyMode === "specific" ? "#D4A843" : "transparent",
                border: `2px solid ${applyMode === "specific" ? "#D4A843" : "#3a3a3a"}`,
              }}
            >
              {applyMode === "specific" && (
                <div className="w-1.5 h-1.5 rounded-full bg-black" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-[#D4A843]" />
                <span className="text-sm font-semibold text-white">Landing cụ thể</span>
                {applyMode === "specific" && selectedLandingIds.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded text-[#D4A843]"
                        style={{ background: "rgba(212,168,67,0.12)" }}>
                    Đã chọn {selectedLandingIds.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Tick chọn các landing bên dưới — Pixel chỉ fire trên những trang này.
              </p>
            </div>
          </button>

          {/* Multi-select landings (chỉ hiện khi mode = specific) */}
          {applyMode === "specific" && (
            <div
              className="rounded-lg overflow-hidden"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
            >
              {landingsLoading ? (
                <div className="p-4 text-center text-xs text-gray-500">
                  <RefreshCw size={12} className="inline animate-spin mr-1.5" />
                  Đang tải danh sách landing...
                </div>
              ) : landings.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-500">
                  Chưa có landing nào.{" "}
                  <a href="/admin/pixel-settings/pages" className="text-[#D4A843] hover:underline">
                    Tạo landing mới
                  </a>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {landings.map((l, i) => {
                    const selected = selectedLandingIds.includes(l.id);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => toggleLanding(l.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.02] transition-colors text-left"
                        style={{
                          borderBottom: i < landings.length - 1 ? "1px solid #1f1f1f" : "none",
                        }}
                      >
                        <div
                          className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center"
                          style={{
                            background: selected ? "rgba(212,168,67,0.15)" : "#0f0f0f",
                            border: `1px solid ${selected ? "rgba(212,168,67,0.5)" : "#2a2a2a"}`,
                          }}
                        >
                          {selected && <Check size={12} className="text-[#D4A843]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-xs text-[#D4A843] font-semibold">
                              {l.pathname}
                            </code>
                            {!l.is_active && (
                              <span className="text-[9px] px-1 py-0.5 rounded text-orange-400"
                                    style={{ background: "rgba(251,146,60,0.08)" }}>
                                Landing tắt
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 truncate">{l.name}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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
            placeholder="Landing page bán khóa Video AI giá 999k"
            className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Ghi chú nội bộ
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ghi chú về chiến dịch, ngân sách, target..."
            className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none resize-y"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
          />
        </div>

        {/* Is active toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 accent-[#D4A843]"
          />
          <span className="text-sm text-gray-300">
            Bật cấu hình này <span className="text-gray-500">(tắt để tạm ngưng tracking)</span>
          </span>
        </label>

        {/* Snippet preview khi edit */}
        {isEdit && slug && (
          <div
            className="p-3 rounded-lg flex items-center gap-3"
            style={{
              background: "rgba(212,168,67,0.05)",
              border: "1px solid rgba(212,168,67,0.2)",
            }}
          >
            <code className="flex-1 text-xs text-[#D4A843] font-mono break-all">
              {`<PagePixel slug="${slug}" />`}
            </code>
            <button
              type="button"
              onClick={copySnippet}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-gray-300 hover:text-white transition-colors"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
            >
              {copiedSnippet ? <Check size={12} /> : <Copy size={12} />}
              {copiedSnippet ? "Đã copy" : "Copy"}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="p-3 rounded-lg text-sm text-red-400"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            {error}
          </div>
        )}

        {/* Buttons */}
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
                Đang lưu...
              </>
            ) : isEdit ? (
              <>
                <Save size={14} />
                Lưu thay đổi
              </>
            ) : (
              <>
                <Plus size={14} />
                Tạo cấu hình
              </>
            )}
          </button>
          {!alwaysOpen && (
            <button
              type="button"
              onClick={() => { handleReset(); setOpen(false); }}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition-colors"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
            >
              Huỷ
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
