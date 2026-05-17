import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/server";

const BASE = "https://dangkhuong.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = await createAdminClient();

  // ── Static pages ──────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/courses`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/community`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE}/leaderboard`, lastModified: new Date(), changeFrequency: "daily", priority: 0.5 },
    { url: `${BASE}/events`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/cafe`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/sanphamso`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/slowenglish`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/privacy-policy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/terms-of-service`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/login`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/register`, changeFrequency: "monthly", priority: 0.3 },
  ];

  // ── Blog posts ────────────────────────────────────────────────
  const { data: posts } = await admin
    .from("blog_posts")
    .select("slug, published_at, created_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const blogPages: MetadataRoute.Sitemap = (posts ?? []).map((post) => ({
    url: `${BASE}/blog/${post.slug}`,
    lastModified: new Date(post.published_at || post.created_at),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // ── Courses (public detail pages) ──────────────────────────────
  const { data: courses } = await admin
    .from("products")
    .select("slug, updated_at, created_at")
    .eq("status", "published");

  const coursePages: MetadataRoute.Sitemap = (courses ?? []).map((c) => ({
    url: `${BASE}/courses/${c.slug}`,
    lastModified: new Date(c.updated_at || c.created_at),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // ── Sales pages ────────────────────────────────────────────────
  const salesPages: MetadataRoute.Sitemap = (courses ?? []).map((c) => ({
    url: `${BASE}/sales/${c.slug}`,
    lastModified: new Date(c.updated_at || c.created_at),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...blogPages, ...coursePages, ...salesPages];
}
