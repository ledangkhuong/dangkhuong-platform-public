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

  if (error) {
    console.error("[Questions GET] Error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra khi tải câu hỏi. Vui lòng thử lại." }, { status: 500 });
  }

  // Extract unique product_ids and lesson_ids from tags to resolve names
  const productIds = new Set<string>();
  const lessonIds = new Set<string>();
  for (const post of data ?? []) {
    const tags = (post.tags ?? []) as string[];
    // tags format: ["_q", product_id, lesson_id?]
    if (tags[1]) productIds.add(tags[1]);
    if (tags[2]) lessonIds.add(tags[2]);
  }

  // Batch fetch product & lesson names
  const productMap: Record<string, string> = {};
  const lessonMap: Record<string, { title: string; product_id: string }> = {};

  if (productIds.size > 0) {
    const { data: products } = await supabase
      .from("products")
      .select("id, name")
      .in("id", Array.from(productIds));
    for (const p of products ?? []) productMap[p.id] = p.name;
  }

  if (lessonIds.size > 0) {
    const { data: lessons } = await supabase
      .from("lessons")
      .select("id, title, product_id")
      .in("id", Array.from(lessonIds));
    for (const l of lessons ?? []) lessonMap[l.id] = { title: l.title, product_id: l.product_id };
  }

  // Transform to Q&A format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questions = (data ?? []).map((post: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const replies = (post.comments ?? []) as any[];
    const tags = (post.tags ?? []) as string[];
    const pId = tags[1] || null;
    const lId = tags[2] || null;

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
      // Course & lesson context
      product_id: pId,
      lesson_id: lId,
      course_name: pId ? (productMap[pId] ?? null) : null,
      lesson_name: lId ? (lessonMap[lId]?.title ?? null) : null,
      // First reply is the "answer" from staff
      reply: replies.length > 0 ? replies[0].content : null,
      replier: replies.length > 0 ? replies[0].profiles : null,
      replied_at: replies.length > 0 ? replies[0].created_at : null,
      // All replies for multi-reply view
      all_replies: replies.map((r: any) => ({
        id: r.id,
        content: r.content,
        created_at: r.created_at,
        profiles: r.profiles,
      })),
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

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { content, product_id, lesson_id } = body;

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

  if (error) {
    console.error("[Questions POST] Error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra khi gửi câu hỏi. Vui lòng thử lại." }, { status: 500 });
  }

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

  if (error) {
    console.error("[Questions PATCH] Error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra khi trả lời câu hỏi. Vui lòng thử lại." }, { status: 500 });
  }

  return NextResponse.json({ question: { id, reply: data } });
}
