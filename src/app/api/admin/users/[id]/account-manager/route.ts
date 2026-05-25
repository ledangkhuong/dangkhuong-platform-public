import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ASSIGNABLE_ROLES } from "@/lib/sales";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/admin/users/[id]/account-manager
 * Body: { account_manager_id: string | null }   // null = unassign
 * Auth: admin or manager only.
 *
 * Sets profiles.account_manager_id for the target user. The account
 * manager must be a profile with role in ('admin','manager','sale').
 * A user cannot be their own account manager.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const { id } = await params;
    if (!id)
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });

    let body: { account_manager_id?: string | null };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const accountManagerId =
      body.account_manager_id === undefined
        ? undefined
        : body.account_manager_id;

    if (accountManagerId === undefined) {
      return NextResponse.json(
        { error: "account_manager_id is required (string or null)" },
        { status: 400 }
      );
    }

    // Self-loop check
    if (accountManagerId !== null && accountManagerId === id) {
      return NextResponse.json(
        { error: "A user cannot be their own account manager" },
        { status: 400 }
      );
    }

    const adminClient = await createAdminClient();

    // Validate the target manager has an assignable role
    if (accountManagerId !== null) {
      const { data: target } = await adminClient
        .from("profiles")
        .select("id, role")
        .eq("id", accountManagerId)
        .single();

      if (!target) {
        return NextResponse.json(
          { error: "Target manager profile not found" },
          { status: 400 }
        );
      }
      if (!ASSIGNABLE_ROLES.includes(target.role)) {
        return NextResponse.json(
          {
            error: `Target user role '${target.role}' is not assignable. Must be one of: ${ASSIGNABLE_ROLES.join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    const { error: updErr } = await adminClient
      .from("profiles")
      .update({
        account_manager_id: accountManagerId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updErr) {
      console.error("[users/account-manager POST]", updErr);
      return NextResponse.json(
        { error: "Update failed" },
        { status: 500 }
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await logAudit({
      admin_id: user.id,
      action: "user.assign_manager",
      target_type: "user",
      target_id: id,
      details: { account_manager_id: accountManagerId },
      ip_address: ip,
    });

    return NextResponse.json({
      ok: true,
      account_manager_id: accountManagerId,
    });
  } catch (err) {
    console.error("POST /api/admin/users/[id]/account-manager error:", err);
    return NextResponse.json(
      { error: "Không thể thực hiện. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
