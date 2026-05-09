import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import Image from "next/image";
import { Clock, Eye, ArrowRight, Tag, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

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

  // Extract unique categories from posts
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
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  i === 0
                    ? "bg-[#22c55e] text-white"
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
              <FileText size={48} className="text-gray-600" />
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
            className="card-dark p-6 block hover:bg-[#1f1f1f] transition-all group"
          >
            <div className="flex gap-6 items-start">
              {featured.thumbnail ? (
                <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 relative">
                  <Image
                    src={featured.thumbnail}
                    alt={featured.title}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl shrink-0"
                  style={{ background: "#222" }}
                >
                  <FileText size={32} className="text-gray-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge-green">✨ Nổi bật</span>
                  {featured.category && (
                    <span
                      className="text-xs text-gray-500 px-2 py-0.5 rounded-full"
                      style={{ background: "#222" }}
                    >
                      {featured.category}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-white mb-2 group-hover:text-[#22c55e] transition-colors leading-snug">
                  {featured.title}
                </h2>
                {featured.excerpt && (
                  <p className="text-gray-400 text-sm leading-relaxed mb-3 line-clamp-2">
                    {featured.excerpt}
                  </p>
                )}
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
                {featured.tags && featured.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <Tag size={10} className="text-gray-600" />
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
              <ArrowRight
                size={20}
                className="text-gray-600 group-hover:text-[#22c55e] transition-colors shrink-0 mt-1"
              />
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
                className="card-dark p-5 block hover:bg-[#1f1f1f] transition-all group"
              >
                <div className="flex gap-4">
                  {post.thumbnail ? (
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 relative">
                      <Image
                        src={post.thumbnail}
                        alt={post.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "#222" }}
                    >
                      <FileText size={20} className="text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {post.category && (
                      <span
                        className="text-[11px] text-gray-500 font-medium px-2 py-0.5 rounded-full mb-2 inline-block"
                        style={{ background: "#222" }}
                      >
                        {post.category}
                      </span>
                    )}
                    <h3 className="font-semibold text-white text-sm leading-snug mb-1 group-hover:text-[#22c55e] transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-gray-600">
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
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] text-gray-600 px-1.5 py-0.5 rounded-full"
                            style={{ background: "#1a1a1a" }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Newsletter CTA */}
        <div
          className="card-dark p-6 text-center"
          style={{ borderColor: "rgba(34,197,94,0.2)" }}
        >
          <div className="text-2xl mb-3">📬</div>
          <h3 className="font-bold text-white mb-1">
            Nhận bài viết mới mỗi tuần
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Tham gia 1,200+ người đang nhận newsletter marketing thực chiến của
            Đăng Khương
          </p>
          <div className="flex gap-2 max-w-sm mx-auto">
            <input
              type="email"
              placeholder="Email của bạn..."
              className="input-dark flex-1"
            />
            <button className="btn-green shrink-0">Đăng ký</button>
          </div>
        </div>
      </div>
    </div>
  );
}
