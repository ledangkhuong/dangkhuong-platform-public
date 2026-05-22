import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/featured-courses
 * - ?active=true → public: returns active featured courses with product details
 * - otherwise → admin: returns all featured courses with product details
 */
export async function GET(req: NextRequest) {
  const admin = await createAdminClient();
  const isPublic = req.nextUrl.searchParams.get("active") === "true";

  let query = admin
    .from("featured_courses")
    .select("*, products(id, title, slug, thumbnail, price, sale_price)")
    .order("sort_order", { ascending: true });

  if (isPublic) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

/**
 * POST /api/admin/featured-courses — add a featured course
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { product_id, badge_text, highlight_text } = body;
  if (!product_id)
    return NextResponse.json(
      { error: "product_id is required" },
      { status: 400 }
    );

  const admin = await createAdminClient();

  // Check max 3 active featured courses
  const { count } = await admin
    .from("featured_courses")
    .select("id", { count: "exact", head: true });

  if ((count ?? 0) >= 3) {
    return NextResponse.json(
      { error: "Tối đa 3 khoá học nổi bật. Vui lòng xoá bớt trước khi thêm mới." },
      { status: 400 }
    );
  }

  // Get next sort_order
  const { data: existing } = await admin
    .from("featured_courses")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextSort = (existing?.[0]?.sort_order ?? -1) + 1;

  const { data, error } = await admin
    .from("featured_courses")
    .insert({
      product_id,
      badge_text: badge_text?.trim() || "Mới",
      highlight_text: highlight_text?.trim() || null,
      is_active: true,
      sort_order: nextSort,
    })
    .select("*, products(id, title, slug, thumbnail, price, sale_price)")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Khoá học này đã được chọn làm nổi bật." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * PUT /api/admin/featured-courses — update a featured course
 */
export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, ...updates } = body;
  if (!id)
    return NextResponse.json({ error: "id is required" }, { status: 400 });

  // Only allow specific fields
  const allowed: Record<string, unknown> = {};
  if (updates.badge_text !== undefined) allowed.badge_text = updates.badge_text;
  if (updates.highlight_text !== undefined)
    allowed.highlight_text = updates.highlight_text;
  if (updates.is_active !== undefined) allowed.is_active = updates.is_active;
  if (updates.sort_order !== undefined) allowed.sort_order = updates.sort_order;
  allowed.updated_at = new Date().toISOString();

  const admin = await createAdminClient();

  const { error } = await admin
    .from("featured_courses")
    .update(allowed)
    .eq("id", id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/admin/featured-courses — remove a featured course
 */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id } = body;
  if (!id)
    return NextResponse.json({ error: "id is required" }, { status: 400 });

  const admin = await createAdminClient();
  const { error } = await admin
    .from("featured_courses")
    .delete()
    .eq("id", id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
