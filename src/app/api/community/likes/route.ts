import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// POST /api/community/likes — toggle like
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { post_id?: string };
  const { post_id } = body;
  if (!post_id)
    return NextResponse.json({ error: "post_id required" }, { status: 400 });

  // Check if already liked
  const { data: existing } = await supabase
    .from("post_likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("post_id", post_id)
    .maybeSingle();

  const admin = await createAdminClient();

  if (existing) {
    // Unlike
    const { error: deleteError } = await supabase
      .from("post_likes")
      .delete()
      .eq("id", existing.id);

    if (deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 });

    // Atomic decrement — avoids race condition with concurrent requests
    const { data: updated } = await admin
      .rpc("decrement_likes_count", { p_post_id: post_id });

    const newCount = updated ?? 0;
    return NextResponse.json({ liked: false, likes_count: newCount });
  } else {
    // Like
    const { error: insertError } = await supabase
      .from("post_likes")
      .insert({ user_id: user.id, post_id });

    if (insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 });

    // Atomic increment — avoids race condition with concurrent requests
    const { data: updated } = await admin
      .rpc("increment_likes_count", { p_post_id: post_id });

    const newCount = updated ?? 0;

    // Award XP to the liker
    await supabase.from("xp_events").insert({
      user_id: user.id,
      action: "post_liked",
      xp_amount: 5,
      meta: { post_id },
    });

    return NextResponse.json({ liked: true, likes_count: newCount });
  }
}

// GET /api/community/likes?post_id=... — check like status
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const post_id = req.nextUrl.searchParams.get("post_id");
  if (!post_id)
    return NextResponse.json({ error: "post_id required" }, { status: 400 });

  const { data } = await supabase
    .from("post_likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("post_id", post_id)
    .maybeSingle();

  return NextResponse.json({ liked: data !== null });
}
