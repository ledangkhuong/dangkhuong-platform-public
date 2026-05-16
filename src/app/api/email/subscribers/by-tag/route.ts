import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const tagsParam = searchParams.get("tags");
  const match = searchParams.get("match") || "all";
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  if (!tagsParam) {
    return NextResponse.json(
      { error: "Missing required query parameter: tags" },
      { status: 400 }
    );
  }

  const tags = tagsParam.split(",").map((t) => t.trim()).filter(Boolean);

  if (tags.length === 0) {
    return NextResponse.json(
      { error: "At least one tag is required" },
      { status: 400 }
    );
  }

  if (!["all", "any"].includes(match)) {
    return NextResponse.json(
      { error: "Match parameter must be 'all' or 'any'" },
      { status: 400 }
    );
  }

  const admin = await createAdminClient();
  const offset = (page - 1) * limit;

  // Build query
  let query = admin.from("subscribers").select("*", { count: "exact" });

  // Apply tag filter
  if (match === "all") {
    // @> operator: contains ALL specified tags
    query = query.contains("tags", tags);
  } else {
    // && operator: overlaps with ANY specified tags
    query = query.overlaps("tags", tags);
  }

  // Apply status filter
  if (status) {
    query = query.eq("status", status);
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1).order("created_at", { ascending: false });

  const { data: subscribers, count, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch subscribers" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    subscribers: subscribers || [],
    total: count || 0,
  });
}
