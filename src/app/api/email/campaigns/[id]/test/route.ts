import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendEmailWithParams } from "@/lib/email/ses";
import { renderTemplate } from "@/lib/email/template-renderer";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/email/campaigns/[id]/test — send a test email
export async function POST(
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

    // Rate limit: 5 test emails per 5 min per user
    const rl = await rateLimit(`campaign-test:${user.id}`, 5, 300);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retryAfterSec: rl.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const { id } = await params;
    const body = await req.json();
    // Accept both "test_email" and "email" field names
    const testEmailAddr = (body.test_email || body.email || "").trim();

    if (!testEmailAddr) {
      return NextResponse.json(
        { error: "test_email is required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmailAddr)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const admin = await createAdminClient();

    // Fetch campaign
    const { data: campaign, error: fetchError } = await admin
      .from("email_campaigns")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Replace variables with sample data using the shared template renderer
    const sampleVariables: Record<string, string> = {
      name: "Test User",
      full_name: "Test User",
      first_name: "Test",
      email: testEmailAddr,
      subscriber_id: "00000000-0000-0000-0000-000000000000",
      unsubscribe_url: "#",
      company_name: campaign.from_name || "Lê Đăng Khương Academy",
      current_year: new Date().getFullYear().toString(),
      company: campaign.from_name || "Lê Đăng Khương Academy",
      date: new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
    };

    const renderedHtml = renderTemplate(
      campaign.html_content || "",
      sampleVariables
    );

    // Add [TEST] prefix to subject
    const testSubject = `[TEST] ${campaign.subject}`;

    // Send via shared SES client
    const result = await sendEmailWithParams({
      to: testEmailAddr,
      subject: testSubject,
      html: renderedHtml,
      text: campaign.text_content || undefined,
      fromName: campaign.from_name || undefined,
      fromEmail: campaign.from_email || undefined,
      replyTo: campaign.reply_to || undefined,
      tags: { campaign_id: id, type: "test" },
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send test email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (err) {
    console.error("POST /api/email/campaigns/[id]/test error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
