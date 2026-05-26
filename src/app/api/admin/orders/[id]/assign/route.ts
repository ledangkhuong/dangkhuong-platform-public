import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ASSIGNABLE_ROLES } from "@/lib/sales";
import { logAudit } from "@/lib/audit";
import { propagateToContact } from "@/lib/sticky-assign";

/**
 * POST /api/admin/orders/[id]/assign
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
    if (!id)
      return NextResponse.json({ error: "Missing order id" }, { status: 400 });

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

    const { error: updErr } = await adminClient
      .from("orders")
      .update({
        assigned_to: assignedTo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updErr) {
      console.error("[orders/assign POST]", updErr);
      return NextResponse.json(
        { error: "Update failed" },
        { status: 500 }
      );
    }

    // First-touch propagation: copy the assignment up to the matching CRM
    // contact so future items inherit the same sticky owner. Fail-soft —
    // never block the response on propagation. Skip when unassigning.
    let propagationResult: Awaited<ReturnType<typeof propagateToContact>> | null =
      null;
    if (assignedTo !== null) {
      const { data: orderRow } = await adminClient
        .from("orders")
        .select("customer_email, user_id")
        .eq("id", id)
        .maybeSingle();

      if (orderRow) {
        propagationResult = await propagateToContact(adminClient, {
          email: orderRow.customer_email ?? null,
          user_id: orderRow.user_id ?? null,
          sale_id: assignedTo,
        });
        if (propagationResult.propagated) {
          console.info(
            `[orders/assign POST] propagated assignment to crm_contact ${propagationResult.contact_id}`
          );

          // Mirror what the CRM contact-assign action does: log a
          // crm_activities entry and a crm_lead_assignment_log row so the
          // contact timeline and assignment history stay consistent even
          // when the assignment originates from an order.
          await Promise.allSettled([
            adminClient.from("crm_activities").insert({
              contact_id: propagationResult.contact_id,
              type: "assignment",
              content: `Được gán cho nhân viên sale (từ đơn hàng)`,
              created_by: user.id,
              is_system: true,
            }),
            adminClient.from("crm_lead_assignment_log").insert({
              contact_id: propagationResult.contact_id,
              assigned_to: assignedTo,
              assigned_by: user.id,
              method: "manual",
            }),
          ]);
        } else {
          console.info(
            `[orders/assign POST] propagation skipped: ${propagationResult.reason}`
          );
        }

        // Sync account_manager_id on the user's profile so the Users admin
        // page reflects the assignment. First-touch only — never overwrite
        // an existing account manager. Fail-soft via Promise.allSettled.
        const profileUserId = orderRow.user_id ?? null;
        const profileEmail = orderRow.customer_email?.trim().toLowerCase() ?? null;

        if (profileUserId || profileEmail) {
          await Promise.allSettled([
            (async () => {
              // Resolve which profile row to update.
              let targetProfileId: string | null = profileUserId;

              if (!targetProfileId && profileEmail) {
                // No user_id on order — look up by email in profiles.
                const { data: profileByEmail } = await adminClient
                  .from("profiles")
                  .select("id, account_manager_id")
                  .eq("email", profileEmail)
                  .maybeSingle();

                if (!profileByEmail) {
                  console.info(
                    `[orders/assign POST] profile sync skipped: no profile found for email ${profileEmail}`
                  );
                  return;
                }
                if (profileByEmail.account_manager_id) {
                  console.info(
                    `[orders/assign POST] profile sync skipped: profile ${profileByEmail.id} already has account_manager_id`
                  );
                  return;
                }
                targetProfileId = profileByEmail.id;
              }

              if (!targetProfileId) return;

              // Only update if account_manager_id is currently NULL (first-touch).
              const { error: profileUpdErr } = await adminClient
                .from("profiles")
                .update({ account_manager_id: assignedTo })
                .eq("id", targetProfileId)
                .is("account_manager_id", null); // race guard: only write if still null

              if (profileUpdErr) {
                console.error(
                  `[orders/assign POST] profile sync error for ${targetProfileId}:`,
                  profileUpdErr.message
                );
              } else {
                console.info(
                  `[orders/assign POST] synced account_manager_id on profile ${targetProfileId}`
                );
              }
            })(),
          ]);
        }
      }
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await logAudit({
      admin_id: user.id,
      action: "order.assign",
      target_type: "order",
      target_id: id,
      details: { assigned_to: assignedTo, propagation: propagationResult },
      ip_address: ip,
    });

    return NextResponse.json({ ok: true, assigned_to: assignedTo });
  } catch (err) {
    console.error("POST /api/admin/orders/[id]/assign error:", err);
    return NextResponse.json(
      { error: "Không thể thực hiện. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
