"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import DOMPurify from "isomorphic-dompurify";
import { DEFAULT_AUTHOR } from "@/lib/author-config";
import TopBar from "@/components/layout/TopBar";
import type { JSONContent } from "novel";
import {
  Save,
  ArrowLeft,
  Loader2,
  Eye,
  Image as ImageIcon,
  Tag,
  FileText,
  Globe,
  Mail,
  Upload,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Target,
  User,
} from "lucide-react";

const NovelEditor = dynamic(() => import("@/components/editor/NovelEditor"), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center"
      style={{
        minHeight: 450,
        background: "#141414",
        border: "1px solid #2a2a2a",
        borderRadius: 12,
      }}
    >
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <Loader2 size={16} className="animate-spin" />
        Đang tải editor...
      </div>
    </div>
  ),
});

// ─── SEO Analysis helpers ──────────────────────────────────────────────────

function countChars(text: string): number {
  return text.length;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

interface SeoCheck {
  label: string;
  status: "good" | "warn" | "bad";
  message: string;
}

function analyzeSeo(
  title: string,
  excerpt: string,
  focusKeyword: string,
  slug: string,
  htmlContent: string,
  thumbnail: string
): SeoCheck[] {
  const checks: SeoCheck[] = [];
  const plainContent = stripHtml(htmlContent).toLowerCase();
  const kw = focusKeyword.trim().toLowerCase();

  // Title length
  const titleLen = title.length;
  if (titleLen === 0) {
    checks.push({ label: "Tiêu đề SEO", status: "bad", message: "Chưa có tiêu đề" });
  } else if (titleLen < 30) {
    checks.push({ label: "Tiêu đề SEO", status: "warn", message: `Quá ngắn (${titleLen}/60 ký tự). Nên 50-60 ký tự` });
  } else if (titleLen <= 60) {
    checks.push({ label: "Tiêu đề SEO", status: "good", message: `Độ dài tốt (${titleLen}/60 ký tự)` });
  } else {
    checks.push({ label: "Tiêu đề SEO", status: "warn", message: `Hơi dài (${titleLen}/60 ký tự). Google sẽ cắt bớt` });
  }

  // Meta description length
  const excLen = excerpt.length;
  if (excLen === 0) {
    checks.push({ label: "Mô tả meta", status: "bad", message: "Chưa có mô tả. Nên viết 150-160 ký tự" });
  } else if (excLen < 120) {
    checks.push({ label: "Mô tả meta", status: "warn", message: `Ngắn (${excLen}/160 ký tự). Nên 150-160 ký tự` });
  } else if (excLen <= 160) {
    checks.push({ label: "Mô tả meta", status: "good", message: `Độ dài tốt (${excLen}/160 ký tự)` });
  } else {
    checks.push({ label: "Mô tả meta", status: "warn", message: `Hơi dài (${excLen}/160 ký tự). Google sẽ cắt bớt` });
  }

  // Focus keyword checks
  if (!kw) {
    checks.push({ label: "Từ khóa chính", status: "warn", message: "Chưa đặt từ khóa chính (Focus keyword)" });
  } else {
    // Keyword in title
    if (title.toLowerCase().includes(kw)) {
      checks.push({ label: "Từ khóa trong tiêu đề", status: "good", message: "Có chứa từ khóa chính" });
    } else {
      checks.push({ label: "Từ khóa trong tiêu đề", status: "bad", message: "Tiêu đề chưa chứa từ khóa chính" });
    }

    // Keyword in meta
    if (excerpt.toLowerCase().includes(kw)) {
      checks.push({ label: "Từ khóa trong mô tả", status: "good", message: "Mô tả có chứa từ khóa" });
    } else {
      checks.push({ label: "Từ khóa trong mô tả", status: "bad", message: "Mô tả chưa chứa từ khóa chính" });
    }

    // Keyword in slug
    const kwSlug = kw.replace(/\s+/g, "-");
    if (slug.includes(kwSlug) || slug.includes(kw.replace(/\s+/g, ""))) {
      checks.push({ label: "Từ khóa trong URL", status: "good", message: "Slug chứa từ khóa" });
    } else {
      checks.push({ label: "Từ khóa trong URL", status: "warn", message: "Slug chưa chứa từ khóa chính" });
    }

    // Keyword in content
    if (plainContent.includes(kw)) {
      const count = plainContent.split(kw).length - 1;
      if (count >= 3) {
        checks.push({ label: "Từ khóa trong nội dung", status: "good", message: `Xuất hiện ${count} lần trong bài viết` });
      } else {
        checks.push({ label: "Từ khóa trong nội dung", status: "warn", message: `Chỉ xuất hiện ${count} lần. Nên ≥ 3 lần` });
      }
    } else {
      checks.push({ label: "Từ khóa trong nội dung", status: "bad", message: "Nội dung chưa chứa từ khóa chính" });
    }

    // Keyword in H2/H3
    const headingMatch = htmlContent.match(/<h[23][^>]*>.*?<\/h[23]>/gi);
    const headingText = (headingMatch || []).join(" ").toLowerCase();
    if (headingText.includes(kw)) {
      checks.push({ label: "Từ khóa trong heading", status: "good", message: "Có trong H2/H3" });
    } else {
      checks.push({ label: "Từ khóa trong heading", status: "warn", message: "Chưa có trong H2 hoặc H3" });
    }
  }

  // Content length
  const wordCount = plainContent.split(/\s+/).filter(Boolean).length;
  if (wordCount === 0) {
    checks.push({ label: "Độ dài nội dung", status: "bad", message: "Chưa có nội dung" });
  } else if (wordCount < 300) {
    checks.push({ label: "Độ dài nội dung", status: "warn", message: `${wordCount} từ — nên ≥ 300 từ để SEO tốt` });
  } else if (wordCount < 1000) {
    checks.push({ label: "Độ dài nội dung", status: "good", message: `${wordCount} từ — tốt` });
  } else {
    checks.push({ label: "Độ dài nội dung", status: "good", message: `${wordCount} từ — rất tốt cho SEO` });
  }

  // Images
  const imgCount = (htmlContent.match(/<img/gi) || []).length;
  if (imgCount > 0) {
    checks.push({ label: "Hình ảnh trong bài", status: "good", message: `Có ${imgCount} hình ảnh` });
  } else {
    checks.push({ label: "Hình ảnh trong bài", status: "warn", message: "Chưa có hình ảnh. Nên thêm ảnh minh họa" });
  }

  // Thumbnail
  if (thumbnail) {
    checks.push({ label: "Ảnh thumbnail", status: "good", message: "Đã có ảnh đại diện (og:image)" });
  } else {
    checks.push({ label: "Ảnh thumbnail", status: "bad", message: "Chưa có ảnh đại diện. Cần cho chia sẻ MXH" });
  }

  // Internal/external links
  const linkCount = (htmlContent.match(/<a\s/gi) || []).length;
  if (linkCount > 0) {
    checks.push({ label: "Liên kết", status: "good", message: `Có ${linkCount} liên kết trong bài` });
  } else {
    checks.push({ label: "Liên kết", status: "warn", message: "Chưa có liên kết nào. Nên thêm internal links" });
  }

  return checks;
}

// ─── SEO Score color helper ────────────────────────────────────────────────

function seoScoreColor(checks: SeoCheck[]): { color: string; label: string; pct: number } {
  const total = checks.length;
  const good = checks.filter((c) => c.status === "good").length;
  const pct = Math.round((good / total) * 100);
  if (pct >= 80) return { color: "#D4A843", label: "Tốt", pct };
  if (pct >= 50) return { color: "#f59e0b", label: "Trung bình", pct };
  return { color: "#ef4444", label: "Cần cải thiện", pct };
}

// ─── Char count bar colors ─────────────────────────────────────────────────

function charBarColor(len: number, min: number, max: number): string {
  if (len === 0) return "#333";
  if (len < min) return "#f59e0b";
  if (len <= max) return "#D4A843";
  return "#ef4444";
}

// ═══════════════════════════════════════════════════════════════════════════
// Main page
// ═══════════════════════════════════════════════════════════════════════════

export default function NewBlogPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [authorName, setAuthorName] = useState(DEFAULT_AUTHOR.name);
  const [authorAvatar, setAuthorAvatar] = useState(DEFAULT_AUTHOR.avatar);
  const [authorBio, setAuthorBio] = useState(DEFAULT_AUTHOR.bio);
  const [authorFacebook, setAuthorFacebook] = useState(DEFAULT_AUTHOR.facebook);
  const [uploadingAuthorAvatar, setUploadingAuthorAvatar] = useState(false);
  const authorAvatarRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [seoOpen, setSeoOpen] = useState(true);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const autoSlug = (t: string) =>
    t
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[đĐ]/g, "d")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80);

  const currentSlug = slug || autoSlug(title);

  const handleEditorChange = useCallback((html: string) => {
    setHtmlContent(html);
  }, []);

  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Ảnh thumbnail không được vượt quá 2MB");
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setError("Chỉ chấp nhận JPEG, PNG, WebP, GIF");
      return;
    }
    setUploadingThumb(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/blog-image", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.url) {
        setThumbnail(data.url);
      } else {
        setError(data.error || "Lỗi tải ảnh thumbnail");
      }
    } catch {
      setError("Lỗi kết nối khi tải ảnh");
    } finally {
      setUploadingThumb(false);
      if (thumbInputRef.current) thumbInputRef.current.value = "";
    }
  };

  const handleAuthorAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("Ảnh tác giả không được vượt quá 2MB"); return; }
    setUploadingAuthorAvatar(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/blog-image", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.url) setAuthorAvatar(data.url);
      else setError(data.error || "Lỗi tải ảnh tác giả");
    } catch { setError("Lỗi kết nối"); }
    finally {
      setUploadingAuthorAvatar(false);
      if (authorAvatarRef.current) authorAvatarRef.current.value = "";
    }
  };

  const handleSave = async (
    status: "draft" | "published",
    sendEmail: boolean = false
  ) => {
    if (!title.trim()) {
      setError("Vui lòng nhập tiêu đề");
      return;
    }
    if (
      status === "published" &&
      (!htmlContent.trim() || htmlContent === "<p></p>")
    ) {
      setError("Vui lòng nhập nội dung bài viết");
      return;
    }
    setSaving(sendEmail ? "email" : status);
    setError(null);
    setSuccess(null);

    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch("/api/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug: currentSlug,
          excerpt,
          body: htmlContent,
          content: htmlContent,
          category,
          tags: tagList.length > 0 ? tagList : null,
          thumbnail: thumbnail || null,
          status,
          sendEmail,
          focus_keyword: focusKeyword.trim() || null,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        if (status === "draft") {
          setSuccess("Đã lưu nháp thành công!");
          router.push(`/admin/blog/${json.post.id}/edit`);
        } else {
          router.push("/admin/blog");
        }
      } else {
        setError(json.error || "Lỗi lưu bài viết");
      }
    } catch {
      setError("Lỗi kết nối");
    } finally {
      setSaving(null);
    }
  };

  const wordCount = useMemo(() => {
    return stripHtml(htmlContent).split(/\s+/).filter(Boolean).length;
  }, [htmlContent]);

  const seoChecks = useMemo(() => {
    return analyzeSeo(title, excerpt, focusKeyword, currentSlug, htmlContent, thumbnail);
  }, [title, excerpt, focusKeyword, currentSlug, htmlContent, thumbnail]);

  const seoScore = useMemo(() => seoScoreColor(seoChecks), [seoChecks]);

  return (
    <div>
      <TopBar title="Viết bài mới" subtitle="Quản lý Blog" />

      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
        {/* Top toolbar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <button
            onClick={() => router.push("/admin/blog")}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Quay lại danh sách
          </button>

          <div className="flex items-center gap-3">
            {/* SEO Score badge */}
            <span
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: seoScore.color + "18", color: seoScore.color, border: `1px solid ${seoScore.color}40` }}
            >
              <Target size={11} />
              SEO: {seoScore.pct}% — {seoScore.label}
            </span>

            {wordCount > 0 && (
              <span className="text-xs text-gray-500">
                {wordCount.toLocaleString("vi-VN")} từ
              </span>
            )}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors"
              style={{
                background: showPreview ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.05)",
                color: showPreview ? "#3b82f6" : "#9ca3af",
                border: showPreview ? "1px solid rgba(59,130,246,0.3)" : "1px solid #333",
              }}
            >
              <Eye size={13} />
              {showPreview ? "Ẩn preview" : "Preview"}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg text-sm text-red-400 border border-red-400/20" style={{ background: "rgba(239,68,68,0.08)" }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-3 rounded-lg text-sm text-amber-400 border border-amber-400/20" style={{ background: "rgba(212,168,67,0.08)" }}>
            <CheckCircle2 size={14} /> {success}
          </div>
        )}

        {/* ── Title (always visible at top) ── */}
        <div className="card-dark p-5">
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Tiêu đề bài viết <span className="text-red-400">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slug) setSlug(autoSlug(e.target.value));
            }}
            placeholder="Tiêu đề bài viết..."
            className="input-dark text-xl font-bold"
          />
          <div className="flex items-center gap-2 mt-2">
            <div className="h-1 flex-1 rounded-full overflow-hidden" style={{ background: "#222" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (title.length / 60) * 100)}%`,
                  background: charBarColor(title.length, 30, 60),
                }}
              />
            </div>
            <span className="text-[10px] shrink-0" style={{ color: charBarColor(title.length, 30, 60) }}>
              {title.length}/60
            </span>
          </div>
        </div>

        {/* ── Editor Section (with sticky toolbar) ── */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">
            Nội dung bài viết
          </label>

          {showPreview ? (
            <div className="card-dark p-6" style={{ minHeight: 450 }}>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#2a2a2a]">
                <Eye size={14} className="text-blue-400" />
                <span className="text-xs font-semibold text-blue-400">PREVIEW</span>
              </div>
              <div
                className="blog-content text-gray-300 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }}
              />
            </div>
          ) : (
            <NovelEditor onChange={handleEditorChange} />
          )}
        </div>

        {/* ── SEO Panel (WordPress / Yoast style) ── */}
        <div className="card-dark overflow-hidden">
          <button
            type="button"
            onClick={() => setSeoOpen(!seoOpen)}
            className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search size={15} className="text-[#D4A843]" />
              <span className="text-sm font-semibold text-white">SEO & Thông tin bài viết</span>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: seoScore.color + "18", color: seoScore.color }}
              >
                {seoScore.pct}%
              </span>
            </div>
            {seoOpen ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
          </button>

          {seoOpen && (
            <div className="border-t border-[#2a2a2a] p-5 space-y-5">

              {/* ── Google Preview ── */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Xem trước trên Google
                </label>
                <div className="rounded-lg p-4" style={{ background: "#fff" }}>
                  <div className="text-[13px] text-[#202124] truncate" style={{ fontFamily: "Arial, sans-serif" }}>
                    dangkhuong.com &rsaquo; blog &rsaquo; {currentSlug || "..."}
                  </div>
                  <div
                    className="text-[20px] leading-tight mt-1 truncate"
                    style={{ color: "#1a0dab", fontFamily: "Arial, sans-serif" }}
                  >
                    {title || "Tiêu đề bài viết sẽ hiện ở đây"}
                  </div>
                  <div
                    className="text-[14px] mt-1 line-clamp-2"
                    style={{ color: "#4d5156", fontFamily: "Arial, sans-serif" }}
                  >
                    {excerpt || "Mô tả ngắn (meta description) sẽ hiển thị ở đây trên trang kết quả Google..."}
                  </div>
                </div>
              </div>

              {/* ── Focus Keyword ── */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                  <Target size={11} /> Từ khóa chính (Focus keyword)
                </label>
                <input
                  value={focusKeyword}
                  onChange={(e) => setFocusKeyword(e.target.value)}
                  placeholder="VD: kinh doanh sản phẩm số"
                  className="input-dark text-sm"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Từ khóa mà bạn muốn bài viết xếp hạng trên Google
                </p>
              </div>

              {/* ── Slug ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Slug (URL)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 shrink-0">
                      dangkhuong.com/blog/
                    </span>
                    <input
                      value={slug || autoSlug(title)}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="tieu-de-bai-viet"
                      className="input-dark flex-1 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Chủ đề
                  </label>
                  <input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Marketing, Kinh doanh..."
                    className="input-dark text-sm"
                  />
                </div>
              </div>

              {/* ── Meta description ── */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Mô tả meta (SEO description)
                </label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Tóm tắt 150-160 ký tự cho Google hiển thị..."
                  rows={3}
                  maxLength={300}
                  className="input-dark text-sm resize-none"
                />
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-1 flex-1 rounded-full overflow-hidden" style={{ background: "#222" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (excerpt.length / 160) * 100)}%`,
                        background: charBarColor(excerpt.length, 120, 160),
                      }}
                    />
                  </div>
                  <span className="text-[10px] shrink-0" style={{ color: charBarColor(excerpt.length, 120, 160) }}>
                    {excerpt.length}/160
                  </span>
                </div>
              </div>

              {/* ── Tags + Thumbnail ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                    <Tag size={11} /> Tags (phân cách bằng dấu phẩy)
                  </label>
                  <input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="seo, marketing, kinh-doanh"
                    className="input-dark text-sm"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                    <ImageIcon size={11} /> Ảnh thumbnail (tối đa 2MB)
                  </label>
                  <input
                    ref={thumbInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleThumbUpload}
                    className="hidden"
                  />
                  {thumbnail ? (
                    <div className="relative group">
                      <img src={thumbnail} alt="Thumbnail" className="w-full h-32 object-cover rounded-lg border border-[#2a2a2a]" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        <button type="button" onClick={() => thumbInputRef.current?.click()} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-white hover:bg-white/20 transition-colors">
                          <Upload size={12} className="inline mr-1" />Đổi ảnh
                        </button>
                        <button type="button" onClick={() => setThumbnail("")} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                          <X size={12} className="inline mr-1" />Xoá
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => thumbInputRef.current?.click()}
                      disabled={uploadingThumb}
                      className="w-full h-24 rounded-lg border border-dashed border-[#333] hover:border-[#D4A84340] bg-[#141414] hover:bg-[#1a1a1a] transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {uploadingThumb ? (
                        <>
                          <Loader2 size={18} className="text-gray-500 animate-spin" />
                          <span className="text-xs text-gray-500">Đang tải lên...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={18} className="text-gray-500" />
                          <span className="text-xs text-gray-500">Nhấn để chọn ảnh</span>
                          <span className="text-[10px] text-gray-700">JPEG, PNG, WebP, GIF</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* ── Author Info ── */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  <User size={11} className="inline mr-1" />
                  Thông tin tác giả
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-start">
                  {/* Avatar */}
                  <div>
                    <input ref={authorAvatarRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAuthorAvatarUpload} className="hidden" />
                    <div
                      className="w-20 h-20 rounded-2xl overflow-hidden cursor-pointer relative group border border-[#2a2a2a]"
                      onClick={() => authorAvatarRef.current?.click()}
                    >
                      {authorAvatar ? (
                        <img src={authorAvatar} alt="Author" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-[#D4A843] bg-[#D4A84310]">
                          {authorName.charAt(0)}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        {uploadingAuthorAvatar ? <Loader2 size={16} className="text-white animate-spin" /> : <Upload size={16} className="text-white" />}
                      </div>
                    </div>
                    <p className="text-[9px] text-gray-500 mt-1 text-center">Ảnh tác giả</p>
                  </div>
                  {/* Fields */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">Tên tác giả</label>
                      <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Tên tác giả" className="input-dark text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">Giới thiệu ngắn</label>
                      <textarea value={authorBio} onChange={(e) => setAuthorBio(e.target.value)} placeholder="Mô tả ngắn về tác giả..." rows={2} className="input-dark text-sm resize-none" />
                    </div>
                    <div>
                      <label className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> Link Facebook
                      </label>
                      <input value={authorFacebook} onChange={(e) => setAuthorFacebook(e.target.value)} placeholder="https://facebook.com/..." className="input-dark text-sm" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── SEO Analysis Checklist ── */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Phân tích SEO
                </label>
                <div className="space-y-1.5">
                  {seoChecks.map((check, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs py-1">
                      {check.status === "good" && <CheckCircle2 size={14} className="text-amber-500 shrink-0 mt-0.5" />}
                      {check.status === "warn" && <AlertCircle size={14} className="text-yellow-500 shrink-0 mt-0.5" />}
                      {check.status === "bad" && <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />}
                      <div>
                        <span className="font-medium text-gray-300">{check.label}: </span>
                        <span className="text-gray-500">{check.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div
          className="flex items-center gap-3 pt-4 pb-6 sticky bottom-0 z-10 flex-wrap"
          style={{ background: "linear-gradient(to top, #111 60%, transparent)", paddingTop: 16 }}
        >
          <button
            onClick={() => handleSave("draft")}
            disabled={!!saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ background: "#1f1f1f", color: "#9ca3af", border: "1px solid #333" }}
          >
            {saving === "draft" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Lưu nháp
          </button>

          <button
            onClick={() => handleSave("published", false)}
            disabled={!!saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)" }}
          >
            {saving === "published" ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
            Xuất bản
          </button>

          <button
            onClick={() => handleSave("published", true)}
            disabled={!!saving}
            className="btn-green text-sm py-2.5 px-5"
          >
            {saving === "email" ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
            Xuất bản & gửi email
          </button>

          <p className="text-[10px] text-gray-500 ml-1 hidden sm:block">
            Gửi email thông báo đến tất cả học viên
          </p>
        </div>
      </div>
    </div>
  );
}
