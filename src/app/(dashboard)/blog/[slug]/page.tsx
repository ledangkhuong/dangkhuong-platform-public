import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import { Clock, Eye, ArrowLeft, Share2, Heart, BookOpen, Tag } from "lucide-react";

// In production this would come from Supabase
const posts: Record<string, {
  slug: string; title: string; excerpt: string; category: string;
  thumbnail: string; readTime: string; views: number; date: string;
  author: string; content: string; tags: string[];
}> = {
  "xay-dung-personal-brand-tu-so-0": {
    slug: "xay-dung-personal-brand-tu-so-0",
    title: "7 Bước Xây Dựng Thương Hiệu Cá Nhân Từ Con Số 0 Trong 90 Ngày",
    excerpt: "Hầu hết mọi người nghĩ xây dựng thương hiệu cá nhân cần nhiều năm. Nhưng với đúng framework, bạn có thể tạo ra sức ảnh hưởng trong vòng 90 ngày.",
    category: "Personal Brand",
    thumbnail: "🚀",
    readTime: "8 phút đọc",
    views: 4821,
    date: "05/05/2025",
    author: "Đăng Khương",
    tags: ["personal brand", "marketing", "solopreneur"],
    content: `
Thương hiệu cá nhân không phải là "nổi tiếng". Nó là **mức độ tin tưởng** mà người khác có với bạn trong một lĩnh vực cụ thể.

Và tin tôi đi — bạn không cần hàng triệu followers để kiếm tiền từ thương hiệu cá nhân.

## Bước 1: Xác định vị thế chuyên gia

Đừng cố trở thành "chuyên gia tổng quát". Chọn **một vấn đề cụ thể** bạn giải quyết cho **một nhóm người cụ thể**.

Ví dụ: Thay vì "tôi dạy marketing", hãy là "tôi giúp các chuyên gia solo kiếm 50 triệu/tháng với email marketing".

**Framework chọn vị thế:**
- Bạn giỏi điều gì (kỹ năng)?
- Ai cần điều đó (đối tượng)?
- Họ sẵn sàng trả tiền không (thị trường)?

## Bước 2: Tạo content trụ cột (Pillar Content)

Mỗi tuần, tạo **1 bài content dài** — có thể là video YouTube, bài blog, hoặc newsletter.

Đây là nội dung "gốc" mà bạn sẽ repurpose thành nhiều định dạng khác.

Ví dụ từ 1 video 10 phút:
- 5 clip ngắn cho TikTok/Reels
- 1 bài blog
- 3 tweet/LinkedIn post
- 1 email newsletter

## Bước 3: Xây dựng email list từ ngày 1

Social media là thuê nhà. Email list là nhà của bạn.

**Công thức:** Traffic miễn phí → Lead magnet → Email list → Bán hàng

Lead magnet tốt nhất:
- Checklist/template đơn giản nhưng cực kỳ hữu ích
- Mini-course miễn phí (3–5 email)
- Tool/calculator

## Bước 4: Consistency beats intensity

Đăng 1 bài/ngày trong 30 ngày tốt hơn đăng 30 bài trong 1 ngày rồi biến mất 3 tháng.

**Mục tiêu 90 ngày:**
- Tháng 1: Xây dựng nền tảng (niche, content format, email list)
- Tháng 2: Consistency + tương tác cộng đồng
- Tháng 3: Ra mắt sản phẩm đầu tiên

## Bước 5: Collaboration > Competition

Trong 90 ngày đầu, kết nối với 10 người trong cùng lĩnh vực có audience lớn hơn bạn.

Đừng xin họ "collab" ngay. Hãy **cho đi trước**: comment có giá trị, share nội dung của họ, gửi feedback thực sự hữu ích.

## Bước 6: Bán hàng sớm hơn bạn nghĩ

Đừng chờ đến khi có 10,000 followers mới bán hàng. Ngay cả 100 người đúng audience cũng đủ để validate offer đầu tiên.

**Bắt đầu với:** Dịch vụ 1-1, workshop nhỏ, hoặc template/tool nhỏ giá thấp.

## Bước 7: Đo lường và điều chỉnh

Mỗi tuần dành 30 phút phân tích:
- Bài nào được tương tác nhiều nhất?
- Traffic đến từ đâu?
- Email nào có open rate cao?

Sau đó **làm nhiều hơn những gì đang hoạt động**.

---

Xây dựng thương hiệu cá nhân không phải về việc trở nên hoàn hảo. Nó về việc **liên tục xuất hiện, cung cấp giá trị, và xây dựng niềm tin** — một người một ngày.

Bạn đang ở ngày 1. Bắt đầu đi thôi.
    `.trim(),
  },
};

