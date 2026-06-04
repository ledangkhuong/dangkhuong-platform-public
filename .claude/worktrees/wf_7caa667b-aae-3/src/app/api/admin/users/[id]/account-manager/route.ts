import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ASSIGNABLE_ROLES } from "@/lib/sales";
import { logAudit } from "@/lib/audit";
import { isValidUUID } from "@/lib/utils";
import type { SupabaseClient } from "@supabase/supabase-js";

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
    if (!id || !isValidUUID(id))
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });

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

    // ── Cascade assignment to CRM contact, orders, interests, deals ──
    // The account-manager page is authoritative for user-level assignment.
    // When assigning (not unassigning), propagate to downstream tables so
    // the CRM contacts page reflects the same sale rep.
    let cascade: {
      contact: string | null;
      orders: number | null;
      interests: number | null;
      deals: number | null;
      skipped?: string;
    } = { contact: null, orders: null, interests: null, deals: null };

    if (accountManagerId === null) {
      cascade.skipped = "unassign-no-cascade";
    } else {
      cascade = await cascadeAssignment(
        adminClient,
        id,
        accountManagerId,
        user.id
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await logAudit({
      admin_id: user.id,
      action: "user.assign_manager",
      target_type: "user",
      target_id: id,
      details: { account_manager_id: accountManagerId, cascade },
      ip_address: ip,
    });

    return NextResponse.json({
      ok: true,
      account_manager_id: accountManagerId,
      cascade,
    });
  } catch (err) {
    console.error("POST /api/admin/users/[id]/account-manager error:", err);
    return NextResponse.json(
      { error: "Không thể thực hiện. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cascade helper — propagate account-manager assignment to CRM tables.
//
// 1. crm_contacts: find by user_id; if found AND assigned_to is NULL, set it
//    along with assignment_method='manual' and assigned_at=now().
// 2. orders: if the contact (or profile) has an email, cascade to
//    orders.assigned_to matching by customer_email.
// 3. course_interests: cascade to course_interests.assigned_to by user_id.
// 4. crm_deals: cascade to crm_deals.assigned_to by contact_id.
//
// All steps are fail-soft — errors are logged but never block the response.
// ─────────────────────────────────────────────────────────────────────────────
async function cascadeAssignment(
  supabase: SupabaseClient,
  userId: string,
  saleId: string,
  adminUserId: string
): Promise<{
  contact: string | null;
  orders: number | null;
  interests: number | null;
  deals: number | null;
  skipped?: string;
}> {
  const result: {
    contact: string | null;
    orders: number | null;
    interests: number | null;
    deals: number | null;
    skipped?: string;
  } = { contact: null, orders: null, interests: null, deals: null };

  try {
    // 1) Find the matching crm_contact by user_id (profile id = user_id)
    const { data: contact, error: contactErr } = await supabase
      .from("crm_contacts")
      .select("id, email, assigned_to")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (contactErr) {
      console.error(
        "[users/account-manager] crm_contact lookup error:",
        contactErr.message
      );
      return result;
    }

    const contactRow = contact?.[0] as
      | { id: string; email: string | null; assigned_to: string | null }
      | undefined;

    if (!contactRow) {
      console.info(
        `[users/account-manager] no crm_contact found for user_id=${userId} — skipping cascade`
      );
      result.skipped = "no-contact";
      return result;
    }

    const contactId = contactRow.id;
    const contactEmail = (contactRow.email ?? "").trim().toLowerCase();

    // Update crm_contacts.assigned_to ONLY if currently NULL (first-touch).
    if (!contactRow.assigned_to) {
      const now = new Date().toISOString();
      const { error: cUpdErr } = await supabase
        .from("crm_contacts")
        .update({
          assigned_to: saleId,
          assignment_method: "manual",
          assigned_at: now,
        })
        .eq("id", contactId)
        .is("assigned_to", null); // race guard

      if (cUpdErr) {
        console.error(
          "[users/account-manager] crm_contact update error:",
          cUpdErr.message
        );
      } else {
        result.contact = contactId;
        console.info(
          `[users/account-manager] set crm_contacts.assigned_to for contact ${contactId}`
        );

        // Log assignment activity + assignment log (mirrors crm/contacts/assign)
        await Promise.allSettled([
          supabase.from("crm_activities").insert({
            contact_id: contactId,
            type: "assignment",
            content: `Được gán cho nhân viên sale (từ trang quản lý user)`,
            created_by: adminUserId,
            is_system: true,
          }),
          supabase.from("crm_lead_assignment_log").insert({
            contact_id: contactId,
            assigned_to: saleId,
            assigned_by: adminUserId,
            method: "manual",
          }),
        ]);
      }
    } else {
      console.info(
        `[users/account-manager] crm_contact ${contactId} already assigned to ${contactRow.assigned_to} — not overwriting`
      );
    }

    // 2) Cascade to orders by email (if the contact has an email)
    if (contactEmail) {
      const { count: oCount, error: oErr } = await supabase
        .from("orders")
        .update({ assigned_to: saleId }, { count: "exact" })
        .ilike("customer_email", contactEmail);
      if (oErr) {
        console.error(
          "[users/account-manager] cascade orders error:",
          oErr.message
        );
      } else {
        result.orders = oCount ?? 0;
      }
    } else {
      // Fallback: try to get email from the user's profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .maybeSingle();

      const profileEmail = (
        (profileData?.email as string | null) ?? ""
      )
        .trim()
        .toLowerCase();

      if (profileEmail) {
        const { count: oCount, error: oErr } = await supabase
          .from("orders")
          .update({ assigned_to: saleId }, { count: "exact" })
          .ilike("customer_email", profileEmail);
        if (oErr) {
          console.error(
            "[users/account-manager] cascade orders (profile email) error:",
            oErr.message
          );
        } else {
          result.orders = oCount ?? 0;
        }
      }
    }

    // 3) Cascade to course_interests by user_id
    const { count: iCount, error: iErr } = await supabase
      .from("course_interests")
      .update({ assigned_to: saleId }, { count: "exact" })
      .eq("user_id", userId);
    if (iErr) {
      console.error(
        "[users/account-manager] cascade interests error:",
        iErr.message
      );
    } else {
      result.interests = iCount ?? 0;
    }

    // 4) Cascade to crm_deals by contact_id
    const { count: dCount, error: dErr } = await supabase
      .from("crm_deals")
      .update({ assigned_to: saleId }, { count: "exact" })
      .eq("contact_id", contactId);
    if (dErr) {
      console.error(
        "[users/account-manager] cascade deals error:",
        dErr.message
      );
    } else {
      result.deals = dCount ?? 0;
    }
  } catch (err) {
    console.error(
      "[users/account-manager] cascade unexpected error:",
      err instanceof Error ? err.message : err
    );
  }

  return result;
}
