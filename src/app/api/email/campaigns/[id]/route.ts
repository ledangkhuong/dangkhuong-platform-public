import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET /api/email/campaigns/[id] — get single campaign with stats
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!["admin", "manager"].includes(profile?.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const admin = await createAdminClient();

    const { data: campaign, error } = await admin
      .from("email_campaigns")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Compute rates
    const total = campaign.total_recipients || 0;
    const open_rate =
      total > 0
        ? Math.round((campaign.open_count / total) * 10000) / 100
        : 0;
    const click_rate =
      total > 0
        ? Math.round((campaign.click_count / total) * 10000) / 100
        : 0;
    const bounce_rate =
      total > 0
        ? Math.round((campaign.bounce_count / total) * 10000) / 100
        : 0;

    return NextResponse.json({
      campaign: {
        ...campaign,
        open_rate,
        click_rate,
        bounce_rate,
      },
    });
  } catch (err) {
    console.error("GET /api/email/campaigns/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/email/campaigns/[id] — update campaign (only draft or scheduled)
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!["admin", "manager"].includes(profile?.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const admin = await createAdminClient();

    // Fetch existing campaign to check status
    const { data: existing, error: fetchError } = await admin
      .from("email_campaigns")
      .select("id, status")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (existing.status !== "draft" && existing.status !== "scheduled") {
      return NextResponse.json(
        { error: "Can only update campaigns with status draft or scheduled" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const allowedFields = [
      "name",
      "subject",
      "html_content",
      "text_content",
      "from_name",
      "from_email",
      "reply_to",
      "template_id",
      "list_id",
      "tags",
      "scheduled_at",
      "metadata",
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Handle status based on scheduled_at
    if ("scheduled_at" in updateData) {
      if (updateData.scheduled_at) {
        updateData.status = "scheduled";
      } else {
        updateData.status = "draft";
      }
    }

    updateData.updated_at = new Date().toISOString();

    const { data: updated, error: updateError } = await admin
      .from("email_campaigns")
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

    return NextResponse.json({ campaign: updated });
  } catch (err) {
    console.error("PUT /api/email/campaigns/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/email/campaigns/[id] — delete campaign (only draft or scheduled)
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!["admin", "manager"].includes(profile?.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const admin = await createAdminClient();

    // Fetch existing campaign to check status
    const { data: existing, error: fetchError } = await admin
      .from("email_campaigns")
      .select("id, status")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (existing.status !== "draft" && existing.status !== "scheduled") {
      return NextResponse.json(
        { error: "Can only delete campaigns with status draft or scheduled" },
        { status: 400 }
      );
    }

    // Delete related records first (email_events -> email_sends -> campaign)
    await admin.from("email_events").delete().eq("campaign_id", id);
    await admin.from("email_sends").delete().eq("campaign_id", id);

    const { error: deleteError } = await admin
      .from("email_campaigns")
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
    console.error("DELETE /api/email/campaigns/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
