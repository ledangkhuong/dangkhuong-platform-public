import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "manager"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = await createAdminClient();

    // Parse body
    const body = await request.json();
    const { action } = body;

    if (!action || !["activate", "pause"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'activate' or 'pause'" },
        { status: 400 }
      );
    }

    // Get current automation
    const { data: automation, error: fetchError } = await admin
      .from("email_automations")
      .select("id, status, flow_definition")
      .eq("id", id)
      .single();

    if (fetchError || !automation) {
      return NextResponse.json(
        { error: "Automation not found" },
        { status: 404 }
      );
    }

    if (action === "activate") {
      // Validate flow_definition has nodes
      const flowDefinition = automation.flow_definition;
      if (
        !flowDefinition ||
        !flowDefinition.nodes ||
        flowDefinition.nodes.length === 0
      ) {
        return NextResponse.json(
          {
            error:
              "Cannot activate automation without nodes in flow definition",
          },
          { status: 400 }
        );
      }

      // Update status to active
      const { error: updateError } = await admin
        .from("email_automations")
        .update({ status: "active" })
        .eq("id", id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to activate automation" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        automation: { id, status: "active" },
      });
    } else {
      // Pause action
      // Update automation status to paused
      const { error: updateError } = await admin
        .from("email_automations")
        .update({ status: "paused" })
        .eq("id", id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to pause automation" },
          { status: 500 }
        );
      }

      // Pause all active/waiting enrollment records
      await admin
        .from("email_automation_enrollments")
        .update({ status: "paused" })
        .eq("automation_id", id)
        .in("status", ["active", "waiting"]);

      return NextResponse.json({
        automation: { id, status: "paused" },
      });
    }
  } catch (error) {
    console.error("Error toggling automation status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
