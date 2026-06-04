import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { withErrorHandler } from "@/lib/api-handler";

// GET /api/journey — get learning journey events for a user
async function _GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("user_id") || user.id;
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const offset = parseInt(searchParams.get("offset") || "0");

  const isOwnJourney = targetUserId === user.id;
  const adminClient = await createAdminClient();

  let query = adminClient
    .from("learning_journey_events")
    .select(`*, products(name)`)
    .eq("user_id", targetUserId);

  // If viewing another user's journey, only show public events
  if (!isOwnJourney) {
    query = query.eq("is_public", true);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[Journey GET] Error:", error.message);
    return NextResponse.json(
      { error: "Không thể tải hành trình học tập." },
      { status: 500 }
    );
  }

  return NextResponse.json({ events: data });
}

// POST /api/journey — create a custom journey event (milestone/custom)
async function _POST(req: NextRequest) {
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
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { event_type, title, description, product_id, is_public } = body;

  // Only allow milestone or custom — system events are created automatically
  if (!event_type || !["milestone", "custom"].includes(event_type)) {
    return NextResponse.json(
      { error: "event_type must be 'milestone' or 'custom'" },
      { status: 400 }
    );
  }

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  const adminClient = await createAdminClient();

  const { data, error } = await adminClient
    .from("learning_journey_events")
    .insert({
      user_id: user.id,
      event_type,
      title: title.trim(),
      description: description?.trim() || null,
      product_id: product_id || null,
      is_public: is_public !== undefined ? is_public : true,
    })
    .select(`*, products(name)`)
    .single();

  if (error) {
    console.error("[Journey POST] Error:", error.message);
    return NextResponse.json(
      { error: "Không thể tạo sự kiện hành trình." },
      { status: 500 }
    );
  }

  return NextResponse.json({ event: data });
}

export const GET = withErrorHandler(_GET);
export const POST = withErrorHandler(_POST);
