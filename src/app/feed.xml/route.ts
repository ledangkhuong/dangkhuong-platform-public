import { createAdminClient } from "@/lib/supabase/server";

const BASE = "https://dangkhuong.com";

export async function GET() {
  const admin = await createAdminClient();

  const { data: posts } = await admin
    .from("blog_posts")
    .select("slug, title, excerpt, published_at, created_at, category")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50);

  const items = (posts ?? [])
    .map((post) => {
      const pubDate = new Date(
        post.published_at || post.created_at
      ).toUTCString();
      const link = `${BASE}/blog/${post.slug}`;
      // Escape XML special characters
      const title = escapeXml(post.title);
      const desc = escapeXml(post.excerpt || "");
      const cat = post.category ? `<category>${escapeXml(post.category)}</category>` : "";

      return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${desc}</description>
      ${cat}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Đăng Khương Blog</title>
    <link>${BASE}/blog</link>
    <description>Kiến thức thực chiến về marketing, kinh doanh và thương hiệu cá nhân từ Đăng Khương</description>
    <language>vi</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
