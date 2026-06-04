"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import TopBar from "@/components/layout/TopBar";
import {
  Link2,
  Copy,
  QrCode,
  ExternalLink,
  Check,
  Trash2,
  RotateCcw,
  Zap,
  X,
} from "lucide-react";

/* ─── Constants ─────────────────────────────────────────────────────────────── */

const SOURCE_OPTIONS = [
  "facebook",
  "google",
  "tiktok",
  "youtube",
  "zalo",
  "email",
  "sms",
];

const MEDIUM_OPTIONS = [
  "cpc",
  "display",
  "social",
  "email",
  "referral",
  "organic",
  "video",
];

interface Preset {
  label: string;
  source: string;
  medium: string;
  color: string;
}

const PRESETS: Preset[] = [
  { label: "Facebook Ads", source: "facebook", medium: "cpc", color: "#1877F2" },
  { label: "Google Ads", source: "google", medium: "cpc", color: "#EA4335" },
  { label: "Email Campaign", source: "email", medium: "email", color: "#D4A843" },
  { label: "Zalo Group", source: "zalo", medium: "social", color: "#0068FF" },
  { label: "YouTube Video", source: "youtube", medium: "video", color: "#FF0000" },
];

const PARAM_COLORS: Record<string, string> = {
  utm_source: "#3b82f6",
  utm_medium: "#a855f7",
  utm_campaign: "#22c55e",
  utm_term: "#f59e0b",
  utm_content: "#ec4899",
};

const LS_KEY = "dk_utm_recent_links";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

interface RecentLink {
  id: string;
  url: string;
  baseUrl: string;
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
  createdAt: string;
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

function buildUTMUrl(
  baseUrl: string,
  source: string,
  medium: string,
  campaign: string,
  term: string,
  content: string,
): string {
  if (!baseUrl || !source || !medium || !campaign) return "";
  try {
    // Normalise: if user forgot protocol, prepend https://
    let normalised = baseUrl.trim();
    if (!/^https?:\/\//i.test(normalised)) {
      normalised = "https://" + normalised;
    }
    const url = new URL(normalised);
    url.searchParams.set("utm_source", source.trim());
    url.searchParams.set("utm_medium", medium.trim());
    url.searchParams.set("utm_campaign", campaign.trim());
    if (term.trim()) url.searchParams.set("utm_term", term.trim());
    if (content.trim()) url.searchParams.set("utm_content", content.trim());
    return url.toString();
  } catch {
    return "";
  }
}

function loadRecent(): RecentLink[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentLink[];
  } catch {
    return [];
  }
}

