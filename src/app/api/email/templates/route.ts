import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

const VALID_CATEGORIES = ["marketing", "transactional", "newsletter", "automation"];

// GET /api/email/templates — list all templates
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get("category");
    const isActive = searchParams.get("is_active");
    const search = searchParams.get("search");

    const supabase = await createAdminClient();

    let query = supabase
      .from("email_templates")
      .select("*")
      .order("updated_at", { ascending: false });

    if (category) {
      query = query.eq("category", category);
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq("is_active", isActive === "true");
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,subject.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ templates: data });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/email/templates — create a new template
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, subject, html_content, text_content, category, variables } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
      return NextResponse.json(
        { error: "subject is required" },
        { status: 400 }
      );
    }

    if (
      !html_content ||
      typeof html_content !== "string" ||
      html_content.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "html_content is required" },
        { status: 400 }
      );
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        {
          error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    const insertData: Record<string, unknown> = {
      name: name.trim(),
      subject: subject.trim(),
      html_content,
    };
    if (text_content !== undefined) insertData.text_content = text_content;
    if (category !== undefined) insertData.category = category;
    if (variables !== undefined) insertData.variables = variables;

    const { data, error } = await supabase
      .from("email_templates")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ template: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
