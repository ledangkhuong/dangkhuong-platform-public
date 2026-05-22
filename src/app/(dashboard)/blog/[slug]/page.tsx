import type { Metadata } from "next";
import { sanitizeHtml } from "@/lib/sanitize";
import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_AUTHOR } from "@/lib/author-config";
import {
  Eye,
  ArrowLeft,
  Tag,
  Calendar,
  Clock,
} from "lucide-react";
import ShareButtons from "@/components/blog/ShareButtons";
import RelatedPosts from "@/components/blog/RelatedPosts";

export const revalidate = 3600;

export async function generateStaticParams() {
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = await createAdminClient();
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("status", "published");

  return (posts || []).map((p) => ({ slug: p.slug }));
}

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
  focus_keyword: string | null;
  status: string;
  views: number;
  published_at: string | null;
  created_at: string;
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dangkhuong.com";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function estimateReadMinutes(content: string | null): number {
  if (!content) return 3;
  const text = content.replace(/<[^>]*>/g, " ").trim();
  const wordCount = text.split(/\s+/).length;
  return Math.max(1, Math.round(wordCount / 200));
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Metadata (SEO)
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("title, excerpt, thumbnail, tags, published_at, slug, content, focus_keyword")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!post) {
    return { title: "Bài viết không tồn tại — Lê Đăng Khương" };
  }

  const url = `${BASE_URL}/blog/${post.slug}`;
  const description =
    post.excerpt ||
    (post.content ? stripHtml(post.content).slice(0, 160) : undefined);

  const keywords = [
    ...(post.focus_keyword ? [post.focus_keyword] : []),
    ...(post.tags ?? []),
  ];

  return {
    title: `${post.title} — Lê Đăng Khương`,
    description,
    ...(keywords.length > 0 ? { keywords } : {}),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: post.title,
      description: description ?? undefined,
      url,
      siteName: "Lê Đăng Khương Academy",
      type: "article",
      publishedTime: post.published_at ?? undefined,
      tags: post.tags ?? undefined,
      locale: "vi_VN",
      ...(post.thumbnail
        ? {
            images: [
              {
                url: post.thumbnail,
                width: 1200,
                height: 630,
                alt: post.title,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: description ?? undefined,
      ...(post.thumbnail ? { images: [post.thumbnail] } : {}),
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

// ---------------------------------------------------------------------------
// JSON-LD Structured Data
// ---------------------------------------------------------------------------

function ArticleJsonLd({ post }: { post: BlogPost }) {
  const url = `${BASE_URL}/blog/${post.slug}`;
  const readMinutes = estimateReadMinutes(post.content);
  const wordCount = post.content
    ? stripHtml(post.content).split(/\s+/).length
    : 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || stripHtml(post.content || "").slice(0, 160),
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: post.published_at || post.created_at,
    dateModified: post.published_at || post.created_at,
    author: {
      "@type": "Person",
      name: DEFAULT_AUTHOR.name,
      url: BASE_URL,
      image: DEFAULT_AUTHOR.avatar,
      sameAs: [DEFAULT_AUTHOR.facebook].filter(Boolean),
    },
    publisher: {
      "@type": "Organization",
      name: "Lê Đăng Khương Academy",
      url: BASE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/icons/icon-192x192.png`,
      },
    },
    wordCount,
    timeRequired: `PT${readMinutes}M`,
    inLanguage: "vi",
    ...(post.thumbnail
      ? {
          image: {
            "@type": "ImageObject",
            url: post.thumbnail,
          },
        }
      : {}),
    ...(() => {
      const kw = [
        ...(post.focus_keyword ? [post.focus_keyword] : []),
        ...(post.tags ?? []),
      ];
      return kw.length > 0 ? { keywords: kw.join(", ") } : {};
    })(),
    ...(post.category
      ? { articleSection: post.category }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
    />
  );
}

// ---------------------------------------------------------------------------
// BreadcrumbList JSON-LD
// ---------------------------------------------------------------------------

function BreadcrumbJsonLd({ post }: { post: BlogPost }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Trang chủ",
        item: BASE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${BASE_URL}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `${BASE_URL}/blog/${post.slug}`,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
    />
  );
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

  // Fire-and-forget: increment views (best-effort, never crash the page)
  try {
    const cookieStore = await cookies();
    const viewCookieName = `viewed_blog_${slug}`;
    const alreadyViewed = cookieStore.has(viewCookieName);

    if (!alreadyViewed) {
      // Increment view count — don't await, don't crash on failure
      Promise.resolve(
        supabase.rpc("increment_blog_views", { blog_post_id: post.id })
      ).catch(() => {});

      // cookies().set() may throw in Server Components — wrap safely
      try {
        cookieStore.set(viewCookieName, "1", {
          maxAge: 60 * 60 * 24, // 24 hours
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        });
      } catch {
        // Setting cookies in Server Components may not be supported — ignore
      }
    }
  } catch {
    // Non-critical — silently ignore view tracking errors
  }

  const publishedDate = post.published_at
    ? formatDate(post.published_at)
    : formatDate(post.created_at);

  const readMinutes = estimateReadMinutes(post.content);
  const tags = post.tags ?? [];

  return (
    <div>
      {/* JSON-LD Structured Data */}
      <ArticleJsonLd post={post} />
      <BreadcrumbJsonLd post={post} />

      <TopBar title="Blog" subtitle="Kiến thức thực chiến" />

      <div className="p-6 max-w-4xl mx-auto">
        {/* Breadcrumb navigation */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
          <Link href="/" className="hover:text-white transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-white transition-colors">
            Blog
          </Link>
          <span>/</span>
          <span className="text-gray-400 truncate max-w-[200px]">
            {post.title}
          </span>
        </nav>

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
              <Clock size={12} />
              {readMinutes} phút đọc
            </span>
            <span className="flex items-center gap-1">
              <Eye size={12} />
              {post.views.toLocaleString()} lượt đọc
            </span>
          </div>

          {/* Thumbnail */}
          {post.thumbnail && (
            <div className="mb-6 rounded-xl overflow-hidden relative aspect-[16/9] bg-[#1a1a1a]">
              <Image
                src={post.thumbnail}
                alt={post.title}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 800px"
              />
            </div>
          )}

          <hr className="border-[#2a2a2a] mb-6" />

          {/* Content rendered as rich HTML */}
          {post.content && (
            <div
              className="blog-content text-gray-300 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
            />
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

        {/* ── Author Box ── */}
        <div
          className="card-dark p-5 sm:p-6 mb-6"
          style={{ borderColor: "rgba(212,168,67,0.15)" }}
        >
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
            {/* Avatar */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 relative bg-[#1a1a1a]">
              {DEFAULT_AUTHOR.avatar ? (
                <img
                  src={DEFAULT_AUTHOR.avatar}
                  alt={DEFAULT_AUTHOR.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[#D4A843] bg-[#D4A84310]">
                  {DEFAULT_AUTHOR.name.charAt(0)}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Tác giả
              </p>
              <h3 className="text-lg font-bold text-white mb-1.5">
                {DEFAULT_AUTHOR.name}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-3">
                {DEFAULT_AUTHOR.bio}
              </p>

              {/* Facebook link */}
              {DEFAULT_AUTHOR.facebook && (
                <a
                  href={DEFAULT_AUTHOR.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
                  style={{
                    background: "rgba(59,130,246,0.1)",
                    color: "#3b82f6",
                    border: "1px solid rgba(59,130,246,0.25)",
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  Theo dõi trên Facebook
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Share buttons */}
        <div className="mb-8">
          <ShareButtons title={post.title} slug={post.slug} />
        </div>

        {/* Related posts */}
        <div className="mb-8">
          <RelatedPosts
            currentPostId={post.id}
            category={post.category}
            tags={post.tags}
          />
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
