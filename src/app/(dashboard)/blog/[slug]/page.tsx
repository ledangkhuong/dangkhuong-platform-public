import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Eye,
  ArrowLeft,
  Share2,
  Heart,
  Tag,
  Calendar,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

type PageProps = {
  params: Promise<{ slug: string }>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("title, excerpt, tags, published_at")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!post) {
    return { title: "Bài viết không tồn tại — Đăng Khương" };
  }

  return {
    title: `${post.title} — Đăng Khương`,
    description: post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      type: "article",
      publishedTime: post.published_at ?? undefined,
      tags: post.tags ?? undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt ?? undefined,
    },
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single<BlogPost>();

  if (!post) {
    notFound();
  }

  // Fire-and-forget: increment views
  supabase
    .from("blog_posts")
    .update({ views: (post.views ?? 0) + 1 })
    .eq("id", post.id)
    .then(() => {});

  const publishedDate = post.published_at
    ? formatDate(post.published_at)
    : formatDate(post.created_at);

  const tags = post.tags ?? [];

  return (
    <div>
      <TopBar title="Blog" subtitle="Kiến thức thực chiến" />

      <div className="p-6 max-w-4xl mx-auto">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={15} /> Quay lại Blog
        </Link>

        {/* Article card */}
        <article className="card-dark p-6 md:p-8 mb-6">
          {/* Category */}
          {post.category && (
            <div className="mb-4">
              <span className="badge-green text-xs">{post.category}</span>
            </div>
          )}

          {/* Thumbnail */}
          {post.thumbnail && (
            <div className="mb-5 rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.thumbnail}
                alt={post.title}
                className="w-full h-auto object-cover rounded-lg"
              />
            </div>
          )}

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-white leading-snug mb-3">
            {post.title}
          </h1>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              {post.excerpt}
            </p>
          )}

          {/* Meta info */}
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-6 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {publishedDate}
            </span>
            <span className="flex items-center gap-1">
              <Eye size={12} />
              {post.views.toLocaleString()} lượt đọc
            </span>
          </div>

          <hr className="border-[#2a2a2a] mb-6" />

          {/* Content rendered as pre-formatted text */}
          {post.content && (
            <div
              className="text-gray-300 text-sm leading-relaxed"
              style={{ whiteSpace: "pre-line" }}
            >
              {post.content}
            </div>
          )}
        </article>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-6">
            <Tag size={14} className="text-gray-500" />
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-full text-gray-400"
                style={{ background: "#222", border: "1px solid #2a2a2a" }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mb-8">
          <button
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg"
            style={{ background: "#222" }}
          >
            <Heart size={12} /> Yêu thích
          </button>
          <button
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg"
            style={{ background: "#222" }}
          >
            <Share2 size={12} /> Chia sẻ
          </button>
        </div>

        {/* Back link (bottom) */}
        <Link
          href="/blog"
          className="btn-green inline-flex items-center gap-2"
        >
          <ArrowLeft size={15} /> Quay lại Blog
        </Link>
      </div>
    </div>
  );
}
