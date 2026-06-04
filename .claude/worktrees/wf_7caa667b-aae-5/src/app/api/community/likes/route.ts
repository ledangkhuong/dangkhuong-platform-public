import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";

// POST /api/community/likes — toggle like
export async function POST(req: NextRequest) {
  try {
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

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(post_id))
      return NextResponse.json({ error: "Invalid post_id" }, { status: 400 });

    // Use admin client for DB operations (auth already verified above)
    const admin = await createAdminClient();

    // Check if already liked
    const { data: existing } = await admin
      .from("post_likes")
      .select("user_id, post_id")
      .eq("user_id", user.id)
      .eq("post_id", post_id)
      .maybeSingle();

    if (existing) {
      // Unlike
      const { error: deleteError } = await admin
        .from("post_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("post_id", post_id);

      if (deleteError)
        return NextResponse.json({ error: "Không thể thực hiện. Vui lòng thử lại." }, { status: 500 });

      // Atomic decrement — avoids race condition with concurrent requests
      const { data: updated } = await admin
        .rpc("decrement_likes_count", { p_post_id: post_id });

      const newCount = updated ?? 0;
      return NextResponse.json({ liked: false, likes_count: newCount });
    } else {
      // Like
      const { error: insertError } = await admin
        .from("post_likes")
        .insert({ user_id: user.id, post_id });

      if (insertError)
        return NextResponse.json({ error: "Không thể thực hiện. Vui lòng thử lại." }, { status: 500 });

      // Atomic increment — avoids race condition with concurrent requests
      const { data: updated } = await admin
        .rpc("increment_likes_count", { p_post_id: post_id });

      const newCount = updated ?? 0;

      // Award XP to the liker (daily cap: 10 like-XP events)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: likeXpToday } = await admin
        .from("xp_events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("action", "post_liked")
        .gte("created_at", todayStart.toISOString());

      if ((likeXpToday ?? 0) < 10) {
        await admin.from("xp_events").insert({
          user_id: user.id,
          action: "post_liked",
          xp_amount: 5,
          meta: { post_id },
        });
      }

      // Notify the post owner (skip if liker is the post owner)
      try {
        const { data: post } = await admin
          .from("posts")
          .select("user_id")
          .eq("id", post_id)
          .single();

        if (post && post.user_id !== user.id) {
          const { data: likerProfile } = await admin
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single();

          const likerName = likerProfile?.full_name || "Ai đó";
          await createNotification(
            admin,
            post.user_id,
            "like",
            `${likerName} đã thích bài viết của bạn`,
            `${likerName} đã thích bài viết của bạn`,
            "/community",
          );
        }
      } catch {
        // Notification failure should not break like flow
      }

      return NextResponse.json({ liked: true, likes_count: newCount });
    }
  } catch (err) {
    console.error("POST /api/community/likes unexpected error:", err);
    return NextResponse.json({ error: "Không thể thực hiện. Vui lòng thử lại." }, { status: 500 });
  }
}

// GET /api/community/likes?post_id=... — check like status
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const post_id = req.nextUrl.searchParams.get("post_id");
    if (!post_id)
      return NextResponse.json({ error: "post_id required" }, { status: 400 });

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(post_id))
      return NextResponse.json({ error: "Invalid post_id" }, { status: 400 });

    const { data } = await supabase
      .from("post_likes")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("post_id", post_id)
      .maybeSingle();

    return NextResponse.json({ liked: data !== null });
  } catch (err) {
    console.error("GET /api/community/likes unexpected error:", err);
    return NextResponse.json({ error: "Không thể kiểm tra trạng thái. Vui lòng thử lại." }, { status: 500 });
  }
}
