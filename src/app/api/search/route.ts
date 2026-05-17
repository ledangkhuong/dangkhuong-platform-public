import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type SearchResultItem = {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  url: string;
};

export type SearchResponse = {
  results: SearchResultItem[];
  total: number;
};

type SearchType = "all" | "courses" | "blog" | "community";

export async function GET(req: NextRequest): Promise<NextResponse<SearchResponse>> {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const type = (searchParams.get("type") ?? "all") as SearchType;

  if (q.trim().length < 2) {
    return NextResponse.json({ results: [], total: 0 });
  }

  // Limit keyword length to prevent abuse
  if (q.trim().length > 100) {
    return NextResponse.json({ results: [], total: 0 });
  }

  const supabase = await createClient();
  const results: SearchResultItem[] = [];
  // Escape LIKE special characters to prevent wildcard injection
  const keyword = q.trim().replace(/[%_\\]/g, '\\$&');

  // Search courses (products table)
  if (type === "all" || type === "courses") {
    const { data: courses } = await supabase
      .from("products")
      .select("id, name, price, thumbnail")
      .ilike("name", `%${keyword}%`)
      .limit(5);

    if (courses) {
      for (const course of courses) {
        results.push({
          type: "courses",
          id: String(course.id),
          title: String(course.name ?? ""),
          subtitle: course.price != null
            ? `${Number(course.price).toLocaleString("vi-VN")}đ`
            : undefined,
          url: `/courses/${course.id}`,
        });
      }
    }
  }

  // Search blog posts
  if (type === "all" || type === "blog") {
    const { data: posts } = await supabase
      .from("blog_posts")
      .select("id, slug, title, category")
      .ilike("title", `%${keyword}%`)
      .limit(5);

    if (posts) {
      for (const post of posts) {
        results.push({
          type: "blog",
          id: String(post.id),
          title: String(post.title ?? ""),
          subtitle: post.category ? String(post.category) : undefined,
          url: `/blog/${post.slug ?? post.id}`,
        });
      }
    }
  }

  // Search community posts
  if (type === "all" || type === "community") {
    const { data: communityPosts } = await supabase
      .from("posts")
      .select("id, content")
      .ilike("content", `%${keyword}%`)
      .limit(5);

    if (communityPosts) {
      for (const post of communityPosts) {
        const raw = String(post.content ?? "");
        const truncated = raw.length > 80 ? raw.slice(0, 80) + "…" : raw;
        results.push({
          type: "community",
          id: String(post.id),
          title: truncated,
          url: `/community`,
        });
      }
    }
  }

  return NextResponse.json({ results, total: results.length });
}
