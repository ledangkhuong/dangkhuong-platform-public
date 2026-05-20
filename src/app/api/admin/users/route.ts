import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

const VALID_ROLES = ["student", "admin", "manager", "marketing", "sale", "support", "instructor"];
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

  let user_id, role, tier;
  try {
    ({ user_id, role, tier } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

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

  // Fetch current profile to capture "before" state for audit
  const { data: previousProfile } = await adminClient
    .from("profiles")
    .select("role, tier")
    .eq("id", user_id)
    .single();

  const { data, error } = await adminClient
    .from("profiles")
    .update(updates)
    .eq("id", user_id)
    .select("id, full_name, role, tier")
    .single();

  if (error) {
    console.error("[Admin Users PATCH] Update failed:", error.message);
    return NextResponse.json({ error: "Có lỗi xảy ra. Vui lòng thử lại." }, { status: 500 });
  }

  // Audit log for role/tier changes
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (role !== undefined) {
    await logAudit({
      admin_id: user.id,
      action: "user.role_change",
      target_type: "user",
      target_id: user_id,
      details: { previous_role: previousProfile?.role ?? "unknown", new_role: role },
      ip_address: ip,
    });
  }
  if (tier !== undefined) {
    await logAudit({
      admin_id: user.id,
      action: "user.tier_change",
      target_type: "user",
      target_id: user_id,
      details: { previous_tier: previousProfile?.tier ?? "unknown", new_tier: tier },
      ip_address: ip,
    });
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

  let user_ids;
  try {
    ({ user_ids } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

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
        console.error(`[Admin Users DELETE] Auth delete failed for ${uid}:`, delErr.message);
        results.errors.push(`${uid}: Xoá tài khoản thất bại`);
      } else {
        results.deleted++;

        // Audit log for successful deletion
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        await logAudit({
          admin_id: user.id,
          action: "user.delete",
          target_type: "user",
          target_id: uid,
          details: { reason: "admin_action" },
          ip_address: ip,
        });
      }
    } catch (err) {
      console.error(`[Admin Users DELETE] Unexpected error for ${uid}:`, err);
      results.errors.push(`${uid}: Có lỗi xảy ra khi xoá tài khoản`);
    }
  }

  return NextResponse.json(results);
}
