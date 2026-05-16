import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET /api/email/automations — list all automations
export async function GET(req: NextRequest) {
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

    const adminClient = await createAdminClient();
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status") || "";

    let query = adminClient
      .from("email_automations")
      .select(
        "id, name, description, status, trigger_type, enrolled_count, completed_count, active_count, created_at, updated_at"
      )
      .order("updated_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ automations: data || [] });
  } catch (err) {
    console.error("GET /api/email/automations error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/email/automations — create a new automation
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { name, description, trigger_type, trigger_config } = body;

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const validTriggerTypes = [
      "tag_added",
      "subscribed_to_list",
      "manual",
      "purchase",
      "form_submit",
    ];
    if (!trigger_type || !validTriggerTypes.includes(trigger_type)) {
      return NextResponse.json(
        {
          error: `trigger_type is required and must be one of: ${validTriggerTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const adminClient = await createAdminClient();

    const defaultFlowDefinition = {
      nodes: [
        {
          id: "trigger-1",
          type: "trigger",
          position: { x: 250, y: 0 },
          data: { triggerType: "manual", config: {} },
        },
      ],
      edges: [],
    };

    const automationData: Record<string, unknown> = {
      name: name.trim(),
      description: description?.trim() || null,
      trigger_type,
      trigger_config: trigger_config || {},
      flow_definition: defaultFlowDefinition,
      status: "draft",
      created_by: user.id,
    };

    const { data, error } = await adminClient
      .from("email_automations")
      .insert(automationData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ automation: data }, { status: 201 });
  } catch (err) {
    console.error("POST /api/email/automations error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
