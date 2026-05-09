import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ comments: data });
}

// POST /api/community/comments — tạo comment mới
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { post_id?: string; content?: string };
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

  const { data, error } = await supabase
    .from("comments")
    .insert({ user_id: user.id, post_id, content: content.trim() })
    .select(`*, profiles(full_name, avatar_url, level)`)
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Increment comments_count on the post
  const { data: currentPost } = await supabase
    .from("posts")
    .select("comments_count")
    .eq("id", post_id)
    .single();

  await supabase
    .from("posts")
    .update({ comments_count: (currentPost?.comments_count ?? 0) + 1 })
    .eq("id", post_id);

  // Award XP
  await supabase.from("xp_events").insert({
    user_id: user.id,
    action: "comment_created",
    xp_amount: 20,
    meta: { post_id, comment_id: data.id },
  });

  return NextResponse.json({ comment: data }, { status: 201 });
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

  if (deleteError)
    return NextResponse.json({ error: deleteError.message }, { status: 500 });

  // Decrement comments_count (floor at 0)
  const { data: currentPost } = await supabase
    .from("posts")
    .select("comments_count")
    .eq("id", comment.post_id)
    .single();

  await supabase
    .from("posts")
    .update({
      comments_count: Math.max(0, (currentPost?.comments_count ?? 1) - 1),
    })
    .eq("id", comment.post_id);

  return NextResponse.json({ ok: true });
}
