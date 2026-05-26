import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getStickyAssignment } from "@/lib/sticky-assign";

/**
 * POST /api/courses/interest
 * Track when a logged-in user views a course they haven't purchased.
 * Called client-side from CourseInterestTracker component.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { product_id } = body;

    if (!product_id) {
      return NextResponse.json(
        { error: "product_id is required" },
        { status: 400 }
      );
    }

    const admin = await createAdminClient();

    // Upsert: if already exists, increment view_count + update last_viewed_at
    const { data: existing } = await admin
      .from("course_interests")
      .select("id, view_count")
      .eq("user_id", user.id)
      .eq("product_id", product_id)
      .maybeSingle();

    if (existing) {
      await admin
        .from("course_interests")
        .update({
          view_count: (existing.view_count || 1) + 1,
          last_viewed_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      // Sticky sale assignment — inherit assigned_to from the user's CRM
      // contact (if any). Fail-soft: log and continue without on error.
      let stickyAssignedTo: string | null = null;
      try {
        stickyAssignedTo = await getStickyAssignment(admin, {
          user_id: user.id,
        });
      } catch (stickyErr) {
        console.error(
          "[course-interest] Sticky-assign lookup failed:",
          stickyErr instanceof Error ? stickyErr.message : stickyErr
        );
      }

      await admin.from("course_interests").insert({
        user_id: user.id,
        product_id,
        view_count: 1,
        first_viewed_at: new Date().toISOString(),
        last_viewed_at: new Date().toISOString(),
        ...(stickyAssignedTo ? { assigned_to: stickyAssignedTo } : {}),
      });

      // Back-fill profiles.account_manager_id so the profile reflects
      // the sticky owner. Only sets when currently NULL (fail-soft).
      if (stickyAssignedTo) {
        admin
          .from("profiles")
          .update({ account_manager_id: stickyAssignedTo })
          .eq("id", user.id)
          .is("account_manager_id", null)
          .then(({ error: amErr }) => {
            if (amErr) {
              console.error(
                "[course-interest] account_manager_id back-fill failed:",
                amErr.message
              );
            }
          });
      }

      // Also auto-create/update CRM contact if not exists
      const userEmail = user.email;
      const { data: profile } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (userEmail) {
        const { data: existingContact } = await admin
          .from("crm_contacts")
          .select("id, journey_stage")
          .eq("email", userEmail)
          .maybeSingle();

        if (!existingContact) {
          // Create new CRM contact from the interested user.
          // Include user_id so future getStickyAssignment lookups by
          // user_id find this contact, and carry forward the sticky
          // sale assignment (if any) so the contact and interest stay
          // in sync from the start.
          await admin.from("crm_contacts").insert({
            user_id: user.id,
            full_name: profile?.full_name || userEmail.split("@")[0],
            email: userEmail,
            source: "website",
            status: "new",
            journey_stage: "lead",
            first_seen_at: new Date().toISOString(),
            first_page: `/courses`,
            ...(stickyAssignedTo ? { assigned_to: stickyAssignedTo } : {}),
          });
        }
      }
    }

    // Log activity in CRM if contact exists
    const userEmail = user.email;

    if (userEmail) {
      const { data: contact } = await admin
        .from("crm_contacts")
        .select("id")
        .eq("email", userEmail)
        .maybeSingle();

      if (contact) {
        // Get product title for the activity log
        const { data: product } = await admin
          .from("products")
          .select("title")
          .eq("id", product_id)
          .single();

        await admin.from("crm_activities").insert({
          contact_id: contact.id,
          type: "page_view",
          content: `Xem khoá học: ${product?.title || product_id}`,
          created_by: user.id,
          is_system: true,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[course-interest]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
