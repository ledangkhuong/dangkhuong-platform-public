import { createAdminClient } from "@/lib/supabase/server";

export const revalidate = 3600; // re-generate at most once per hour

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Escape characters that are special in XML. */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Convert an ISO-8601 date string to RFC-822 format required by RSS 2.0. */
function toRfc822(iso: string): string {
  return new Date(iso).toUTCString();
}

// ---------------------------------------------------------------------------
// GET /feed.xml
// ---------------------------------------------------------------------------

export async function GET() {
  const supabase = await createAdminClient();

  const { data: posts } = await supabase
    .from("blog_posts")
    .select("slug, title, excerpt, published_at, category")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50);

  const items = (posts ?? [])
    .map((post) => {
      const link = `https://dangkhuong.com/blog/${post.slug}`;
      const title = escapeXml(post.title ?? "");
      const description = escapeXml(post.excerpt ?? "");
      const pubDate = post.published_at ? toRfc822(post.published_at) : "";
      const category = post.category
        ? `<category>${escapeXml(post.category)}</category>`
        : "";

      return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <description>${description}</description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="true">${link}</guid>
      ${category}
    </item>`;
    })
    .join("\n");

  const lastBuildDate =
    posts && posts.length > 0 && posts[0].published_at
      ? toRfc822(posts[0].published_at)
      : new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Lê Đăng Khương Academy Blog</title>
    <link>https://dangkhuong.com/blog</link>
    <description>Blog chia sẻ kiến thức về kinh doanh, phát triển bản thân và công nghệ từ Lê Đăng Khương Academy</description>
    <language>vi</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="https://dangkhuong.com/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
