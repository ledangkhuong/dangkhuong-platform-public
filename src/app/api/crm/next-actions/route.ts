import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getViewerScope } from "@/lib/viewer-scope";

// GET /api/crm/next-actions — List next actions
export async function GET(req: NextRequest) {
  try {
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

    const { searchParams } = new URL(req.url);
    const contact_id = searchParams.get("contact_id");
    const assigned_to = searchParams.get("assigned_to");
    const status = searchParams.get("status") || "pending";
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    let query = adminClient
      .from("crm_next_actions")
      .select("*, crm_contacts(full_name, email), profiles:assigned_to(full_name)")
      .eq("status", status)
      .order("due_at", { ascending: true })
      .limit(limit);

    if (contact_id) query = query.eq("contact_id", contact_id);
    if (assigned_to) query = query.eq("assigned_to", assigned_to);

    // Sale-scoping: sale users only see actions for their assigned contacts
    const scope = await getViewerScope();
    if (scope.isSale) {
      query = query.eq("assigned_to", scope.userId!);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[CRM NextActions GET] Error:", error);
      return NextResponse.json({ error: "Có lỗi xảy ra khi tải danh sách hành động. Vui lòng thử lại." }, { status: 500 });
    }

    return NextResponse.json({ actions: data });
  } catch (err) {
    console.error("[CRM NextActions GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/crm/next-actions — Create a new next action
export async function POST(req: NextRequest) {
  try {
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

    const body = await req.json();
    const { contact_id, deal_id, type, title, description, priority, due_at, assigned_to } = body;

    if (!contact_id || !type || !title) {
      return NextResponse.json(
        { error: "contact_id, type, and title are required" },
        { status: 400 }
      );
    }

    // Sale-scoping: sale users can only create actions for their assigned contacts
    const scope = await getViewerScope();
    if (scope.isSale) {
      const { data: contactCheck } = await adminClient
        .from("crm_contacts")
        .select("assigned_to")
        .eq("id", contact_id)
        .single();
      if (contactCheck?.assigned_to !== scope.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { data, error } = await adminClient
      .from("crm_next_actions")
      .insert({
        contact_id,
        deal_id: deal_id || null,
        type,
        title,
        description: description || null,
        priority: priority || "medium",
        due_at: due_at || null,
        assigned_to: assigned_to || user.id,
        status: "pending",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("[CRM NextActions POST] Error:", error);
      return NextResponse.json({ error: "Có lỗi xảy ra khi tạo hành động. Vui lòng thử lại." }, { status: 500 });
    }

    return NextResponse.json({ action: data }, { status: 201 });
  } catch (err) {
    console.error("[CRM NextActions POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/crm/next-actions — Update action status
export async function PATCH(req: NextRequest) {
  try {
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

    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "id and status are required" },
        { status: 400 }
      );
    }

    // Sale-scoping: sale users can only update actions for their assigned contacts
    const scope = await getViewerScope();
    if (scope.isSale) {
      const { data: actionCheck } = await adminClient
        .from("crm_next_actions")
        .select("contact_id")
        .eq("id", id)
        .single();
      if (actionCheck) {
        const { data: contactCheck } = await adminClient
          .from("crm_contacts")
          .select("assigned_to")
          .eq("id", actionCheck.contact_id)
          .single();
        if (contactCheck?.assigned_to !== scope.userId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    const updatePayload: Record<string, unknown> = { status };
    if (status === "completed") {
      updatePayload.completed_at = body.completed_at || new Date().toISOString();
      updatePayload.completed_by = user.id;
    }

    const { data, error } = await adminClient
      .from("crm_next_actions")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[CRM NextActions PATCH] Error:", error);
      return NextResponse.json({ error: "Có lỗi xảy ra khi cập nhật hành động. Vui lòng thử lại." }, { status: 500 });
    }

    return NextResponse.json({ action: data });
  } catch (err) {
    console.error("[CRM NextActions PATCH] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
