import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ASSIGNABLE_ROLES } from "@/lib/sales";

/**
 * PATCH /api/crm/interests
 * Update course interest status/notes (staff only)
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check staff role
    const admin = await createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const staffRoles = ["admin", "manager", "sale", "support"];
    if (!profile || !staffRoles.includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { interest_id, status, notes, contacted, contacted_at, assigned_to } = body;

    if (!interest_id) {
      return NextResponse.json(
        { error: "interest_id is required" },
        { status: 400 }
      );
    }

    // Build update payload
    const updateData: Record<string, unknown> = {};

    if (status !== undefined) {
      updateData.status = status;
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    if (assigned_to !== undefined) {
      // Validate target profile has an assignable role (matches
      // /api/admin/orders/[id]/assign + /api/crm/contacts/[id]/assign).
      if (assigned_to) {
        const { data: target } = await admin
          .from("profiles")
          .select("id, role")
          .eq("id", assigned_to)
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
      updateData.assigned_to = assigned_to || null;
    }
    if (contacted !== undefined) {
      updateData.contacted = contacted;
      updateData.contacted_at = contacted_at || new Date().toISOString();
      updateData.contacted_by = user.id;
      // Auto-assign to the sale who contacted
      if (!assigned_to) {
        updateData.assigned_to = user.id;
      }
    }

    const { error } = await admin
      .from("course_interests")
      .update(updateData)
      .eq("id", interest_id);

    if (error) {
      console.error("[crm/interests PATCH]", error);
      return NextResponse.json(
        { error: "Update failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[crm/interests PATCH]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/crm/interests
 * Get course interests (staff only)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const staffRoles = ["admin", "manager", "sale", "support"];
    if (!profile || !staffRoles.includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const productId = url.searchParams.get("product_id");
    const limit = parseInt(url.searchParams.get("limit") || "100");

    let query = admin
      .from("course_interests")
      .select(
        `
        *,
        profiles!course_interests_user_id_profiles_fkey(full_name, avatar_url, tier, level),
        products!course_interests_product_id_fkey(title, slug, price, sale_price, thumbnail),
        contacted_profile:profiles!course_interests_contacted_by_profiles_fkey(full_name),
        assigned_profile:profiles!course_interests_assigned_to_fkey(full_name)
      `
      )
      .order("last_viewed_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }
    if (productId) {
      query = query.eq("product_id", productId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[crm/interests GET]", error);
      return NextResponse.json(
        { error: "Fetch failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ interests: data });
  } catch (error) {
    console.error("[crm/interests GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
