import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// POST /api/email/campaigns/[id]/pause — pause a sending campaign
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

    const { id } = await params;
    const admin = await createAdminClient();

    // Fetch campaign to check status
    const { data: campaign, error: fetchError } = await admin
      .from("email_campaigns")
      .select("id, status")
      .eq("id", id)
      .single();

    if (fetchError || !campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (campaign.status !== "sending") {
      return NextResponse.json(
        { error: "Can only pause a campaign that is currently sending" },
        { status: 400 }
      );
    }

    const { error: updateError } = await admin
      .from("email_campaigns")
      .update({
        status: "paused",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/email/campaigns/[id]/pause error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
