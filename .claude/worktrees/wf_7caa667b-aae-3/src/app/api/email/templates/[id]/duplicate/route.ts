import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// POST /api/email/templates/[id]/duplicate — duplicate a template
export async function POST(
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

    // Fetch original template
    const { data: original, error: fetchError } = await adminSupabase
      .from("email_templates")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !original) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Create a copy with modified name
    const { data: duplicate, error: insertError } = await adminSupabase
      .from("email_templates")
      .insert({
        name: `${original.name} (Copy)`,
        subject: original.subject,
        html_content: original.html_content,
        text_content: original.text_content,
        category: original.category,
        variables: original.variables,
        thumbnail_url: original.thumbnail_url,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ template: duplicate }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
