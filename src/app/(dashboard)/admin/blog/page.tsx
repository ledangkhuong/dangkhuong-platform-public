"use client";

import { useState, useRef, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import {
  Plus,
  Eye,
  Bold,
  Italic,
  Heading2,
  Link2,
  Code2,
  X,
  FileText,
  Tag,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  category: string;
  status: "published" | "draft";
  views: number;
  date: string;
  content: string;
  excerpt: string;
  tags: string[];
  thumbnail: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const CATEGORIES = ["Mindset", "Tài chính", "Kỹ năng", "Công nghệ", "Khởi nghiệp"];

const MOCK_POSTS: BlogPost[] = [
  {
    id: "1",
    slug: "tu-do-tai-chinh-khong-phai-uoc-mo",
    title: "Tự do tài chính không phải ước mơ — Đây là kế hoạch thực tế",
    category: "Tài chính",
    status: "published",
    views: 8420,
    date: "2026-05-05",
    thumbnail: "💰",
    tags: ["tài chính", "tự do", "kế hoạch"],
    excerpt:
      "Hầu hết mọi người nghĩ tự do tài chính là đặc quyền của người giàu. Sự thật là đó chỉ là vấn đề hệ thống và thói quen.",
    content: `## Tự do tài chính — Bắt đầu từ đâu?

Hầu hết mọi người nghĩ tự do tài chính là đặc quyền của người giàu. Nhưng thực tế, đó chỉ là vấn đề **hệ thống** và **thói quen** được xây dựng đúng cách.

### 3 nguyên tắc cốt lõi

1. **Kiểm soát dòng tiền** — biết chính xác tiền vào/ra mỗi tháng
2. **Đầu tư sớm, đầu tư đều** — lợi suất kép hoạt động theo thời gian
3. **Tạo thu nhập thụ động** — tiền làm việc thay bạn

> "Đừng làm việc vì tiền. Hãy làm cho tiền làm việc cho bạn." — Robert Kiyosaki`,
  },
  {
    id: "2",
    slug: "mindset-tang-truong-la-gi",
    title: "Growth Mindset là gì và tại sao nó quyết định thành công của bạn?",
    category: "Mindset",
    status: "published",
    views: 5103,
    date: "2026-04-28",
    thumbnail: "🧠",
    tags: ["mindset", "phát triển bản thân", "tư duy"],
    excerpt:
      "Carol Dweck đã nghiên cứu hàng nghìn người và phát hiện ra một điều đơn giản nhưng thay đổi tất cả: cách bạn nghĩ về khả năng của mình.",
    content: `## Growth Mindset — Tư duy tăng trưởng

Carol Dweck đã nghiên cứu hàng nghìn học sinh và phát hiện ra sự khác biệt cốt lõi giữa những người thành công và không thành công.

### Fixed vs Growth Mindset

| Fixed Mindset | Growth Mindset |
|---|---|
| Tài năng là bẩm sinh | Kỹ năng có thể học |
| Tránh thất bại | Học từ thất bại |
| Bỏ cuộc khi khó | Kiên trì với thử thách |

Hãy bắt đầu thay đổi ngay hôm nay bằng cách **đặt câu hỏi "Tôi có thể học điều này không?" thay vì "Tôi có giỏi điều này không?"**`,
  },
  {
    id: "3",
    slug: "ai-thay-doi-cach-lam-viec",
    title: "AI đang thay đổi cách chúng ta làm việc — Bạn đã sẵn sàng chưa?",
    category: "Công nghệ",
    status: "published",
    views: 12350,
    date: "2026-04-15",
    thumbnail: "🤖",
    tags: ["AI", "công nghệ", "tương lai", "kỹ năng số"],
    excerpt:
      "ChatGPT, Gemini, Claude... Những công cụ AI đang xuất hiện với tốc độ chóng mặt. Người thắng không phải ai biết code — mà là ai biết cách dùng AI.",
    content: `## AI và Tương lai Công việc

Không phải AI sẽ lấy đi công việc của bạn — mà là **người biết dùng AI** sẽ lấy đi công việc đó.

### Những kỹ năng AI không thể thay thế

- **Tư duy phản biện** — đánh giá output của AI
- **Sáng tạo chiến lược** — định hướng AI làm gì
- **Kỹ năng giao tiếp** — trình bày kết quả cho con người

### Bắt đầu từ hôm nay

\`\`\`
Bước 1: Chọn 1 tool AI phù hợp với công việc
Bước 2: Dành 30 phút/ngày thực hành
Bước 3: Tích hợp vào workflow thực tế
\`\`\``,
  },
  {
    id: "4",
    slug: "khoi-nghiep-khong-can-von-lon",
    title: "Khởi nghiệp không cần vốn lớn — Chiến lược bootstrapping từ 0đ",
    category: "Khởi nghiệp",
    status: "draft",
    views: 0,
    date: "2026-05-08",
    thumbnail: "🚀",
    tags: ["khởi nghiệp", "bootstrapping", "business"],
    excerpt:
      "Nhiều doanh nghiệp tỷ đô bắt đầu từ garage và không có vốn đầu tư. Bí quyết là gì?",
    content: `## Bootstrapping — Khởi nghiệp từ bàn tay trắng

*(Bài viết đang được hoàn thiện)*

Nhiều doanh nghiệp tỷ đô bắt đầu từ garage mà không có vốn đầu tư bên ngoài.

### Nguyên tắc bootstrapping

1. Bán trước, xây dựng sau (pre-sell)
2. Tối thiểu hoá chi phí cố định
3. Reinvest 100% doanh thu ban đầu`,
  },
  {
    id: "5",
    slug: "ky-nang-viet-loi-cuon",
    title: "7 kỹ năng viết lôi cuốn giúp content của bạn được chia sẻ 10x",
    category: "Kỹ năng",
    status: "published",
    views: 3870,
    date: "2026-03-22",
    thumbnail: "✍️",
    tags: ["viết lách", "content", "copywriting"],
    excerpt:
      "Viết hay không phải tài năng bẩm sinh — đó là kỹ năng có thể học được bằng cách luyện tập đúng cách.",
    content: `## 7 Kỹ năng Viết Lôi cuốn

Viết hay không phải tài năng bẩm sinh. Đây là **7 nguyên tắc** bạn có thể áp dụng ngay.

### 1. Hook mạnh trong câu đầu tiên

Câu đầu tiên quyết định người đọc có tiếp tục không.

### 2. Câu ngắn — dễ đọc hơn

Trung bình 15-20 từ mỗi câu là lý tưởng.

### 3. Dùng "bạn" thay vì "người đọc"

Tạo cảm giác đang nói chuyện 1-1.`,
  },
];

// ─── Empty post template ──────────────────────────────────────────────────────

function emptyPost(): BlogPost {
  return {
    id: "",
    slug: "",
    title: "",
    category: CATEGORIES[0],
    status: "draft",
    views: 0,
    date: new Date().toISOString().slice(0, 10),
    content: "",
    excerpt: "",
    tags: [],
    thumbnail: "📝",
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatViews(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return n.toString();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ─── Toolbar buttons config ───────────────────────────────────────────────────

const TOOLBAR_ITEMS = [
  { label: "B", Icon: Bold, syntax: (sel: string) => `**${sel || "bold text"}**`, title: "Bold" },
  { label: "I", Icon: Italic, syntax: (sel: string) => `*${sel || "italic text"}*`, title: "Italic" },
  { label: "H2", Icon: Heading2, syntax: (sel: string) => `\n## ${sel || "Tiêu đề"}`, title: "Heading 2" },
  { label: "Link", Icon: Link2, syntax: (sel: string) => `[${sel || "link text"}](https://)`, title: "Link" },
  { label: "Code", Icon: Code2, syntax: (sel: string) => `\`${sel || "code"}\``, title: "Inline code" },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>(MOCK_POSTS);
  const [selectedPost, setSelectedPost] = useState<BlogPost>(MOCK_POSTS[0]);
  const [isNew, setIsNew] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Select post from list ──────────────────────────────────────────────────
  const handleSelectPost = (post: BlogPost) => {
    setSelectedPost({ ...post });
    setIsNew(false);
    setTagInput("");
  };

  // ── New post ───────────────────────────────────────────────────────────────
  const handleNewPost = () => {
    setSelectedPost(emptyPost());
    setIsNew(true);
    setTagInput("");
  };

  // ── Field update ───────────────────────────────────────────────────────────
  const updateField = <K extends keyof BlogPost>(key: K, value: BlogPost[K]) => {
    setSelectedPost((prev) => ({ ...prev, [key]: value }));
  };

  // ── Tag management ─────────────────────────────────────────────────────────
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = tagInput.trim().toLowerCase();
      if (trimmed && !selectedPost.tags.includes(trimmed)) {
        updateField("tags", [...selectedPost.tags, trimmed]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    updateField("tags", selectedPost.tags.filter((t) => t !== tag));
  };

  // ── Toolbar syntax injection ───────────────────────────────────────────────
  const injectSyntax = useCallback(
    (buildSyntax: (sel: string) => string) => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = el.value.slice(start, end);
      const inserted = buildSyntax(selected);
      const newValue = el.value.slice(0, start) + inserted + el.value.slice(end);
      updateField("content", newValue);
      // Restore focus & cursor after state update
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + inserted.length, start + inserted.length);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPost.content]
  );

  // ── Save handlers ──────────────────────────────────────────────────────────
  const handleSaveDraft = () => {
    const toSave: BlogPost = {
      ...selectedPost,
      status: "draft",
      id: selectedPost.id || Date.now().toString(),
      slug: selectedPost.slug || selectedPost.title.toLowerCase().replace(/\s+/g, "-"),
    };
    if (isNew) {
      setPosts((prev) => [toSave, ...prev]);
      setIsNew(false);
    } else {
      setPosts((prev) => prev.map((p) => (p.id === toSave.id ? toSave : p)));
    }
    setSelectedPost(toSave);
  };

  const handlePublish = () => {
    const toSave: BlogPost = {
      ...selectedPost,
      status: "published",
      id: selectedPost.id || Date.now().toString(),
      slug: selectedPost.slug || selectedPost.title.toLowerCase().replace(/\s+/g, "-"),
      date: new Date().toISOString().slice(0, 10),
    };
    if (isNew) {
      setPosts((prev) => [toSave, ...prev]);
      setIsNew(false);
    } else {
      setPosts((prev) => prev.map((p) => (p.id === toSave.id ? toSave : p)));
    }
    setSelectedPost(toSave);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar title="Quản lý Blog" subtitle="Viết, chỉnh sửa và xuất bản bài viết" />

      {/* Split view */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left panel: post list ──────────────────────────────────────── */}
        <aside
          className="flex flex-col shrink-0 border-r overflow-hidden"
          style={{ width: 288, borderColor: "#2a2a2a", background: "#111" }}
        >
          {/* New post button */}
          <div className="p-3 border-b" style={{ borderColor: "#2a2a2a" }}>
            <button className="btn-green w-full justify-center text-sm" onClick={handleNewPost}>
              <Plus size={15} />
              Bài mới
            </button>
          </div>

          {/* Post list */}
          <div className="flex-1 overflow-y-auto">
            {posts.map((post) => {
              const isActive = !isNew && selectedPost.id === post.id;
              return (
                <button
                  key={post.id}
                  onClick={() => handleSelectPost(post)}
                  className="w-full text-left px-3 py-3 border-b transition-colors"
                  style={{
                    borderColor: "#1f1f1f",
                    background: isActive ? "rgba(34,197,94,0.08)" : "transparent",
                    borderLeft: isActive ? "3px solid #22c55e" : "3px solid transparent",
                  }}
                >
                  {/* Title row */}
                  <div className="flex items-start gap-2 mb-1.5">
                    <span className="text-base leading-none mt-0.5 shrink-0">{post.thumbnail}</span>
                    <p
                      className="text-sm font-medium leading-snug line-clamp-2"
                      style={{ color: isActive ? "#22c55e" : "#e5e5e5" }}
                    >
                      {post.title}
                    </p>
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-2 flex-wrap ml-6">
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                      style={{ background: "#2a2a2a", color: "#9ca3af" }}
                    >
                      {post.category}
                    </span>

                    {post.status === "published" ? (
                      <span className="badge-green" style={{ fontSize: 10, padding: "1px 7px" }}>
                        Xuất bản
                      </span>
                    ) : (
                      <span className="badge-gold" style={{ fontSize: 10, padding: "1px 7px" }}>
                        Nháp
                      </span>
                    )}

                    {post.status === "published" && (
                      <span className="text-[10px] text-gray-600 flex items-center gap-1">
                        <Eye size={10} />
                        {formatViews(post.views)}
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] text-gray-700 mt-1 ml-6">{formatDate(post.date)}</div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── Right panel: editor ───────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto" style={{ background: "#0d0d0d" }}>
          <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">

            {/* Title */}
            <textarea
              rows={2}
              value={selectedPost.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Tiêu đề bài viết..."
              className="w-full resize-none bg-transparent border-b outline-none font-bold leading-tight placeholder:text-gray-700"
              style={{
                fontSize: 26,
                color: "#f5f5f5",
                borderColor: "#2a2a2a",
                paddingBottom: 12,
              }}
            />

            {/* Meta row: category, status, thumbnail */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 shrink-0">Chủ đề</label>
                <select
                  value={selectedPost.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  className="input-dark"
                  style={{ width: "auto", padding: "6px 10px", fontSize: 13 }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 shrink-0">Trạng thái</label>
                <select
                  value={selectedPost.status}
                  onChange={(e) => updateField("status", e.target.value as BlogPost["status"])}
                  className="input-dark"
                  style={{ width: "auto", padding: "6px 10px", fontSize: 13 }}
                >
                  <option value="draft">Bản nháp</option>
                  <option value="published">Xuất bản</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 shrink-0">Thumbnail</label>
                <input
                  type="text"
                  value={selectedPost.thumbnail}
                  onChange={(e) => updateField("thumbnail", e.target.value)}
                  placeholder="Emoji..."
                  className="input-dark text-center"
                  style={{ width: 60, padding: "6px 8px", fontSize: 18 }}
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag size={13} className="text-gray-500" />
                <span className="text-xs text-gray-500">Tags</span>
              </div>
              <div
                className="flex flex-wrap gap-2 p-2 rounded-lg min-h-[40px]"
                style={{ background: "#1f1f1f", border: "1px solid #2a2a2a" }}
              >
                {selectedPost.tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: "rgba(34,197,94,0.1)",
                      color: "#22c55e",
                      border: "1px solid rgba(34,197,94,0.2)",
                    }}
                  >
                    #{tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-0.5 hover:text-white transition-colors"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={selectedPost.tags.length === 0 ? "Nhập tag, Enter để thêm..." : "Thêm tag..."}
                  className="bg-transparent outline-none text-xs text-white flex-1 min-w-[120px]"
                  style={{ color: "#e5e5e5" }}
                />
              </div>
            </div>

            {/* Markdown editor */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid #2a2a2a" }}
            >
              {/* Toolbar */}
              <div
                className="flex items-center gap-1 px-3 py-2 border-b"
                style={{ background: "#1a1a1a", borderColor: "#2a2a2a" }}
              >
                <span className="text-xs text-gray-600 mr-2 flex items-center gap-1">
                  <FileText size={12} />
                  Markdown
                </span>
                {TOOLBAR_ITEMS.map(({ label, Icon, syntax, title }) => (
                  <button
                    key={label}
                    title={title}
                    onClick={() => injectSyntax(syntax)}
                    className="flex items-center justify-center w-7 h-7 rounded-md text-xs font-semibold transition-colors text-gray-400 hover:text-white hover:bg-white/10"
                  >
                    <Icon size={14} />
                  </button>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                rows={20}
                value={selectedPost.content}
                onChange={(e) => updateField("content", e.target.value)}
                placeholder={`Viết nội dung bằng **Markdown**...\n\n## Tiêu đề\n\nĐoạn văn thường với **chữ đậm** và *chữ nghiêng*.\n\n- Danh sách\n- Bullet points\n\n> Blockquote\n\n\`\`\`\nCode block\n\`\`\``}
                className="w-full resize-none bg-transparent outline-none font-mono text-sm leading-relaxed"
                style={{
                  padding: "16px",
                  color: "#d4d4d4",
                  minHeight: 420,
                  caretColor: "#22c55e",
                }}
              />
            </div>

            {/* Excerpt */}
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Mô tả ngắn (excerpt)</label>
              <textarea
                rows={3}
                value={selectedPost.excerpt}
                onChange={(e) => updateField("excerpt", e.target.value)}
                placeholder="Tóm tắt bài viết — hiển thị trên trang danh sách và thẻ SEO..."
                className="input-dark resize-none leading-relaxed"
                style={{ fontSize: 13 }}
              />
            </div>

            {/* Actions */}
            <div
              className="flex items-center gap-3 pt-4 border-t flex-wrap"
              style={{ borderColor: "#2a2a2a" }}
            >
              <button
                onClick={handleSaveDraft}
                className="flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
                style={{
                  background: "#2a2a2a",
                  color: "#9ca3af",
                  border: "1px solid #3a3a3a",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#fff";
                  e.currentTarget.style.background = "#333";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#9ca3af";
                  e.currentTarget.style.background = "#2a2a2a";
                }}
              >
                Lưu bản nháp
              </button>

              <button className="btn-green" onClick={handlePublish}>
                Xuất bản ngay
              </button>

              <button
                className="flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
                style={{
                  background: "transparent",
                  color: "#9ca3af",
                  border: "1px solid #2a2a2a",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#fff";
                  e.currentTarget.style.borderColor = "#444";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#9ca3af";
                  e.currentTarget.style.borderColor = "#2a2a2a";
                }}
              >
                <Eye size={15} />
                Xem trước
              </button>

              {selectedPost.id && (
                <span className="text-xs text-gray-700 ml-auto">
                  Cập nhật: {formatDate(selectedPost.date)}
                  {selectedPost.status === "published" && (
                    <span className="ml-2 text-gray-600">
                      · {formatViews(selectedPost.views)} lượt xem
                    </span>
                  )}
                </span>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
