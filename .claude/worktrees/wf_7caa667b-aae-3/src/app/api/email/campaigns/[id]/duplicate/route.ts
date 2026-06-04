import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// POST /api/email/campaigns/[id]/duplicate — duplicate a campaign
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!["admin", "manager"].includes(profile?.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const admin = await createAdminClient();

    // Fetch original campaign
    const { data: original, error: fetchError } = await admin
      .from("email_campaigns")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !original) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Create a copy — only copy content fields, not stats or send data
    const duplicateData = {
      name: `${original.name} (Copy)`,
      subject: original.subject,
      from_name: original.from_name,
      from_email: original.from_email,
      reply_to: original.reply_to,
      html_content: original.html_content,
      text_content: original.text_content,
      template_id: original.template_id,
      list_id: original.list_id,
      tags: original.tags || [],
      metadata: original.metadata || {},
      status: "draft",
      created_by: user.id,
      // Reset all stats
      total_recipients: 0,
      sent_count: 0,
      open_count: 0,
      click_count: 0,
      bounce_count: 0,
      complaint_count: 0,
      unsubscribe_count: 0,
    };

    const { data: newCampaign, error: insertError } = await admin
      .from("email_campaigns")
      .insert(duplicateData)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ campaign: newCampaign }, { status: 201 });
  } catch (err) {
    console.error(
      "POST /api/email/campaigns/[id]/duplicate error:",
      err
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
