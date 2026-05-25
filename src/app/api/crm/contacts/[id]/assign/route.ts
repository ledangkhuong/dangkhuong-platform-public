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

    return NextResponse.json({ ok: true, assigned_to: assignedTo });
  } catch (err) {
    console.error("POST /api/crm/contacts/[id]/assign error:", err);
    return NextResponse.json(
      { error: "Không thể thực hiện. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
