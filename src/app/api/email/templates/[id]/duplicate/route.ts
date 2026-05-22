import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// POST /api/email/templates/[id]/duplicate — duplicate a template
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createAdminClient();

    // Fetch original template
    const { data: original, error: fetchError } = await supabase
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
    const { data: duplicate, error: insertError } = await supabase
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
