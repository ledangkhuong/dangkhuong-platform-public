import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/courses/list — list all courses (id + title) bypassing RLS
 */
export async function GET(req: NextRequest) {
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

  const allowedRoles = ["admin", "manager", "editor", "instructor"];
  if (!profile || !allowedRoles.includes(profile.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = await createAdminClient();

  let query = admin
    .from("products")
    .select("id, title")
    .order("sort_order", { ascending: true });

  // Instructors only see their own courses
  if (profile.role === "instructor") {
    query = query.eq("instructor_id", user.id);
  }

  const { data } = await query;

  return NextResponse.json(data ?? []);
}
