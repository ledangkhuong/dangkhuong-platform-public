import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/utils";

// GET /api/email/lists/[id] — get single list with subscriber preview
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabaseAuth
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!["admin", "manager"].includes(profile?.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }
    const supabase = await createAdminClient();

    // Fetch list details
    const { data: list, error: listError } = await supabase
      .from("email_lists")
      .select("*")
      .eq("id", id)
      .single();

    if (listError || !list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Fetch first 10 subscribers via join
    const { data: members, error: membersError } = await supabase
      .from("subscriber_list_members")
      .select("added_at, subscribers(*)")
      .eq("list_id", id)
      .order("added_at", { ascending: false })
      .limit(10);

    const subscribers = (members ?? []).map((m) => ({
      ...m.subscribers,
      added_at: m.added_at,
    }));

    // Get total subscriber count from the list itself
    const totalCount = list.subscriber_count ?? 0;

    return NextResponse.json({
      list,
      subscribers,
      total_subscribers: totalCount,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/email/lists/[id] — update list
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabaseAuth
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!["admin", "manager"].includes(profile?.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }
    const body = await req.json();
    const { name, description, color } = body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (color !== undefined) updates.color = color;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Nothing to update. Provide name, description, or color." },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("email_lists")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Email Lists PUT] Error:", error);
      return NextResponse.json({ error: "Có lỗi xảy ra khi cập nhật danh sách. Vui lòng thử lại." }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    return NextResponse.json({ list: data });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/email/lists/[id] — delete list
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabaseAuth
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!["admin", "manager"].includes(profile?.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }
    const supabase = await createAdminClient();

    const { error } = await supabase
      .from("email_lists")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Email Lists DELETE] Error:", error);
      return NextResponse.json({ error: "Có lỗi xảy ra khi xóa danh sách. Vui lòng thử lại." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
