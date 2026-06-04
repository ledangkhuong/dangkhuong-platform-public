import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/utils";

// GET /api/community/posts/[id] — lấy 1 post cụ thể
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    if (!isValidUUID(id)) {
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
  } catch (err) {
    console.error("GET /api/community/posts/[id] error:", err);
    return NextResponse.json({ error: "Không thể thực hiện. Vui lòng thử lại." }, { status: 500 });
  }
}

// DELETE /api/community/posts/[id] — xoá post (chỉ author)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    if (!isValidUUID(id)) {
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

    if (deleteError) {
      console.error("DELETE /api/community/posts/[id] error:", deleteError.message);
      return NextResponse.json({ error: "Không thể thực hiện. Vui lòng thử lại." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/community/posts/[id] error:", err);
    return NextResponse.json({ error: "Không thể thực hiện. Vui lòng thử lại." }, { status: 500 });
  }
}
