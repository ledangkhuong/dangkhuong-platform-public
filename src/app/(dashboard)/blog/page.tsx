import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import Image from "next/image";
import { Clock, Eye, ArrowRight, Tag, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import NewsletterForm from "@/components/blog/NewsletterForm";

export const metadata: Metadata = {
  title: "Blog — Lê Đăng Khương Academy",
  description: "Chia sẻ kiến thức về Video AI, thương hiệu cá nhân, marketing và kiếm tiền online từ Lê Đăng Khương.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog — Lê Đăng Khương Academy",
    description: "Chia sẻ kiến thức về Video AI, thương hiệu cá nhân, marketing và kiếm tiền online từ Lê Đăng Khương.",
    url: "/blog",
    siteName: "Lê Đăng Khương Academy",
    locale: "vi_VN",
    type: "website",
    images: [
      {
        url: "/images/hero/offer-banner.jpg",
        width: 1200,
        height: 630,
        alt: "Blog — Lê Đăng Khương Academy",
      },
    ],
  },
};

function formatVietnameseDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function estimateReadTime(content: string | null): string {
  if (!content) return "3 phút đọc";
  const wordCount = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(wordCount / 200));
  return `${minutes} phút đọc`;
}

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  thumbnail: string | null;
  category: string | null;
  tags: string[] | null;
  status: string;
  views: number;
  published_at: string | null;
  created_at: string;
}

export default async function BlogPage() {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const allPosts: BlogPost[] = posts ?? [];

  const categories = [
    "Tất cả",
    ...Array.from(new Set(allPosts.map((p) => p.category).filter(Boolean))),
  ] as string[];

  const featured = allPosts.length > 0 ? allPosts[0] : null;
  const rest = allPosts.slice(1);

  return (
    <div>
      <TopBar
        title="Blog"
        subtitle="Kiến thức thực chiến từ người đã làm được"
      />

      <div className="p-6 max-w-5xl mx-auto space-y-8">
        {/* Categories */}
        {categories.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat, i) => (
              <span
                key={cat}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                  i === 0
                    ? "bg-[#D4A843] text-white"
                    : "text-gray-400 hover:text-white"
                }`}
                style={
                  i !== 0
                    ? { background: "#1a1a1a", border: "1px solid #2a2a2a" }
                    : {}
                }
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Empty State */}
        {allPosts.length === 0 && (
          <div className="card-dark p-12 text-center">
            <div className="flex justify-center mb-4">
              <FileText size={48} className="text-gray-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Chưa có bài viết nào
            </h2>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              Các bài viết sẽ được cập nhật sớm. Hãy quay lại sau hoặc đăng ký
              nhận thông báo qua email để không bỏ lỡ nội dung mới nhất!
            </p>
          </div>
        )}

        {/* Featured Post */}
        {featured && (
          <Link
            href={`/blog/${featured.slug}`}
            className="card-dark block hover:bg-[#1f1f1f] transition-all group overflow-hidden"
          >
            {/* Thumbnail */}
            {featured.thumbnail ? (
              <div className="relative w-full aspect-[21/9] bg-[#1a1a1a]">
                <Image
                  src={featured.thumbnail}
                  alt={featured.title}
                  fill
                  className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, 900px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge-green text-[11px]">{"✨"} Nổi bật</span>
                    {featured.category && (
                      <span className="text-[11px] text-white/80 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-sm">
                        {featured.category}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug drop-shadow-lg">
                    {featured.title}
                  </h2>
                </div>
              </div>
            ) : (
              <div className="p-6 pb-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge-green text-[11px]">{"✨"} Nổi bật</span>
                  {featured.category && (
                    <span
                      className="text-[11px] text-gray-500 px-2 py-0.5 rounded-full"
                      style={{ background: "#222" }}
                    >
                      {featured.category}
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 group-hover:text-[#D4A843] transition-colors leading-snug">
                  {featured.title}
                </h2>
              </div>
            )}

            {/* Content area */}
            <div className="p-5 pt-3">
              {featured.excerpt && (
                <p className="text-gray-400 text-sm leading-relaxed mb-3 line-clamp-2">
                  {featured.excerpt}
                </p>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {estimateReadTime(featured.content)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye size={12} />
                    {featured.views.toLocaleString("vi-VN")} lượt đọc
                  </span>
                  <span>{formatVietnameseDate(featured.published_at)}</span>
                </div>
                <span className="flex items-center gap-1 text-xs text-[#D4A843] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Đọc bài viết <ArrowRight size={12} />
                </span>
              </div>
              {featured.tags && featured.tags.length > 0 && (
                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                  <Tag size={10} className="text-gray-500" />
                  {featured.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] text-gray-500 px-1.5 py-0.5 rounded-full"
                      style={{ background: "#222" }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        )}

        {/* Post Grid */}
        {rest.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            {rest.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="card-dark block hover:bg-[#1f1f1f] transition-all group overflow-hidden"
              >
                {/* Thumbnail */}
                {post.thumbnail ? (
                  <div className="relative w-full aspect-[16/9] bg-[#1a1a1a]">
                    <Image
                      src={post.thumbnail}
                      alt={post.title}
                      fill
                      className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, 450px"
                    />
                  </div>
                ) : (
                  <div
                    className="w-full aspect-[16/9] flex items-center justify-center"
                    style={{ background: "#1a1a1a" }}
                  >
                    <FileText size={36} className="text-gray-700" />
                  </div>
                )}

                {/* Content */}
                <div className="p-4">
                  {post.category && (
                    <span
                      className="text-[11px] text-gray-500 font-medium px-2 py-0.5 rounded-full mb-2 inline-block"
                      style={{ background: "#222" }}
                    >
                      {post.category}
                    </span>
                  )}
                  <h3 className="font-semibold text-white text-[15px] leading-snug mb-1.5 group-hover:text-[#D4A843] transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2.5">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {estimateReadTime(post.content)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye size={10} />
                      {post.views.toLocaleString("vi-VN")}
                    </span>
                    <span>{formatVietnameseDate(post.published_at)}</span>
                  </div>
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] text-gray-500 px-1.5 py-0.5 rounded-full"
                          style={{ background: "#1a1a1a" }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Newsletter CTA */}
        <NewsletterForm />
      </div>
    </div>
  );
}
