"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import TopBar from "@/components/layout/TopBar";
import { DEFAULT_AUTHOR } from "@/lib/author-config";
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
  Trash2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Upload,
  X,
  Search,
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

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  body: string | null;
  category: string | null;
  tags: string[] | null;
  thumbnail: string | null;
  status: "draft" | "published";
  focus_keyword: string | null;
}

// ─── SEO helpers (same as new page) ────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

interface SeoCheck {
  label: string;
  status: "good" | "warn" | "bad";
  message: string;
}

function analyzeSeo(
  title: string, excerpt: string, focusKeyword: string,
  slug: string, htmlContent: string, thumbnail: string
): SeoCheck[] {
  const checks: SeoCheck[] = [];
  const plainContent = stripHtml(htmlContent).toLowerCase();
  const kw = focusKeyword.trim().toLowerCase();

  const titleLen = title.length;
  if (titleLen === 0) checks.push({ label: "Tiêu đề SEO", status: "bad", message: "Chưa có tiêu đề" });
  else if (titleLen < 30) checks.push({ label: "Tiêu đề SEO", status: "warn", message: `Quá ngắn (${titleLen}/60 ký tự). Nên 50-60` });
  else if (titleLen <= 60) checks.push({ label: "Tiêu đề SEO", status: "good", message: `Độ dài tốt (${titleLen}/60 ký tự)` });
  else checks.push({ label: "Tiêu đề SEO", status: "warn", message: `Hơi dài (${titleLen}/60). Google sẽ cắt bớt` });

  const excLen = excerpt.length;
  if (excLen === 0) checks.push({ label: "Mô tả meta", status: "bad", message: "Chưa có mô tả. Nên 150-160 ký tự" });
  else if (excLen < 120) checks.push({ label: "Mô tả meta", status: "warn", message: `Ngắn (${excLen}/160). Nên 150-160` });
  else if (excLen <= 160) checks.push({ label: "Mô tả meta", status: "good", message: `Tốt (${excLen}/160 ký tự)` });
  else checks.push({ label: "Mô tả meta", status: "warn", message: `Hơi dài (${excLen}/160). Google sẽ cắt bớt` });

  if (!kw) {
    checks.push({ label: "Từ khóa chính", status: "warn", message: "Chưa đặt Focus keyword" });
  } else {
    checks.push(title.toLowerCase().includes(kw)
      ? { label: "Từ khóa trong tiêu đề", status: "good", message: "Có chứa từ khóa" }
      : { label: "Từ khóa trong tiêu đề", status: "bad", message: "Tiêu đề chưa chứa từ khóa" });

    checks.push(excerpt.toLowerCase().includes(kw)
      ? { label: "Từ khóa trong mô tả", status: "good", message: "Mô tả có chứa từ khóa" }
      : { label: "Từ khóa trong mô tả", status: "bad", message: "Mô tả chưa chứa từ khóa" });

    const kwSlug = kw.replace(/\s+/g, "-");
    checks.push(slug.includes(kwSlug) || slug.includes(kw.replace(/\s+/g, ""))
      ? { label: "Từ khóa trong URL", status: "good", message: "Slug chứa từ khóa" }
      : { label: "Từ khóa trong URL", status: "warn", message: "Slug chưa chứa từ khóa" });

    if (plainContent.includes(kw)) {
      const count = plainContent.split(kw).length - 1;
      checks.push(count >= 3
        ? { label: "Từ khóa trong nội dung", status: "good", message: `Xuất hiện ${count} lần` }
        : { label: "Từ khóa trong nội dung", status: "warn", message: `Chỉ ${count} lần. Nên ≥ 3` });
    } else {
      checks.push({ label: "Từ khóa trong nội dung", status: "bad", message: "Nội dung chưa chứa từ khóa" });
    }

    const headings = (htmlContent.match(/<h[23][^>]*>.*?<\/h[23]>/gi) || []).join(" ").toLowerCase();
    checks.push(headings.includes(kw)
      ? { label: "Từ khóa trong heading", status: "good", message: "Có trong H2/H3" }
      : { label: "Từ khóa trong heading", status: "warn", message: "Chưa có trong H2/H3" });
  }

  const wordCount = plainContent.split(/\s+/).filter(Boolean).length;
  if (wordCount === 0) checks.push({ label: "Độ dài nội dung", status: "bad", message: "Chưa có nội dung" });
  else if (wordCount < 300) checks.push({ label: "Độ dài nội dung", status: "warn", message: `${wordCount} từ — nên ≥ 300` });
  else checks.push({ label: "Độ dài nội dung", status: "good", message: `${wordCount} từ — tốt` });

  const imgCount = (htmlContent.match(/<img/gi) || []).length;
  checks.push(imgCount > 0
    ? { label: "Hình ảnh", status: "good", message: `Có ${imgCount} ảnh` }
    : { label: "Hình ảnh", status: "warn", message: "Chưa có ảnh minh họa" });

  checks.push(thumbnail
    ? { label: "Ảnh thumbnail", status: "good", message: "Đã có (og:image)" }
    : { label: "Ảnh thumbnail", status: "bad", message: "Cần cho chia sẻ MXH" });

  const linkCount = (htmlContent.match(/<a\s/gi) || []).length;
  checks.push(linkCount > 0
    ? { label: "Liên kết", status: "good", message: `${linkCount} liên kết` }
    : { label: "Liên kết", status: "warn", message: "Nên thêm internal links" });

  return checks;
}