const relatedPosts = [
  { slug: "digital-product-gia-re-ban-chay", title: "Tại Sao Sản Phẩm Số Giá Rẻ Lại Bán Chạy Hơn?", category: "Digital Product", thumbnail: "📦", readTime: "6 phút đọc" },
  { slug: "email-marketing-viet-nam-2025", title: "Email Marketing Tại Việt Nam 2025", category: "Marketing", thumbnail: "📧", readTime: "10 phút đọc" },
  { slug: "mindset-kinh-doanh-mot-minh", title: "5 Thứ Tôi Phải Từ Bỏ Để Kinh Doanh Thành Công", category: "Mindset", thumbnail: "🧠", readTime: "7 phút đọc" },
];

interface BlogPostPageProps {
  params: { slug: string };
}

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const post = posts[params.slug];
  if (!post) return { title: "Bài viết không tồn tại" };
  return {
    title: `${post.title} — Đăng Khương`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
  };
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const post = posts[params.slug];

  if (!post) {
    return (
      <div>
        <TopBar title="Blog" subtitle="Kiến thức thực chiến" />
        <div className="p-6 max-w-3xl mx-auto text-center py-20">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-white mb-2">Không tìm thấy bài viết</h2>
          <p className="text-gray-400 mb-6">Bài viết này chưa được xuất bản hoặc không tồn tại.</p>
          <Link href="/blog" className="btn-green inline-flex items-center gap-2">
            <ArrowLeft size={15} /> Về trang Blog
          </Link>
        </div>
      </div>
    );
  }

  // Render simple markdown-like content
  const renderContent = (content: string) => {
    return content.split("\n").map((line, i) => {
      if (line.startsWith("## ")) {
        return <h2 key={i} className="text-lg font-bold text-white mt-8 mb-3">{line.slice(3)}</h2>;
      }
      if (line.startsWith("- ")) {
        return <li key={i} className="text-gray-300 text-sm leading-relaxed ml-4 list-disc">{line.slice(2).replace(/\*\*(.*?)\*\*/g, "$1")}</li>;
      }
      if (line === "---") {
        return <hr key={i} className="my-6" style={{ borderColor: "#2a2a2a" }} />;
      }
      if (line.trim() === "") {
        return <br key={i} />;
      }
      // Bold text
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} className="text-gray-300 text-sm leading-relaxed">
          {parts.map((part, j) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div>
      <TopBar title="Blog" subtitle="Kiến thức thực chiến" />

      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex gap-8">

          {/* Main content */}
          <article className="flex-1 min-w-0">
            {/* Back */}
            <Link href="/blog" className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
              <ArrowLeft size={15} /> Trở về Blog
            </Link>

            {/* Header */}
            <div className="card-dark p-6 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: "#222", color: "#9ca3af" }}>
                  {post.category}
                </span>
              </div>
              <div className="text-5xl mb-4">{post.thumbnail}</div>
              <h1 className="text-2xl font-bold text-white leading-snug mb-3">{post.title}</h1>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">{post.excerpt}</p>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Clock size={12} />{post.readTime}</span>
                  <span className="flex items-center gap-1"><Eye size={12} />{post.views.toLocaleString()} lượt đọc</span>
                  <span>{post.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg"
                    style={{ background: "#222" }}>
                    <Heart size={12} /> Yêu thích
                  </button>
                  <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg"
                    style={{ background: "#222" }}>
                    <Share2 size={12} /> Chia sẻ
                  </button>
                </div>
              </div>
            </div>

            {/* Article content */}
            <div className="card-dark p-6 mb-6 space-y-1">
              {renderContent(post.content)}
            </div>

            {/* Tags */}
            <div className="flex items-center gap-2 flex-wrap mb-6">
              <Tag size={14} className="text-gray-500" />
              {post.tags.map((tag) => (
                <span key={tag} className="text-xs px-2.5 py-1 rounded-full text-gray-400"
                  style={{ background: "#222", border: "1px solid #2a2a2a" }}>
                  #{tag}
                </span>
              ))}
            </div>

            {/* Author box */}
            <div className="card-dark p-5 flex gap-4 items-start">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
                style={{ background: "linear-gradient(135deg, #22c55e, #059669)" }}>
                ĐK
              </div>
              <div>
                <div className="font-semibold text-white mb-0.5">{post.author}</div>
                <div className="text-xs text-gray-500 mb-2">Marketing Expert · Founder tại dangkhuong.com</div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Chuyên gia xây dựng thương hiệu cá nhân & bán hàng số. 7+ năm kinh nghiệm thực chiến.
                  Đã đào tạo 1,200+ học viên tạo thu nhập từ kiến thức của mình.
                </p>
              </div>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0 space-y-4">
            {/* Reading progress */}
            <div className="card-dark p-4 sticky top-20">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={14} className="text-[#22c55e]" />
                <span className="text-xs font-semibold text-white">Nội dung bài viết</span>
              </div>
              <ul className="space-y-2">
                {["Xác định vị thế chuyên gia", "Tạo content trụ cột", "Xây dựng email list", "Consistency beats intensity", "Collaboration", "Bán hàng sớm", "Đo lường"].map((h, i) => (
                  <li key={h} className="text-xs text-gray-500 hover:text-gray-300 cursor-pointer transition-colors flex items-start gap-2">
                    <span className="text-[#22c55e] font-mono shrink-0">{i + 1}.</span>
                    <span className="leading-relaxed">{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter */}
            <div className="card-dark p-4" style={{ borderColor: "rgba(34,197,94,0.2)" }}>
              <div className="text-xl mb-2">📬</div>
              <h3 className="font-semibold text-white text-sm mb-1">Nhận bài mới hàng tuần</h3>
              <p className="text-xs text-gray-400 mb-3">1,200+ người đang đọc newsletter của Đăng Khương</p>
              <input type="email" placeholder="Email của bạn..." className="input-dark w-full text-sm mb-2" />
              <button className="btn-green w-full justify-center text-sm">Đăng ký</button>
            </div>
          </aside>
        </div>

        {/* Related posts */}
        <div className="mt-10">
          <h2 className="font-bold text-white text-lg mb-4">Bài viết liên quan</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {relatedPosts.map((rp) => (
              <Link key={rp.slug} href={`/blog/${rp.slug}`}
                className="card-dark p-4 block hover:bg-[#1f1f1f] transition-all group">
                <div className="text-3xl mb-3">{rp.thumbnail}</div>
                <span className="text-[10px] text-gray-500 px-2 py-0.5 rounded-full mb-2 inline-block"
                  style={{ background: "#222" }}>{rp.category}</span>
                <h3 className="font-semibold text-white text-sm leading-snug group-hover:text-[#22c55e] transition-colors line-clamp-2 mb-2">{rp.title}</h3>
                <span className="text-xs text-gray-500 flex items-center gap-1"><Clock size={10} />{rp.readTime}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
