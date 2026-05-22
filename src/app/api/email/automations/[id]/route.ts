import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET /api/email/automations/[id] — get single automation with full flow_definition
export async function GET(
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

    // Fetch the automation
    const { data: automation, error } = await admin
      .from("email_automations")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !automation) {
      return NextResponse.json(
        { error: "Automation not found" },
        { status: 404 }
      );
    }

    // Fetch recent 20 logs
    const { data: logs } = await admin
      .from("email_automation_logs")
      .select("*")
      .eq("automation_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Fetch enrollment count grouped by status
    const { data: enrollments } = await admin
      .from("email_automation_enrollments")
      .select("status")
      .eq("automation_id", id);

    const enrollmentStats = {
      active: 0,
      completed: 0,
      paused: 0,
      exited: 0,
      waiting: 0,
    };

    if (enrollments) {
      for (const enrollment of enrollments) {
        const s = enrollment.status as keyof typeof enrollmentStats;
        if (s in enrollmentStats) {
          enrollmentStats[s]++;
        }
      }
    }

    return NextResponse.json({
      automation,
      logs: logs || [],
      enrollmentStats,
    });
  } catch (err) {
    console.error("GET /api/email/automations/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/email/automations/[id] — update automation
export async function PUT(
  req: NextRequest,
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

    // Fetch existing automation
    const { data: existing, error: fetchError } = await admin
      .from("email_automations")
      .select("id, status, flow_definition")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Automation not found" },
        { status: 404 }
      );
    }

    const body = await req.json();

    const allowedFields = [
      "name",
      "description",
      "status",
      "trigger_type",
      "trigger_config",
      "flow_definition",
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // If status is being changed to 'active', validate flow_definition
    if (updateData.status === "active" && existing.status !== "active") {
      const flowDef =
        (updateData.flow_definition as { nodes?: { type: string }[] }) ||
        (existing.flow_definition as { nodes?: { type: string }[] });

      const nodes = flowDef?.nodes || [];
      const hasTrigger = nodes.some(
        (n: { type: string }) => n.type === "trigger"
      );
      const hasAction = nodes.some(
        (n: { type: string }) =>
          n.type !== "trigger" && n.type !== "condition"
      );

      if (!hasTrigger || !hasAction) {
        return NextResponse.json(
          {
            error:
              "Cannot activate automation: flow must have at least a trigger node and one action node",
          },
          { status: 400 }
        );
      }
    }

    updateData.updated_at = new Date().toISOString();

    const { data: updated, error: updateError } = await admin
      .from("email_automations")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ automation: updated });
  } catch (err) {
    console.error("PUT /api/email/automations/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/email/automations/[id] — delete automation
export async function DELETE(
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

    // Verify automation exists
    const { data: existing, error: fetchError } = await admin
      .from("email_automations")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Automation not found" },
        { status: 404 }
      );
    }

    // Delete automation (cascade will clean up steps, enrollments, logs)
    const { error: deleteError } = await admin
      .from("email_automations")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/email/automations/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
