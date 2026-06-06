import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/server";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dangkhuong.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createAdminClient();

  // Fetch only published courses (admin client bypasses RLS)
  const { data: courses } = await supabase
    .from("products")
    .select("slug, updated_at")
    .eq("status", "published");

  // Fetch active shop products (status='active' — ecommerce module convention)
  const { data: shopProducts } = await supabase
    .from("products")
    .select("slug, updated_at")
    .eq("status", "active")
    .limit(1000);

  // Fetch all published blog posts
  const { data: blogPosts } = await supabase
    .from("blog_posts")
    .select("slug, updated_at")
    .eq("status", "published");

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/courses`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/cafe`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/refund-policy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/slowenglish`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/sanphamso`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/shop`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/orders/track`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    // ─── Landing pages (campaign / sales) ───
    {
      url: `${BASE_URL}/weballinone`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/tang4thanggeminipro`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/updateveo3.1`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/hocchuaxongtiendave`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/hoclamtoolvideochonguoimoibatdau`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  // Dynamic course pages
  const coursePages: MetadataRoute.Sitemap = (courses ?? []).map((course) => ({
    url: `${BASE_URL}/courses/${course.slug}`,
    lastModified: course.updated_at ? new Date(course.updated_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Dynamic shop product pages (PDP)
  const shopPages: MetadataRoute.Sitemap = (shopProducts ?? []).map(
    (product) => ({
      url: `${BASE_URL}/shop/${product.slug}`,
      lastModified: product.updated_at
        ? new Date(product.updated_at)
        : new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    })
  );

  // Dynamic blog post pages
  const blogPages: MetadataRoute.Sitemap = (blogPosts ?? []).map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.updated_at ? new Date(post.updated_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...coursePages, ...shopPages, ...blogPages];
}
