import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

// GET /api/community/posts — lấy danh sách posts (requires auth)
export async function GET(req: NextRequest) {
  const supabase = await createClient();

  // Auth check — community posts are for authenticated users only
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const offset = parseInt(searchParams.get("offset") || "0");

  // Exclude lesson questions (tagged with _q) from community feed
  // Use .or() to include posts where tags is NULL OR tags does not contain _q
  const { data, error } = await supabase
    .from("posts")
    .select(`*, profiles!posts_user_id_fkey(full_name, avatar_url, level, tier)`)
    .or('tags.is.null,tags.not.cs.{_q}')
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("GET /api/community/posts error:", error.message);
    return NextResponse.json({ error: "Không thể tải bài viết. Vui lòng thử lại." }, { status: 500 });
  }
  return NextResponse.json({ posts: data });
}

// POST /api/community/posts — tạo post mới
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const rateLimitResult = await rateLimit(`posts:${ip}`, 10, 60);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfterSec) } }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { content, tags, image_url } = body;
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });
  if (content.trim().length > 5000) {
    return NextResponse.json({ error: "Nội dung quá dài (tối đa 5000 ký tự)" }, { status: 400 });
  }

  if (image_url) {
    try {
      const urlObj = new URL(image_url);
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({ user_id: user.id, content: content.trim(), tags, image_url })
    .select(`*, profiles(full_name, avatar_url, level, tier)`)
    .single();

  if (error) {
    console.error("POST /api/community/posts error:", error.message);
    return NextResponse.json({ error: "Không thể tạo bài viết. Vui lòng thử lại." }, { status: 500 });
  }

  // Thêm XP (daily cap: 5 post-XP events)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { count: postXpToday } = await supabase
    .from("xp_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("action", "post_created")
    .gte("created_at", todayStart.toISOString());

  if ((postXpToday ?? 0) < 5) {
    await supabase.from("xp_events").insert({ user_id: user.id, action: "post_created", xp_amount: 50 });
  }

  return NextResponse.json({ post: data });
}
