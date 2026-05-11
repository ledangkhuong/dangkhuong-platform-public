import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET /api/email/subscribers/[id] — get single subscriber with lists and recent sends
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const admin = await createAdminClient();

    // Fetch subscriber
    const { data: subscriber, error } = await admin
      .from("subscribers")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !subscriber) {
      return NextResponse.json(
        { error: "Subscriber not found" },
        { status: 404 }
      );
    }

    // Fetch subscriber's lists
    const { data: listMemberships } = await admin
      .from("subscriber_list_members")
      .select("list_id, added_at, email_lists(id, name, description)")
      .eq("subscriber_id", id);

    const lists = (listMemberships || []).map(
      (m: Record<string, unknown>) => ({
        ...(m.email_lists as Record<string, unknown>),
        added_at: m.added_at,
      })
    );

    // Fetch recent email sends for this subscriber (last 10)
    const { data: recentSends } = await admin
      .from("email_sends")
      .select("id, campaign_id, status, sent_at, opened_at, clicked_at")
      .eq("subscriber_id", id)
      .order("sent_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      subscriber: {
        ...subscriber,
        lists,
        recent_sends: recentSends || [],
      },
    });
  } catch (err) {
    console.error("GET /api/email/subscribers/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/email/subscribers/[id] — update subscriber
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { full_name, phone, status, tags, metadata } = body;

    const admin = await createAdminClient();

    // Fetch current subscriber to check status change
    const { data: existing, error: fetchError } = await admin
      .from("subscribers")
      .select("id, status")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Subscriber not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (full_name !== undefined) updateData.full_name = full_name?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (tags !== undefined) updateData.tags = tags;
    if (metadata !== undefined) updateData.metadata = metadata;

    if (status !== undefined) {
      updateData.status = status;
      // If status changed to unsubscribed, set unsubscribed_at
      if (status === "unsubscribed" && existing.status !== "unsubscribed") {
        updateData.unsubscribed_at = new Date().toISOString();
      }
    }

    const { data: subscriber, error: updateError } = await admin
      .from("subscribers")
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

    return NextResponse.json({ subscriber });
  } catch (err) {
    console.error("PUT /api/email/subscribers/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/email/subscribers/[id] — hard delete subscriber
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const admin = await createAdminClient();

    const { error } = await admin
      .from("subscribers")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/email/subscribers/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
