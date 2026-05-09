import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Tag prefix to identify lesson questions vs normal community posts
const Q_TAG = "_q";

// GET /api/questions — lấy câu hỏi
// Query: product_id, lesson_id
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("product_id");
  const lessonId = searchParams.get("lesson_id");

  // Build tag filter
  const tagFilter = [Q_TAG];
  if (productId) tagFilter.push(productId);
  if (lessonId) tagFilter.push(lessonId);

  const { data, error } = await supabase
    .from("posts")
    .select(
      `id, content, tags, created_at, user_id,
       profiles!posts_user_id_fkey(full_name, avatar_url),
       comments(id, content, created_at, user_id, profiles!comments_user_id_fkey(full_name, avatar_url))`
    )
    .contains("tags", tagFilter)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Transform to Q&A format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questions = (data ?? []).map((post: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const replies = (post.comments ?? []) as any[];

    // Sort replies by created_at ascending
    replies.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return {
      id: post.id,
      content: post.content,
      created_at: post.created_at,
      user_id: post.user_id,
      profiles: Array.isArray(post.profiles) ? post.profiles[0] : post.profiles,
      // First reply is the "answer" from staff
      reply: replies.length > 0 ? replies[0].content : null,
      replier: replies.length > 0 ? replies[0].profiles : null,
      replied_at: replies.length > 0 ? replies[0].created_at : null,
      status: replies.length > 0 ? "answered" : "pending",
      reply_count: replies.length,
    };
  });

  return NextResponse.json({ questions });
}

// POST /api/questions — đặt câu hỏi mới
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, product_id, lesson_id } = await req.json();

  if (!content?.trim())
    return NextResponse.json(
      { error: "Nội dung câu hỏi không được để trống" },
      { status: 400 }
    );
  if (!product_id)
    return NextResponse.json(
      { error: "product_id is required" },
      { status: 400 }
    );

  // Store question as a post with special tags
  const tags = [Q_TAG, product_id];
  if (lesson_id) tags.push(lesson_id);

  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      content: content.trim(),
      tags,
    })
    .select(`*, profiles!posts_user_id_fkey(full_name, avatar_url)`)
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ question: data });
}

// PATCH /api/questions — trả lời câu hỏi (staff)
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!["admin", "manager", "support"].includes(profile?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, reply } = await req.json();
  if (!id)
    return NextResponse.json(
      { error: "Question id required" },
      { status: 400 }
    );
  if (!reply?.trim())
    return NextResponse.json(
      { error: "Reply content required" },
      { status: 400 }
    );

  // Add reply as a comment on the question post
  const { data, error } = await supabase
    .from("comments")
    .insert({
      user_id: user.id,
      post_id: id,
      content: reply.trim(),
    })
    .select(`*, profiles!comments_user_id_fkey(full_name, avatar_url)`)
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ question: { id, reply: data } });
}
