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

// DELETE /api/admin/users — delete one or multiple users (auth + profile)
export async function DELETE(req: NextRequest) {
  // Auth: only admin can delete users
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

  if (myProfile?.role !== "admin") {
    return NextResponse.json({ error: "Chỉ Admin mới có quyền xoá tài khoản" }, { status: 403 });
  }

  const { user_ids } = await req.json();

  if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
    return NextResponse.json({ error: "user_ids[] is required" }, { status: 400 });
  }

  // Safety: never delete yourself
  if (user_ids.includes(user.id)) {
    return NextResponse.json({ error: "Không thể xoá chính tài khoản của bạn" }, { status: 400 });
  }

  // Safety: prevent deleting admin/manager accounts
  const adminClient = await createAdminClient();
  const { data: protectedUsers } = await adminClient
    .from("profiles")
    .select("id, role")
    .in("id", user_ids)
    .in("role", ["admin", "manager"]);

  if (protectedUsers && protectedUsers.length > 0) {
    return NextResponse.json(
      { error: `Không thể xoá ${protectedUsers.length} tài khoản admin/quản lý` },
      { status: 400 }
    );
  }

  // Delete users: clean up related data first, then delete auth user
  const results = { deleted: 0, errors: [] as string[] };

  for (const uid of user_ids) {
    try {
      // 1. Delete/nullify records in tables WITHOUT cascade delete (these block user deletion)
      await adminClient.from("orders").delete().eq("user_id", uid);
      await adminClient.from("analytics_events").delete().eq("user_id", uid);
      await adminClient.from("subscribers").update({ user_id: null }).eq("user_id", uid);

      // 2. Nullify references in CRM tables (ON DELETE SET NULL defined but explicit for safety)
      await adminClient.from("crm_contacts").update({ user_id: null }).eq("user_id", uid);
      await adminClient.from("crm_contacts").update({ assigned_to: null }).eq("assigned_to", uid);
      await adminClient.from("crm_contacts").update({ created_by: null }).eq("created_by", uid);
      await adminClient.from("crm_activities").update({ created_by: null }).eq("created_by", uid);
      await adminClient.from("crm_deals").update({ assigned_to: null }).eq("assigned_to", uid);
      await adminClient.from("crm_deals").update({ created_by: null }).eq("created_by", uid);

      // 3. Delete affiliate data (cascade should handle sub-tables)
      await adminClient.from("affiliates").delete().eq("user_id", uid);

      // 4. Delete profile explicitly (cascades to lesson_progress, enrollments, posts, etc.)
      const { error: profileErr } = await adminClient.from("profiles").delete().eq("id", uid);
      if (profileErr) {
        results.errors.push(`${uid}: Profile delete failed — ${profileErr.message}`);
        continue; // Skip auth delete if profile delete failed
      }

      // 5. Finally delete auth user
      const { error: delErr } = await adminClient.auth.admin.deleteUser(uid);
      if (delErr) {
        results.errors.push(`${uid}: ${delErr.message}`);
      } else {
        results.deleted++;
      }
    } catch (err) {
      results.errors.push(`${uid}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  return NextResponse.json(results);
}