function saveRecent(links: RecentLink[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(links.slice(0, 10)));
  } catch {
    /* quota exceeded — silently ignore */
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

/* ─── Component ─────────────────────────────────────────────────────────────── */

export default function UTMBuilderClient() {
  // Form state
  const [baseUrl, setBaseUrl] = useState("");
  const [source, setSource] = useState("");
  const [customSource, setCustomSource] = useState("");
  const [medium, setMedium] = useState("");
  const [customMedium, setCustomMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [term, setTerm] = useState("");
  const [content, setContent] = useState("");

  // UI state
  const [copied, setCopied] = useState<string | null>(null);
  const [recentLinks, setRecentLinks] = useState<RecentLink[]>([]);
  const [showQr, setShowQr] = useState(false);

  const outputRef = useRef<HTMLInputElement>(null);

  // Load recent links from localStorage
  useEffect(() => {
    setRecentLinks(loadRecent());
  }, []);

  // Effective values (handle "custom" selections)
  const effectiveSource = source === "__custom__" ? customSource : source;
  const effectiveMedium = medium === "__custom__" ? customMedium : medium;

  const generatedUrl = buildUTMUrl(
    baseUrl,
    effectiveSource,
    effectiveMedium,
    campaign,
    term,
    content,
  );

  const isValid =
    baseUrl.trim() !== "" &&
    effectiveSource.trim() !== "" &&
    effectiveMedium.trim() !== "" &&
    campaign.trim() !== "";

  // Copy helper
  const handleCopy = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard API may be blocked */
    }
  }, []);

  // Save link to recent
  const handleSaveLink = useCallback(() => {
    if (!generatedUrl || !isValid) return;
    const link: RecentLink = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      url: generatedUrl,
      baseUrl,
      source: effectiveSource,
      medium: effectiveMedium,
      campaign,
      term,
      content,
      createdAt: new Date().toISOString(),
    };
    const updated = [link, ...recentLinks.filter((r) => r.url !== generatedUrl)].slice(0, 10);
    setRecentLinks(updated);
    saveRecent(updated);
    handleCopy(generatedUrl, "url");
  }, [generatedUrl, isValid, baseUrl, effectiveSource, effectiveMedium, campaign, term, content, recentLinks, handleCopy]);

  // Apply preset
  const applyPreset = (preset: Preset) => {
    if (SOURCE_OPTIONS.includes(preset.source)) {
      setSource(preset.source);
      setCustomSource("");
    } else {
      setSource("__custom__");
      setCustomSource(preset.source);
    }
    if (MEDIUM_OPTIONS.includes(preset.medium)) {
      setMedium(preset.medium);
      setCustomMedium("");
    } else {
      setMedium("__custom__");
      setCustomMedium(preset.medium);
    }
  };

  // Load a recent link back into the form
  const editRecent = (link: RecentLink) => {
    setBaseUrl(link.baseUrl);
    setCampaign(link.campaign);
    setTerm(link.term);
    setContent(link.content);

    if (SOURCE_OPTIONS.includes(link.source)) {
      setSource(link.source);
      setCustomSource("");
    } else {
      setSource("__custom__");
      setCustomSource(link.source);
    }
    if (MEDIUM_OPTIONS.includes(link.medium)) {
      setMedium(link.medium);
      setCustomMedium("");
    } else {
      setMedium("__custom__");
      setCustomMedium(link.medium);
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Delete a recent link
  const deleteRecent = (id: string) => {
    const updated = recentLinks.filter((r) => r.id !== id);
    setRecentLinks(updated);
    saveRecent(updated);
  };

  // Reset form
  const resetForm = () => {
    setBaseUrl("");
    setSource("");
    setCustomSource("");
    setMedium("");
    setCustomMedium("");
    setCampaign("");
    setTerm("");
    setContent("");
  };

  // Parse URL for coloured preview
  const renderUrlPreview = () => {
    if (!generatedUrl) return null;
    try {
      const url = new URL(generatedUrl);
      const origin = url.origin + url.pathname;
      const params = Array.from(url.searchParams.entries());

      return (
        <div className="text-sm font-mono break-all leading-relaxed">
          <span className="text-white">{origin}</span>
          {params.map(([key, val], i) => (
            <span key={key}>
              <span className="text-gray-500">{i === 0 ? "?" : "&"}</span>
              <span style={{ color: PARAM_COLORS[key] ?? "#6b7280" }}>
                {key}
              </span>
              <span className="text-gray-500">=</span>
              <span style={{ color: PARAM_COLORS[key] ?? "#6b7280", opacity: 0.8 }}>
                {decodeURIComponent(val)}
              </span>
            </span>
          ))}
        </div>
      );
    } catch {
      return null;
    }
  };

  // QR code URL (using a free public API — no dependencies needed)
  const qrUrl = generatedUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generatedUrl)}&bgcolor=ffffff&color=000000&format=png`
    : "";

  return (
    <div>
      <TopBar
        title="Tạo Link UTM"
        subtitle="Tạo link theo dõi chiến dịch marketing"
      />

      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        {/* ── Preset Templates ───────────────────────────────────────────── */}
        <div className="card-dark p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={15} className="text-[#D4A843]" />
            <h3 className="text-sm font-semibold text-white">Mẫu nhanh</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:brightness-110"
                style={{
                  background: p.color + "18",
                  color: p.color,
                  border: `1px solid ${p.color}30`,
                }}
              >
                <Link2 size={11} />
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Form ───────────────────────────────────────────────────────── */}
        <div className="card-dark p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Link2 size={15} className="text-[#D4A843]" />
              <h3 className="text-sm font-semibold text-white">
                Thông tin UTM
              </h3>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          </div>

          <div className="space-y-4">
            {/* Base URL */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                URL gốc <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://dangkhuong.com/weballinone"
                className="input-dark px-3 py-2.5 text-sm"
              />
            </div>

            {/* Source + Medium row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* utm_source */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                  utm_source <span className="text-red-400">*</span>
                </label>
                <select
                  value={source}
                  onChange={(e) => {
                    setSource(e.target.value);
                    if (e.target.value !== "__custom__") setCustomSource("");
                  }}
                  className="input-dark px-3 py-2.5 text-sm"
                >
                  <option value="">-- Chọn nguồn --</option>
                  {SOURCE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="__custom__">Khác (nhập tùy chỉnh)...</option>
                </select>
                {source === "__custom__" && (
                  <input
                    type="text"
                    value={customSource}
                    onChange={(e) => setCustomSource(e.target.value)}
                    placeholder="Nhập tên nguồn..."
                    className="input-dark px-3 py-2 text-sm mt-2"
                  />
                )}
              </div>

              {/* utm_medium */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                  utm_medium <span className="text-red-400">*</span>
                </label>
                <select
                  value={medium}
                  onChange={(e) => {
                    setMedium(e.target.value);
                    if (e.target.value !== "__custom__") setCustomMedium("");
                  }}
                  className="input-dark px-3 py-2.5 text-sm"
                >
                  <option value="">-- Chọn medium --</option>
                  {MEDIUM_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                  <option value="__custom__">Khác (nhập tùy chỉnh)...</option>
                </select>
                {medium === "__custom__" && (
                  <input
                    type="text"
                    value={customMedium}
                    onChange={(e) => setCustomMedium(e.target.value)}
                    placeholder="Nhập tên medium..."
                    className="input-dark px-3 py-2 text-sm mt-2"
                  />
                )}
              </div>
            </div>

            {/* Campaign */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                utm_campaign <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                placeholder="vd: summer_sale_2025, launch_weballinone"
                className="input-dark px-3 py-2.5 text-sm"
              />
            </div>

            {/* Term + Content row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                  utm_term{" "}
                  <span className="text-gray-600 font-normal">(tùy chọn)</span>
                </label>
                <input
                  type="text"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="vd: hoc_lam_video"
                  className="input-dark px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                  utm_content{" "}
                  <span className="text-gray-600 font-normal">
                    (tùy chọn, dùng cho A/B test)
                  </span>
                </label>
                <input
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="vd: banner_v2, cta_blue"
                  className="input-dark px-3 py-2.5 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Output ─────────────────────────────────────────────────────── */}
        <div className="card-dark p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <ExternalLink size={15} className="text-[#D4A843]" />
            <h3 className="text-sm font-semibold text-white">
              Link đã tạo
            </h3>
          </div>

          {isValid && generatedUrl ? (
            <div className="space-y-4">
              {/* Generated URL input + copy */}
              <div className="flex gap-2">
                <input
                  ref={outputRef}
                  type="text"
                  readOnly
                  value={generatedUrl}
                  className="input-dark px-3 py-2.5 text-sm font-mono flex-1 min-w-0"
                  onClick={() => outputRef.current?.select()}
                />
                <button
                  type="button"
                  onClick={() => handleSaveLink()}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shrink-0"
                  style={{
                    background:
                      copied === "url"
                        ? "rgba(34,197,94,0.15)"
                        : "rgba(212,168,67,0.12)",
                    color: copied === "url" ? "#22c55e" : "#D4A843",
                    border: `1px solid ${copied === "url" ? "rgba(34,197,94,0.3)" : "rgba(212,168,67,0.25)"}`,
                  }}
                >
                  {copied === "url" ? (
                    <>
                      <Check size={14} /> Đã copy
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copy & Lưu
                    </>
                  )}
                </button>
              </div>

              {/* URL preview with colours */}
              <div
                className="rounded-lg p-3"
                style={{ background: "#0f0f0f", border: "1px solid #2a2a2a" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                    Preview
                  </span>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 ml-auto">
                    {Object.entries(PARAM_COLORS).map(([key, color]) => (
                      <div key={key} className="flex items-center gap-1">
                        <div
                          className="w-2 h-2 rounded-sm"
                          style={{ background: color }}
                        />
                        <span className="text-[10px] text-gray-500">{key}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {renderUrlPreview()}
              </div>

              {/* Action buttons row */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(generatedUrl, "copy2")}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-all"
                  style={{
                    background: "rgba(59,130,246,0.1)",
                    color: "#3b82f6",
                    border: "1px solid rgba(59,130,246,0.2)",
                  }}
                >
                  {copied === "copy2" ? (
                    <>
                      <Check size={12} /> Đã copy!
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> Copy link
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowQr(!showQr)}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-all"
                  style={{
                    background: showQr
                      ? "rgba(168,85,247,0.15)"
                      : "rgba(168,85,247,0.1)",
                    color: "#a855f7",
                    border: `1px solid rgba(168,85,247,${showQr ? "0.35" : "0.2"})`,
                  }}
                >
                  <QrCode size={12} />
                  {showQr ? "Ẩn QR" : "Xem QR Code"}
                </button>

                <a
                  href={generatedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-all"
                  style={{
                    background: "rgba(34,197,94,0.1)",
                    color: "#22c55e",
                    border: "1px solid rgba(34,197,94,0.2)",
                  }}
                >
                  <ExternalLink size={12} /> Mở thử link
                </a>
              </div>

              {/* QR Code */}
              {showQr && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div
                    className="rounded-xl overflow-hidden bg-white p-3"
                    style={{ width: 216, height: 216 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrUrl}
                      alt="QR Code cho UTM link"
                      width={200}
                      height={200}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Quét mã QR để mở link UTM
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-gray-500">
              <Link2 size={32} className="mb-3 text-gray-600" />
              <p className="text-sm">Điền đầy đủ các trường bắt buộc (*) để tạo link</p>
              <p className="text-xs text-gray-600 mt-1">
                URL gốc, utm_source, utm_medium, utm_campaign
              </p>
            </div>
          )}
        </div>

        {/* ── Recent Links ───────────────────────────────────────────────── */}
        {recentLinks.length > 0 && (
          <div className="card-dark overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#2a2a2a]">
              <div className="flex items-center gap-2">
                <Link2 size={15} className="text-[#D4A843]" />
                <h3 className="text-sm font-semibold text-white">
                  Link đã tạo gần đây
                </h3>
                <span className="text-xs text-gray-500">
                  ({recentLinks.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRecentLinks([]);
                  saveRecent([]);
                }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors"
              >
                <Trash2 size={12} />
                Xóa tất cả
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                    {["URL", "Source", "Campaign", "Ngày tạo", ""].map(
                      (col) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {recentLinks.map((link, idx) => (
                    <tr
                      key={link.id}
                      className="transition-colors hover:bg-white/[0.02]"
                      style={{
                        borderBottom:
                          idx < recentLinks.length - 1
                            ? "1px solid #2a2a2a"
                            : "none",
                      }}
                    >
                      <td className="px-4 py-3 max-w-[280px]">
                        <span
                          className="text-white text-xs font-mono truncate block"
                          title={link.url}
                        >
                          {link.url}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize"
                          style={{
                            background: "rgba(59,130,246,0.12)",
                            color: "#3b82f6",
                          }}
                        >
                          {link.source}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-300 text-xs">
                          {link.campaign}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-500 text-xs whitespace-nowrap">
                          {formatDate(link.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopy(link.url, link.id)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                            title="Copy link"
                          >
                            {copied === link.id ? (
                              <Check size={13} className="text-green-400" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => editRecent(link)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#D4A843] hover:bg-[#D4A843]/5 transition-colors"
                            title="Chỉnh sửa lại"
                          >
                            <RotateCcw size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRecent(link.id)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/5 transition-colors"
                            title="Xóa"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-600 py-2">
          Link UTM giúp theo dõi hiệu quả chiến dịch marketing qua Google Analytics, CRM và các công cụ phân tích.
        </div>
      </div>
    </div>
  );
}
