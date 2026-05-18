import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/lessons/[lessonId]/discussions
// Fetch discussions for a lesson with user profiles
// Query params: parent_id (optional) — filter by parent, omit or "null" for top-level
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;

  if (!UUID_REGEX.test(lessonId)) {
    return NextResponse.json({ error: "Invalid lesson ID" }, { status: 400 });
  }

  const supabase = await createClient();

  const { searchParams } = new URL(req.url);
  const parentIdParam = searchParams.get("parent_id");

  let query = supabase
    .from("lesson_discussions")
    .select(
      `*, profiles!lesson_discussions_user_id_fkey(full_name, avatar_url, level, tier)`
    )
    .eq("lesson_id", lessonId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: true });

  // If parent_id param is absent or "null", fetch top-level discussions
  // If parent_id is a valid UUID, fetch replies for that parent
  if (!parentIdParam || parentIdParam === "null") {
    query = query.is("parent_id", null);
  } else {
    if (!UUID_REGEX.test(parentIdParam)) {
      return NextResponse.json(
        { error: "Invalid parent_id" },
        { status: 400 }
      );
    }
    query = query.eq("parent_id", parentIdParam);
  }

  const { data, error } = await query;

  if (error) {
    console.error("GET discussions error:", error.message);
    return NextResponse.json(
      { error: "Không thể tải thảo luận. Vui lòng thử lại." },
      { status: 500 }
    );
  }

  // For top-level discussions, also fetch reply counts
  if (!parentIdParam || parentIdParam === "null") {
    const ids = (data ?? []).map((d: { id: string }) => d.id);
    if (ids.length > 0) {
      const { data: replies } = await supabase
        .from("lesson_discussions")
        .select("parent_id")
        .in("parent_id", ids);

      const countMap: Record<string, number> = {};
      (replies ?? []).forEach((r: { parent_id: string | null }) => {
        if (r.parent_id) {
          countMap[r.parent_id] = (countMap[r.parent_id] || 0) + 1;
        }
      });

      const enriched = (data ?? []).map(
        (d: { id: string; [key: string]: unknown }) => ({
          ...d,
          reply_count: countMap[d.id] || 0,
        })
      );

      return NextResponse.json({ discussions: enriched });
    }
  }

  return NextResponse.json({ discussions: data ?? [] });
}

// POST /api/lessons/[lessonId]/discussions
// Create a new discussion or reply (requires auth)
// Body: { content: string, parent_id?: string }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;

  if (!UUID_REGEX.test(lessonId)) {
    return NextResponse.json({ error: "Invalid lesson ID" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { content, parent_id } = body;

  // Validate content
  if (!content || typeof content !== "string" || !content.trim()) {
    return NextResponse.json(
      { error: "Nội dung không được để trống" },
      { status: 400 }
    );
  }

  if (content.trim().length > 5000) {
    return NextResponse.json(
      { error: "Nội dung quá dài (tối đa 5000 ký tự)" },
      { status: 400 }
    );
  }

  // Validate parent_id if provided
  if (parent_id !== undefined && parent_id !== null) {
    if (typeof parent_id !== "string" || !UUID_REGEX.test(parent_id)) {
      return NextResponse.json(
        { error: "Invalid parent_id" },
        { status: 400 }
      );
    }
  }

  const insertData: {
    lesson_id: string;
    user_id: string;
    content: string;
    parent_id?: string;
  } = {
    lesson_id: lessonId,
    user_id: user.id,
    content: content.trim(),
  };

  if (parent_id) {
    insertData.parent_id = parent_id;
  }

  const { data, error } = await supabase
    .from("lesson_discussions")
    .insert(insertData)
    .select(
      `*, profiles!lesson_discussions_user_id_fkey(full_name, avatar_url, level, tier)`
    )
    .single();

  if (error) {
    console.error("POST discussion error:", error.message);
    return NextResponse.json(
      { error: "Không thể gửi thảo luận. Vui lòng thử lại." },
      { status: 500 }
    );
  }

  return NextResponse.json({ discussion: data });
}
