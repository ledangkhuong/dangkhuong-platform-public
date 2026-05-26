import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { CRM_JOURNEY_STAGES } from "@/lib/crm-constants";
import { isValidUUID } from "@/lib/utils";

const ALLOWED_STAGES: readonly string[] = CRM_JOURNEY_STAGES;

// POST /api/crm/contacts/[id]/journey — Update journey stage
export async function POST(
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

  const { stage } = await req.json();

  if (!stage || !ALLOWED_STAGES.includes(stage)) {
    return NextResponse.json(
      { error: `Invalid stage. Allowed: ${ALLOWED_STAGES.join(", ")}` },
      { status: 400 }
    );
  }

  // Get current contact
  const { data: currentContact, error: fetchError } = await adminClient
    .from("crm_contacts")
    .select("journey_stage")
    .eq("id", id)
    .single();

  if (fetchError || !currentContact)
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  // Build update payload
  const updatePayload: Record<string, unknown> = { journey_stage: stage };
  if (stage === "customer") {
    updatePayload.converted_at = new Date().toISOString();
  }

  // Update contact
  const { data: updated, error: updateError } = await adminClient
    .from("crm_contacts")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    console.error("[crm/contacts/journey POST]", updateError);
    return NextResponse.json({ error: "Đã xảy ra lỗi" }, { status: 500 });
  }

  // Log journey_change activity
  await adminClient.from("crm_activities").insert({
    contact_id: id,
    type: "journey_change",
    content: `Journey stage changed from "${currentContact.journey_stage}" to "${stage}"`,
    created_by: user.id,
    is_system: true,
  });

  return NextResponse.json({ contact: updated });
}
