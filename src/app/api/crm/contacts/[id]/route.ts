import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/utils";

// GET /api/crm/contacts/[id] — Full 360° contact data
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (
    !profile ||
    !["admin", "manager", "sale", "support", "marketing"].includes(
      profile.role
    )
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminClient = await createAdminClient();
  const { id } = await params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }

  // Fetch contact
  const { data: contact, error: contactError } = await adminClient
    .from("crm_contacts")
    .select("*")
    .eq("id", id)
    .single();

  if (contactError || !contact)
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  // Fetch all related data in parallel
  const [ordersRes, enrollmentsRes, activitiesRes, dealsRes, nextActionsRes, recommendationsRes] =
    await Promise.all([
      // Orders by customer email
      adminClient
        .from("orders")
        .select("id, order_code, amount, status, paid_at, created_at, products(title, thumbnail)")
        .eq("customer_email", contact.email),

      // Enrollments via profiles matched by email
      adminClient
        .from("enrollments")
        .select("product_id, products(title, thumbnail), created_at, profiles!inner(email)")
        .eq("profiles.email", contact.email),

      // Activities
      adminClient
        .from("crm_activities")
        .select("*, profiles:created_by(full_name, avatar_url)")
        .eq("contact_id", id)
        .order("created_at", { ascending: false })
        .limit(50),

      // Deals
      adminClient
        .from("crm_deals")
        .select("*, products(title), assigned_profile:profiles!crm_deals_assigned_to_fkey(full_name)")
        .eq("contact_id", id),

      // Next actions (pending)
      adminClient
        .from("crm_next_actions")
        .select("*")
        .eq("contact_id", id)
        .eq("status", "pending")
        .order("due_at", { ascending: true }),

      // Course recommendations
      adminClient
        .from("crm_course_recommendations")
        .select("*, products(title, price, thumbnail)")
        .eq("contact_id", id),
    ]);

  return NextResponse.json({
    contact,
    orders: ordersRes.data ?? [],
    enrollments: enrollmentsRes.data ?? [],
    activities: activitiesRes.data ?? [],
    deals: dealsRes.data ?? [],
    next_actions: nextActionsRes.data ?? [],
    recommendations: recommendationsRes.data ?? [],
  });
}

// PATCH /api/crm/contacts/[id] — Update contact fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (
    !profile ||
    !["admin", "manager", "sale", "support", "marketing"].includes(
      profile.role
    )
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminClient = await createAdminClient();
  const { id } = await params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }

  const body = await req.json();
  const allowedFields = [
    "full_name",
    "email",
    "phone",
    "company",
    "notes",
    "status",
    "journey_stage",
    "lead_score",
    "assigned_to",
    "utm_source",
    "utm_medium",
    "utm_campaign",
  ];

  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Get current contact for change detection
  const { data: currentContact } = await adminClient
    .from("crm_contacts")
    .select("status, journey_stage")
    .eq("id", id)
    .single();

  // Update contact
  const { data: updated, error: updateError } = await adminClient
    .from("crm_contacts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    console.error("[crm/contacts PATCH]", updateError);
    return NextResponse.json({ error: "Đã xảy ra lỗi" }, { status: 500 });
  }

  // Log activity if status changed
  if (currentContact && body.status && body.status !== currentContact.status) {
    await adminClient.from("crm_activities").insert({
      contact_id: id,
      type: "status_change",
      content: `Status changed from "${currentContact.status}" to "${body.status}"`,
      created_by: user.id,
      is_system: false,
    });
  }

  // Log activity if journey_stage changed
  if (currentContact && body.journey_stage && body.journey_stage !== currentContact.journey_stage) {
    await adminClient.from("crm_activities").insert({
      contact_id: id,
      type: "journey_change",
      content: `Journey stage changed from "${currentContact.journey_stage}" to "${body.journey_stage}"`,
      created_by: user.id,
      is_system: false,
    });
  }

  return NextResponse.json({ contact: updated });
}
