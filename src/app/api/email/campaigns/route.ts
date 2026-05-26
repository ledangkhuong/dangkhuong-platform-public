import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sanitizeSearchInput } from "@/lib/utils";

// GET /api/email/campaigns — list campaigns with pagination
export async function GET(req: NextRequest) {
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

    const admin = await createAdminClient();

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20"))
    );
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search")?.trim() || "";
    const offset = (page - 1) * limit;

    let query = admin
      .from("email_campaigns")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      const safeSearch = sanitizeSearchInput(search);
      if (safeSearch) {
        query = query.or(
          `name.ilike.%${safeSearch}%,subject.ilike.%${safeSearch}%`
        );
      }
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error("[Email Campaigns GET] Error:", error);
      return NextResponse.json({ error: "Có lỗi xảy ra khi tải chiến dịch. Vui lòng thử lại." }, { status: 500 });
    }

    const total = count || 0;

    return NextResponse.json({
      campaigns: data || [],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("GET /api/email/campaigns error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/email/campaigns — create a new campaign
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const {
      name,
      subject,
      html_content,
      text_content,
      from_name,
      from_email,
      reply_to,
      template_id,
      list_id,
      tags,
      scheduled_at,
    } = body;

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }
    if (!subject?.trim()) {
      return NextResponse.json(
        { error: "subject is required" },
        { status: 400 }
      );
    }
    // html_content is optional for drafts — allow saving drafts early
    // in the wizard before content is filled in

    const admin = await createAdminClient();

    const campaignData: Record<string, unknown> = {
      name: name.trim(),
      subject: subject.trim(),
      html_content: html_content || "",
      created_by: user.id,
      status: scheduled_at ? "scheduled" : "draft",
    };

    if (text_content !== undefined) campaignData.text_content = text_content;
    if (from_name !== undefined) campaignData.from_name = from_name;
    if (from_email !== undefined) campaignData.from_email = from_email;
    if (reply_to !== undefined) campaignData.reply_to = reply_to;
    if (template_id !== undefined) campaignData.template_id = template_id;
    if (list_id !== undefined) campaignData.list_id = list_id;
    if (tags !== undefined) campaignData.tags = tags;
    if (scheduled_at !== undefined) campaignData.scheduled_at = scheduled_at;

    const { data, error } = await admin
      .from("email_campaigns")
      .insert(campaignData)
      .select()
      .single();

    if (error) {
      console.error("[Email Campaigns POST] Error:", error);
      return NextResponse.json({ error: "Có lỗi xảy ra khi tạo chiến dịch. Vui lòng thử lại." }, { status: 500 });
    }

    return NextResponse.json({ campaign: data }, { status: 201 });
  } catch (err) {
    console.error("POST /api/email/campaigns error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