function seoScoreColor(checks: SeoCheck[]): { color: string; label: string; pct: number } {
  const total = checks.length;
  const good = checks.filter((c) => c.status === "good").length;
  const pct = Math.round((good / total) * 100);
  if (pct >= 80) return { color: "#D4A843", label: "Tốt", pct };
  if (pct >= 50) return { color: "#f59e0b", label: "Trung bình", pct };
  return { color: "#ef4444", label: "Cần cải thiện", pct };
}

function charBarColor(len: number, min: number, max: number): string {
  if (len === 0) return "#333";
  if (len < min) return "#f59e0b";
  if (len <= max) return "#D4A843";
  return "#ef4444";
}

// ═══════════════════════════════════════════════════════════════════════════

export default function EditBlogPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [initialHtml, setInitialHtml] = useState<string | null>(null);
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
  const [currentStatus, setCurrentStatus] = useState<"draft" | "published">("draft");
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [seoOpen, setSeoOpen] = useState(true);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await fetch(`/api/blog?id=${postId}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        const post: BlogPost = data.post;
        setTitle(post.title);
        setSlug(post.slug);
        setExcerpt(post.excerpt || "");
        setCategory(post.category || "");
        setTags((post.tags || []).join(", "));
        setThumbnail(post.thumbnail || "");
        setCurrentStatus(post.status);
        setFocusKeyword(post.focus_keyword || "");
        const content = post.content || post.body || "";
        setHtmlContent(content);
        setInitialHtml(content);
      } catch {
        setError("Không tìm thấy bài viết");
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
  }, [postId]);

  const handleEditorChange = useCallback((html: string) => {
    setHtmlContent(html);
  }, []);

  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("Ảnh thumbnail không được vượt quá 2MB"); return; }
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) { setError("Chỉ chấp nhận JPEG, PNG, WebP, GIF"); return; }
    setUploadingThumb(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/blog-image", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.url) setThumbnail(data.url);
      else setError(data.error || "Lỗi tải ảnh thumbnail");
    } catch { setError("Lỗi kết nối khi tải ảnh"); }
    finally {
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

  const handleSave = async (status: "draft" | "published", sendEmail: boolean = false) => {
    if (!title.trim()) { setError("Vui lòng nhập tiêu đề"); return; }
    setSaving(sendEmail ? "email" : status);
    setError(null);
    setSuccess(null);
    try {
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await fetch("/api/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: postId, title, slug, excerpt,
          body: htmlContent, content: htmlContent,
          category, tags: tagList.length > 0 ? tagList : null,
          thumbnail: thumbnail || null, status, sendEmail,
          focus_keyword: focusKeyword.trim() || null,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setCurrentStatus(status);
        if (status === "draft") setSuccess("Đã lưu nháp!");
        else if (sendEmail) { setSuccess("Đã xuất bản và gửi email!"); setTimeout(() => router.push("/admin/blog"), 1500); }
        else { setSuccess("Đã xuất bản!"); setTimeout(() => router.push("/admin/blog"), 1500); }
      } else setError(json.error || "Lỗi lưu bài viết");
    } catch { setError("Lỗi kết nối"); }
    finally { setSaving(null); }
  };

  const handleDelete = async () => {
    setSaving("delete");
    try {
      const res = await fetch(`/api/blog?id=${postId}`, { method: "DELETE" });
      if (res.ok) router.push("/admin/blog");
      else setError("Lỗi xoá bài viết");
    } catch { setError("Lỗi kết nối"); }
    finally { setSaving(null); setShowDelete(false); }
  };

  const wordCount = useMemo(() => stripHtml(htmlContent).split(/\s+/).filter(Boolean).length, [htmlContent]);
  const seoChecks = useMemo(() => analyzeSeo(title, excerpt, focusKeyword, slug, htmlContent, thumbnail), [title, excerpt, focusKeyword, slug, htmlContent, thumbnail]);
  const seoScore = useMemo(() => seoScoreColor(seoChecks), [seoChecks]);

  if (loading) {
    return (
      <div>
        <TopBar title="Chỉnh sửa bài viết" subtitle="Quản lý Blog" />
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 size={16} className="animate-spin" />
            Đang tải bài viết...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Chỉnh sửa bài viết" subtitle="Quản lý Blog" />

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
            {/* Status badge */}
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{
                background: currentStatus === "published" ? "rgba(212,168,67,0.1)" : "rgba(107,114,128,0.1)",
                color: currentStatus === "published" ? "#D4A843" : "#9ca3af",
                border: `1px solid ${currentStatus === "published" ? "rgba(212,168,67,0.25)" : "rgba(107,114,128,0.25)"}`,
              }}
            >
              {currentStatus === "published" ? <><Globe size={11} /> Đã xuất bản</> : <><FileText size={11} /> Nháp</>}
            </span>

            {/* SEO Score */}
            <span
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: seoScore.color + "18", color: seoScore.color, border: `1px solid ${seoScore.color}40` }}
            >
              <Target size={11} />
              SEO: {seoScore.pct}%
            </span>

            {wordCount > 0 && (
              <span className="text-xs text-gray-600">{wordCount.toLocaleString("vi-VN")} từ</span>
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

        {/* ── Title ── */}
        <div className="card-dark p-5">
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Tiêu đề bài viết <span className="text-red-400">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề bài viết..."
            className="input-dark text-xl font-bold"
          />
          <div className="flex items-center gap-2 mt-2">
            <div className="h-1 flex-1 rounded-full overflow-hidden" style={{ background: "#222" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (title.length / 60) * 100)}%`, background: charBarColor(title.length, 30, 60) }}
              />
            </div>
            <span className="text-[10px] shrink-0" style={{ color: charBarColor(title.length, 30, 60) }}>
              {title.length}/60
            </span>
          </div>
        </div>

        {/* ── Editor Section ── */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">Nội dung bài viết</label>
          {showPreview ? (
            <div className="card-dark p-6" style={{ minHeight: 450 }}>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#2a2a2a]">
                <Eye size={14} className="text-blue-400" />
                <span className="text-xs font-semibold text-blue-400">PREVIEW</span>
              </div>
              <div className="blog-content text-gray-300 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </div>
          ) : (
            initialHtml !== null && <NovelEditor onChange={handleEditorChange} initialHtml={initialHtml} />
          )}
        </div>

        {/* ── SEO Panel ── */}
        <div className="card-dark overflow-hidden">
          <button
            type="button"
            onClick={() => setSeoOpen(!seoOpen)}
            className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search size={15} className="text-[#D4A843]" />
              <span className="text-sm font-semibold text-white">SEO & Thông tin bài viết</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: seoScore.color + "18", color: seoScore.color }}>
                {seoScore.pct}%
              </span>
            </div>
            {seoOpen ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
          </button>

          {seoOpen && (
            <div className="border-t border-[#2a2a2a] p-5 space-y-5">

              {/* Google Preview */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Xem trước trên Google
                </label>
                <div className="rounded-lg p-4" style={{ background: "#fff" }}>
                  <div className="text-[13px] text-[#202124] truncate" style={{ fontFamily: "Arial, sans-serif" }}>
                    dangkhuong.com &rsaquo; blog &rsaquo; {slug || "..."}
                  </div>
                  <div className="text-[20px] leading-tight mt-1 truncate" style={{ color: "#1a0dab", fontFamily: "Arial, sans-serif" }}>
                    {title || "Tiêu đề bài viết"}
                  </div>
                  <div className="text-[14px] mt-1 line-clamp-2" style={{ color: "#4d5156", fontFamily: "Arial, sans-serif" }}>
                    {excerpt || "Mô tả meta sẽ hiển thị ở đây..."}
                  </div>
                </div>
              </div>

              {/* Focus Keyword */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                  <Target size={11} /> Từ khóa chính (Focus keyword)
                </label>
                <input value={focusKeyword} onChange={(e) => setFocusKeyword(e.target.value)} placeholder="VD: kinh doanh sản phẩm số" className="input-dark text-sm" />
                <p className="text-[10px] text-gray-600 mt-1">Từ khóa mà bạn muốn bài viết xếp hạng trên Google</p>
              </div>

              {/* Slug + Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Slug (URL)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-600 shrink-0">dangkhuong.com/blog/</span>
                    <input value={slug} onChange={(e) => setSlug(e.target.value)} className="input-dark flex-1 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Chủ đề</label>
                  <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Marketing, Kinh doanh..." className="input-dark text-sm" />
                </div>
              </div>

              {/* Meta description */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Mô tả meta (SEO description)</label>
                <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Tóm tắt 150-160 ký tự cho Google hiển thị..." rows={3} maxLength={300} className="input-dark text-sm resize-none" />
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-1 flex-1 rounded-full overflow-hidden" style={{ background: "#222" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (excerpt.length / 160) * 100)}%`, background: charBarColor(excerpt.length, 120, 160) }} />
                  </div>
                  <span className="text-[10px] shrink-0" style={{ color: charBarColor(excerpt.length, 120, 160) }}>{excerpt.length}/160</span>
                </div>
              </div>

              {/* Tags + Thumbnail */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                    <Tag size={11} /> Tags
                  </label>
                  <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="seo, marketing, kinh-doanh" className="input-dark text-sm" />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                    <ImageIcon size={11} /> Ảnh thumbnail (tối đa 2MB)
                  </label>
                  <input ref={thumbInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleThumbUpload} className="hidden" />
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
                    <button type="button" onClick={() => thumbInputRef.current?.click()} disabled={uploadingThumb} className="w-full h-24 rounded-lg border border-dashed border-[#333] hover:border-[#D4A84340] bg-[#141414] hover:bg-[#1a1a1a] transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer">
                      {uploadingThumb ? (
                        <><Loader2 size={18} className="text-gray-500 animate-spin" /><span className="text-xs text-gray-500">Đang tải lên...</span></>
                      ) : (
                        <><Upload size={18} className="text-gray-600" /><span className="text-xs text-gray-500">Nhấn để chọn ảnh</span><span className="text-[10px] text-gray-700">JPEG, PNG, WebP, GIF</span></>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Author Info */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  <User size={11} className="inline mr-1" />
                  Thông tin tác giả
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-start">
                  <div>
                    <input ref={authorAvatarRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAuthorAvatarUpload} className="hidden" />
                    <div className="w-20 h-20 rounded-2xl overflow-hidden cursor-pointer relative group border border-[#2a2a2a]" onClick={() => authorAvatarRef.current?.click()}>
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
                    <p className="text-[9px] text-gray-600 mt-1 text-center">Ảnh tác giả</p>
                  </div>
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

              {/* SEO Checklist */}
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
          <button onClick={() => handleSave("draft")} disabled={!!saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors" style={{ background: "#1f1f1f", color: "#9ca3af", border: "1px solid #333" }}>
            {saving === "draft" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Lưu nháp
          </button>

          <button onClick={() => handleSave("published", false)} disabled={!!saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors" style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)" }}>
            {saving === "published" ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />} Xuất bản
          </button>

          <button onClick={() => handleSave("published", true)} disabled={!!saving} className="btn-green text-sm py-2.5 px-5">
            {saving === "email" ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />} Xuất bản & gửi email
          </button>

          <div className="flex-1" />

          {!showDelete ? (
            <button onClick={() => setShowDelete(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <Trash2 size={13} /> Xoá
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">Xác nhận xoá?</span>
              <button onClick={handleDelete} disabled={!!saving} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-colors">
                {saving === "delete" ? <Loader2 size={12} className="animate-spin" /> : "Xoá"}
              </button>
              <button onClick={() => setShowDelete(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-white transition-colors">
                Huỷ
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
