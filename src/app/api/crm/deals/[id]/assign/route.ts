import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ASSIGNABLE_ROLES } from "@/lib/sales";
import { logAudit } from "@/lib/audit";
import { propagateToContact } from "@/lib/sticky-assign";
import { isValidUUID } from "@/lib/utils";

/**
 * POST /api/crm/deals/[id]/assign
 * Body: { assigned_to: string | null }   // null = unassign
 * Auth: admin or manager only.
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

    let body: { assigned_to?: string | null };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const assignedTo =
      body.assigned_to === undefined ? undefined : body.assigned_to;

    if (assignedTo === undefined) {
      return NextResponse.json(
        { error: "assigned_to is required (string or null)" },
        { status: 400 }
      );
    }

    const adminClient = await createAdminClient();

    // Validate the target profile has an assignable role
    if (assignedTo !== null) {
      const { data: target } = await adminClient
        .from("profiles")
        .select("id, role")
        .eq("id", assignedTo)
        .single();

      if (!target) {
        return NextResponse.json(
          { error: "Target profile not found" },
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

    // Fetch the deal BEFORE updating so we know the linked contact for
    // propagation and assignment-log.
    const { data: deal } = await adminClient
      .from("crm_deals")
      .select("id, contact_id, assigned_to")
      .eq("id", id)
      .maybeSingle();

    if (!deal) {
      return NextResponse.json(
        { error: "Deal not found" },
        { status: 404 }
      );
    }

    const { error: updErr } = await adminClient
      .from("crm_deals")
      .update({ assigned_to: assignedTo })
      .eq("id", id);

    if (updErr) {
      console.error("[crm/deals/assign POST]", updErr);
      return NextResponse.json(
        { error: "Update failed" },
        { status: 500 }
      );
    }

    // First-touch propagation: copy the assignment up to the parent CRM
    // contact so future items inherit the same sticky owner. Fail-soft.
    let propagationResult: Awaited<ReturnType<typeof propagateToContact>> | null =
      null;
    if (assignedTo !== null && deal.contact_id) {
      propagationResult = await propagateToContact(adminClient, {
        contact_id: deal.contact_id,
        sale_id: assignedTo,
      });
      if (propagationResult.propagated) {
        console.info(
          `[crm/deals/assign POST] propagated assignment to crm_contact ${propagationResult.contact_id}`
        );
      } else {
        console.info(
          `[crm/deals/assign POST] propagation skipped: ${propagationResult.reason}`
        );
      }
    }

    // Sync account_manager_id on the linked user profile (fail-soft).
    // Only sets the field when it is currently NULL to preserve manual overrides.
    if (assignedTo !== null && deal.contact_id) {
      const [profileSyncResult] = await Promise.allSettled([
        (async () => {
          const { data: contact } = await adminClient
            .from("crm_contacts")
            .select("user_id")
            .eq("id", deal.contact_id)
            .maybeSingle();

          if (contact?.user_id) {
            const { error: profErr } = await adminClient
              .from("profiles")
              .update({ account_manager_id: assignedTo })
              .eq("id", contact.user_id)
              .is("account_manager_id", null);

            if (profErr) {
              console.error(
                "[crm/deals/assign POST] profiles.account_manager_id sync failed:",
                profErr.message
              );
            } else {
              console.info(
                `[crm/deals/assign POST] synced account_manager_id for user ${contact.user_id}`
              );
            }
          }
        })(),
      ]);

      if (profileSyncResult.status === "rejected") {
        console.error(
          "[crm/deals/assign POST] account_manager_id sync threw:",
          profileSyncResult.reason
        );
      }
    }

    // Log to crm_lead_assignment_log for reporting & round-robin continuity.
    if (deal.contact_id) {
      await adminClient
        .from("crm_lead_assignment_log")
        .insert({
          contact_id: deal.contact_id,
          assigned_to: assignedTo,
          assigned_by: user.id,
          method: "manual",
        })
        .then(({ error: logErr }) => {
          if (logErr) {
            console.error(
              "[crm/deals/assign POST] assignment log insert failed:",
              logErr.message
            );
          }
        });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await logAudit({
      admin_id: user.id,
      action: "deal.assign",
      target_type: "deal",
      target_id: id,
      details: { assigned_to: assignedTo, propagation: propagationResult },
      ip_address: ip,
    });

    return NextResponse.json({ ok: true, assigned_to: assignedTo });
  } catch (err) {
    console.error("POST /api/crm/deals/[id]/assign error:", err);
    return NextResponse.json(
      { error: "Không thể thực hiện. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
