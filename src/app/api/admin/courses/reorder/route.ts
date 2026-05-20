import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/courses/reorder
 * Body: { type: "chapters" | "lessons", items: { id: string, sort_order: number }[] }
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

  if (!profile || !["admin", "manager", "editor"].includes(profile.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { type, items } = body;

  if (!type || !items || !Array.isArray(items)) {
    return NextResponse.json(
      { error: "type and items[] required" },
      { status: 400 }
    );
  }

  const table = type === "chapters" ? "chapters" : "lessons";
  const admin = await createAdminClient();

  // Update sort_order for each item
  const updates = items.map((item: { id: string; sort_order: number }) =>
    admin.from(table).update({ sort_order: item.sort_order }).eq("id", item.id)
  );

  const results = await Promise.all(updates);
  const errors = results.filter((r) => r.error);

  if (errors.length > 0) {
    return NextResponse.json(
      { error: errors[0].error!.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
