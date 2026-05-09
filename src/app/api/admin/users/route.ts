import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const VALID_ROLES = ["student", "admin", "manager", "marketing", "sale", "support"];
const VALID_TIERS = ["free", "member", "vip"];

// PATCH /api/admin/users — update user role/tier
export async function PATCH(req: NextRequest) {
  // Auth: only admin/manager can change roles
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!["admin", "manager"].includes(myProfile?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { user_id, role, tier } = await req.json();

  if (!user_id) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  // Build update object
  const updates: Record<string, string> = {};

  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` },
        { status: 400 }
      );
    }
    // Only admin can assign admin role
    if (role === "admin" && myProfile?.role !== "admin") {
      return NextResponse.json(
        { error: "Only admin can assign admin role" },
        { status: 403 }
      );
    }
    updates.role = role;
  }

  if (tier !== undefined) {
    if (!VALID_TIERS.includes(tier)) {
      return NextResponse.json(
        { error: `Invalid tier. Must be one of: ${VALID_TIERS.join(", ")}` },
        { status: 400 }
      );
    }
    updates.tier = tier;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "Nothing to update. Provide role or tier." },
      { status: 400 }
    );
  }

  // Use admin client to bypass RLS
  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from("profiles")
    .update(updates)
    .eq("id", user_id)
    .select("id, full_name, role, tier")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ user: data });
}
