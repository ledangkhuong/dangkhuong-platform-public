import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/community/likes/bulk — check which posts the user has liked
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as { post_ids?: string[] };
    const { post_ids } = body;
    if (!post_ids || !Array.isArray(post_ids) || post_ids.length === 0)
      return NextResponse.json({ liked_ids: [] });

    // Limit to 100 posts per request to prevent abuse
    const ids = post_ids.slice(0, 100);

    const { data } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", user.id)
      .in("post_id", ids);

    const liked_ids = (data ?? []).map((row) => row.post_id);
    return NextResponse.json({ liked_ids });
  } catch (err) {
    console.error("POST /api/community/likes/bulk error:", err);
    return NextResponse.json({ liked_ids: [] });
  }
}
