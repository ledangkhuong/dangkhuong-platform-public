import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const SAMPLE_VARIABLES: Record<string, string> = {
  "{{name}}": "Nguyễn Văn A",
  "{{email}}": "example@email.com",
  "{{unsubscribe_url}}": "#",
  "{{company_name}}": "Lê Đăng Khương Academy",
  "{{current_year}}": new Date().getFullYear().toString(),
};

function replaceVariables(text: string): string {
  let result = text;
  for (const [variable, value] of Object.entries(SAMPLE_VARIABLES)) {
    result = result.replaceAll(variable, value);
  }
  return result;
}

// GET /api/email/templates/[id]/preview — preview template with sample data
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminSupabase = await createAdminClient();
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["admin", "manager"].includes(profile.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;

    const { data: template, error } = await adminSupabase
      .from("email_templates")
      .select("html_content, subject")
      .eq("id", id)
      .single();

    if (error || !template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const html = replaceVariables(template.html_content);
    const subject = replaceVariables(template.subject);

    return NextResponse.json({ html, subject });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
