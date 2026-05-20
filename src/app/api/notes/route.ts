import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withErrorHandler } from "@/lib/api-handler";

// GET /api/notes — fetch notes for a lesson
// Query: lesson_id (required), product_id (required)
async function _GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const lessonId = searchParams.get("lesson_id");
  const productId = searchParams.get("product_id");

  if (!lessonId || !productId)
    return NextResponse.json(
      { error: "lesson_id and product_id are required" },
      { status: 400 }
    );

  const { data, error } = await supabase
    .from("student_notes")
    .select("*")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Notes GET] Error:", error);
    return NextResponse.json(
      { error: "Không thể tải ghi chú. Vui lòng thử lại." },
      { status: 500 }
    );
  }

  return NextResponse.json({ notes: data ?? [] });
}

// POST /api/notes — create a new note
async function _POST(req: NextRequest) {
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
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { lesson_id, product_id, content, timestamp_sec, is_bookmark } = body;

  if (!lesson_id || !product_id)
    return NextResponse.json(
      { error: "lesson_id and product_id are required" },
      { status: 400 }
    );

  if (!content?.trim())
    return NextResponse.json(
      { error: "Nội dung ghi chú không được để trống" },
      { status: 400 }
    );

  const { data, error } = await supabase
    .from("student_notes")
    .insert({
      user_id: user.id,
      lesson_id,
      product_id,
      content: content.trim(),
      timestamp_sec: timestamp_sec ?? 0,
      is_bookmark: is_bookmark ?? false,
    })
    .select()
    .single();

  if (error) {
    console.error("[Notes POST] Error:", error);
    return NextResponse.json(
      { error: "Không thể tạo ghi chú. Vui lòng thử lại." },
      { status: 500 }
    );
  }

  return NextResponse.json({ note: data });
}

// PATCH /api/notes — update a note (content or bookmark toggle)
async function _PATCH(req: NextRequest) {
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
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { id, content, is_bookmark } = body;

  if (!id)
    return NextResponse.json(
      { error: "Note id is required" },
      { status: 400 }
    );

  // Build update payload — only include fields that were provided
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (content !== undefined) updates.content = content.trim();
  if (is_bookmark !== undefined) updates.is_bookmark = is_bookmark;

  const { data, error } = await supabase
    .from("student_notes")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[Notes PATCH] Error:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật ghi chú. Vui lòng thử lại." },
      { status: 500 }
    );
  }

  return NextResponse.json({ note: data });
}

// DELETE /api/notes — delete a note by id
async function _DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id)
    return NextResponse.json(
      { error: "Note id is required" },
      { status: 400 }
    );

  const { error } = await supabase
    .from("student_notes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[Notes DELETE] Error:", error);
    return NextResponse.json(
      { error: "Không thể xóa ghi chú. Vui lòng thử lại." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

export const GET = withErrorHandler(_GET);
export const POST = withErrorHandler(_POST);
export const PATCH = withErrorHandler(_PATCH);
export const DELETE = withErrorHandler(_DELETE);
