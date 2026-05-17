import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/community/posts/[id] — lấy 1 post cụ thể
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("posts")
    .select(`*, profiles(full_name, avatar_url, level, tier)`)
    .eq("id", id)
    .single();

  if (error || !data)
    return NextResponse.json({ error: "Post not found" }, { status: 404 });

  return NextResponse.json({ post: data });
}

// DELETE /api/community/posts/[id] — xoá post (chỉ author)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // Fetch post to verify ownership
  const { data: post, error: fetchError } = await supabase
    .from("posts")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (fetchError || !post)
    return NextResponse.json({ error: "Post not found" }, { status: 404 });

  if (post.user_id !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error: deleteError } = await supabase
    .from("posts")
    .delete()
    .eq("id", id);

  if (deleteError)
    return NextResponse.json({ error: deleteError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
