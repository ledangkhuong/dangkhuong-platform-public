import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/email/lists — list all email lists with subscriber counts
export async function GET() {
  try {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("email_lists")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ lists: data });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/email/lists — create a new email list
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, color } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    const insertData: Record<string, unknown> = { name: name.trim() };
    if (description !== undefined) insertData.description = description;
    if (color !== undefined) insertData.color = color;

    const { data, error } = await supabase
      .from("email_lists")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ list: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
