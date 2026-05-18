import Image from "next/image";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";

interface RelatedPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  thumbnail: string | null;
  category: string | null;
  published_at: string | null;
}

interface RelatedPostsProps {
  currentPostId: string;
  category: string | null;
  tags: string[] | null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function truncateExcerpt(text: string, maxLength = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}

async function getRelatedPosts(
  currentPostId: string,
  category: string | null,
  tags: string[] | null,
): Promise<RelatedPost[]> {
  const supabase = await createAdminClient();
  const needed = 3;

  // Step 1: Try matching by category
  let posts: RelatedPost[] = [];

  if (category) {
    const { data } = await supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, thumbnail, category, published_at")
      .eq("status", "published")
      .neq("id", currentPostId)
      .eq("category", category)
      .order("published_at", { ascending: false })
      .limit(needed);

    if (data) {
      posts = data;
    }
  }

  // Step 2: If we still need more, try matching by tags
  if (posts.length < needed && tags && tags.length > 0) {
    const existingIds = [currentPostId, ...posts.map((p) => p.id)];

    const { data } = await supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, thumbnail, category, published_at")
      .eq("status", "published")
      .not("id", "in", `(${existingIds.join(",")})`)
      .overlaps("tags", tags)
      .order("published_at", { ascending: false })
      .limit(needed - posts.length);

    if (data) {
      posts = [...posts, ...data];
    }
  }

  return posts;
}

export default async function RelatedPosts({
  currentPostId,
  category,
  tags,
}: RelatedPostsProps) {
  const posts = await getRelatedPosts(currentPostId, category, tags);

  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-white mb-5">Bài viết liên quan</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="group rounded-xl border border-white/10 bg-white/5 overflow-hidden transition-colors hover:border-[#D4A843]/30 hover:bg-white/[0.07]"
          >
            {/* Thumbnail */}
            {post.thumbnail ? (
              <div className="relative aspect-[16/9] bg-[#1a1a1a]">
                <Image
                  src={post.thumbnail}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
            ) : (
              <div className="aspect-[16/9] bg-[#1a1a1a] flex items-center justify-center">
                <span className="text-3xl text-gray-600">&#x1f4dd;</span>
              </div>
            )}

            {/* Content */}
            <div className="p-4">
              {/* Category badge */}
              {post.category && (
                <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-[#D4A843] bg-[#D4A843]/10 px-2 py-0.5 rounded-full mb-2">
                  {post.category}
                </span>
              )}

              {/* Title */}
              <h3 className="text-sm font-semibold text-white leading-snug mb-1.5 line-clamp-2 group-hover:text-[#D4A843] transition-colors">
                {post.title}
              </h3>

              {/* Excerpt */}
              {post.excerpt && (
                <p className="text-xs text-gray-400 leading-relaxed mb-2 line-clamp-2">
                  {truncateExcerpt(post.excerpt)}
                </p>
              )}

              {/* Date */}
              {post.published_at && (
                <p className="text-[11px] text-gray-500">
                  {formatDate(post.published_at)}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
