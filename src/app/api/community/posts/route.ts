import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/community/posts — lấy danh sách posts
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "20");
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data });
}

// POST /api/community/posts — tạo post mới
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, tags, image_url } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const { data, error } = await supabase
    .from("posts")
    .insert({ user_id: user.id, content: content.trim(), tags, image_url })
    .select(`*, profiles(full_name, avatar_url, level, tier)`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Thêm XP
  await supabase.from("xp_events").insert({ user_id: user.id, action: "post_created", xp_amount: 50 });

  return NextResponse.json({ post: data });
}
