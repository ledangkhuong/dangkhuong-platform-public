import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ASSIGNABLE_ROLES } from "@/lib/sales";

/**
 * POST /api/crm/contacts/[id]/assign
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
      return NextResponse.json({ error: "Missing contact id" }, { status: 400 });

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

    // Fetch the contact BEFORE updating so we know how to cascade.
    const { data: contact } = await adminClient
      .from("crm_contacts")
      .select("id, email, user_id, assigned_to")
      .eq("id", id)
      .maybeSingle();

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    const previousSaleId = (contact.assigned_to as string | null) ?? null;
    const noChange = previousSaleId === assignedTo;

    const { error: updErr } = await adminClient
      .from("crm_contacts")
      .update({ assigned_to: assignedTo })
      .eq("id", id);

    if (updErr) {
      console.error("[crm/contacts/assign POST]", updErr);
      return NextResponse.json(
        { error: "Update failed" },
        { status: 500 }
      );
    }

    // Cascade: when manager actively assigns a NEW sale to a customer, push
    // that sale down to every order / course interest / deal belonging to
    // this customer. Per product spec: customer-level edits ARE the
    // authoritative "this customer belongs to X" signal — past + future
    // items should follow. Order-level edits (different route) stay
    // per-order and do NOT cascade.
    //
    // Skip cascade when:
    //   - new value is NULL (admin is unassigning the customer — don't
    //     wipe history; future items will lookup-fallback correctly).
    //   - no actual change (idempotent re-submit of the same value).
    let cascade: {
      orders: number | null;
      interests: number | null;
      deals: number | null;
      skipped?: string;
    } = { orders: null, interests: null, deals: null };

    if (assignedTo === null) {
      cascade.skipped = "unassign-no-cascade";
    } else if (noChange) {
      cascade.skipped = "no-change";
    } else {
      const email = ((contact.email as string | null) ?? "").trim().toLowerCase();
      const userId = (contact.user_id as string | null) ?? null;

      if (email) {
        const { count: oCount, error: oErr } = await adminClient
          .from("orders")
          .update({ assigned_to: assignedTo }, { count: "exact" })
          .ilike("customer_email", email);
        if (oErr) {
          console.error("[crm/contacts/assign POST] cascade orders:", oErr);
        } else {
          cascade.orders = oCount ?? 0;
        }
      }

      if (userId) {
        const { count: iCount, error: iErr } = await adminClient
          .from("course_interests")
          .update({ assigned_to: assignedTo }, { count: "exact" })
          .eq("user_id", userId);
        if (iErr) {
          console.error("[crm/contacts/assign POST] cascade interests:", iErr);
        } else {
          cascade.interests = iCount ?? 0;
        }
      }

      const { count: dCount, error: dErr } = await adminClient
        .from("crm_deals")
        .update({ assigned_to: assignedTo }, { count: "exact" })
        .eq("contact_id", id);
      if (dErr) {
        console.error("[crm/contacts/assign POST] cascade deals:", dErr);
      } else {
        cascade.deals = dCount ?? 0;
      }
    }

    return NextResponse.json({
      ok: true,
      assigned_to: assignedTo,
      cascade,
    });
  } catch (err) {
    console.error("POST /api/crm/contacts/[id]/assign error:", err);
    return NextResponse.json(
      { error: "Không thể thực hiện. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
