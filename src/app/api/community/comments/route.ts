import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";

// GET /api/community/comments?post_id=...&limit=20&offset=0
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const post_id = searchParams.get("post_id");
  if (!post_id)
    return NextResponse.json({ error: "post_id required" }, { status: 400 });

  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const { data, error } = await supabase
    .from("comments")
    .select(`*, profiles(full_name, avatar_url, level)`)
    .eq("post_id", post_id)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("GET /api/community/comments error:", error.message);
    return NextResponse.json({ error: "Không thể tải bình luận. Vui lòng thử lại." }, { status: 500 });
  }

  return NextResponse.json({ comments: data });
}

// POST /api/community/comments — tạo comment mới
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    const rateLimitResult = await rateLimit(`comments:${ip}`, 20, 60);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
        { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfterSec) } }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: { post_id?: string; content?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { post_id, content } = body;

    if (!post_id)
      return NextResponse.json({ error: "post_id required" }, { status: 400 });

    if (!content?.trim())
      return NextResponse.json({ error: "content required" }, { status: 400 });

    if (content.trim().length > 500)
      return NextResponse.json(
        { error: "content must be 500 characters or fewer" },
        { status: 400 }
      );

    // Use admin client for DB operations (auth already verified above)
    const admin = await createAdminClient();

    const { data, error } = await admin
      .from("comments")
      .insert({ user_id: user.id, post_id, content: content.trim() })
      .select(`*, profiles(full_name, avatar_url, level)`)
      .single();

    if (error) {
      console.error("POST /api/community/comments error:", error.message);
      return NextResponse.json({ error: "Không thể tạo bình luận. Vui lòng thử lại." }, { status: 500 });
    }

    // Atomically increment comments_count on the post
    await admin.rpc("increment_comments_count", { post_id });

    // Award XP (daily cap: 10 comment-XP events)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: commentXpToday } = await admin
      .from("xp_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("action", "comment_created")
      .gte("created_at", todayStart.toISOString());

    if ((commentXpToday ?? 0) < 10) {
      await admin.from("xp_events").insert({
        user_id: user.id,
        action: "comment_created",
        xp_amount: 20,
        meta: { post_id, comment_id: data.id },
      });
    }

    // Notify the post owner (skip if commenter is the post owner)
    try {
      const { data: post } = await admin
        .from("posts")
        .select("user_id")
        .eq("id", post_id)
        .single();

      if (post && post.user_id !== user.id) {
        const { data: commenterProfile } = await admin
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        const commenterName = commenterProfile?.full_name || "Ai đó";
        await createNotification(
          admin,
          post.user_id,
          "comment",
          `${commenterName} đã bình luận bài viết của bạn`,
          `${commenterName} đã bình luận bài viết của bạn`,
          "/community",
        );
      }
    } catch {
      // Notification failure should not break comment flow
    }

    return NextResponse.json({ comment: data }, { status: 201 });
  } catch (err) {
    console.error("POST /api/community/comments unexpected error:", err);
    return NextResponse.json({ error: "Không thể tạo bình luận. Vui lòng thử lại." }, { status: 500 });
  }
}

// DELETE /api/community/comments?comment_id=... — xoá comment
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const comment_id = req.nextUrl.searchParams.get("comment_id");
  if (!comment_id)
    return NextResponse.json({ error: "comment_id required" }, { status: 400 });

  // Fetch comment to verify ownership
  const { data: comment, error: fetchError } = await supabase
    .from("comments")
    .select("id, user_id, post_id")
    .eq("id", comment_id)
    .single();

  if (fetchError || !comment)
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });

  if (comment.user_id !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error: deleteError } = await supabase
    .from("comments")
    .delete()
    .eq("id", comment_id);

  if (deleteError) {
    console.error("DELETE /api/community/comments error:", deleteError.message);
    return NextResponse.json({ error: "Không thể xoá bình luận. Vui lòng thử lại." }, { status: 500 });
  }

  // Atomically decrement comments_count (floor at 0 handled by RPC)
  await supabase.rpc("decrement_comments_count", { post_id: comment.post_id });

  return NextResponse.json({ ok: true });
}
