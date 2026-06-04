import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// POST /api/email/automations/[id]/duplicate — duplicate an automation
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check: only admin/manager
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!["admin", "manager"].includes(profile?.role ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const admin = await createAdminClient();

    // Fetch the original automation
    const { data: original, error: fetchError } = await admin
      .from("email_automations")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !original) {
      return NextResponse.json(
        { error: "Automation not found" },
        { status: 404 }
      );
    }

    // Create a duplicate with reset counts
    const duplicateData = {
      name: `${original.name} (copy)`,
      description: original.description,
      status: "draft",
      trigger_type: original.trigger_type,
      trigger_config: original.trigger_config,
      flow_definition: original.flow_definition,
      enrolled_count: 0,
      completed_count: 0,
      active_count: 0,
      created_by: user.id,
    };

    const { data: newAutomation, error: insertError } = await admin
      .from("email_automations")
      .insert(duplicateData)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ automation: newAutomation }, { status: 201 });
  } catch (err) {
    console.error("POST /api/email/automations/[id]/duplicate error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
