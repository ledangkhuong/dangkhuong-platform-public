import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/email/lists/[id]/subscribers — list subscribers in this list
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10))
    );
    const search = searchParams.get("search") ?? "";
    const offset = (page - 1) * limit;

    const supabase = await createAdminClient();

    // Build query for members joined with subscribers
    let query = supabase
      .from("subscriber_list_members")
      .select("added_at, subscribers(*)", { count: "exact" })
      .eq("list_id", id)
      .order("added_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Note: search filtering on the joined table requires post-filter
    // or a database function. We'll fetch and let Supabase handle it
    // via the subscribers table if search is provided.
    const { data: members, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let subscribers = (members ?? []).map((m) => ({
      ...m.subscribers,
      added_at: m.added_at,
    }));

    // Client-side search filter if search term provided
    if (search) {
      const term = search.toLowerCase();
      subscribers = subscribers.filter((s: Record<string, unknown>) => {
        const email = (s.email as string) ?? "";
        const name = (s.full_name as string) ?? (s.name as string) ?? "";
        return (
          email.toLowerCase().includes(term) ||
          name.toLowerCase().includes(term)
        );
      });
    }

    return NextResponse.json({
      subscribers,
      total: search ? subscribers.length : (count ?? 0),
      page,
      limit,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/email/lists/[id]/subscribers — add subscribers to this list
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { subscriber_ids } = body;

    if (
      !subscriber_ids ||
      !Array.isArray(subscriber_ids) ||
      subscriber_ids.length === 0
    ) {
      return NextResponse.json(
        { error: "subscriber_ids[] is required" },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Insert members, skip existing via upsert with ignoreDuplicates
    const rows = subscriber_ids.map((sid: string) => ({
      subscriber_id: sid,
      list_id: id,
    }));

    const { data, error } = await supabase
      .from("subscriber_list_members")
      .upsert(rows, { onConflict: "subscriber_id,list_id", ignoreDuplicates: true })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update subscriber_count on the list
    const { count } = await supabase
      .from("subscriber_list_members")
      .select("*", { count: "exact", head: true })
      .eq("list_id", id);

    await supabase
      .from("email_lists")
      .update({ subscriber_count: count ?? 0, updated_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ added: data?.length ?? 0 });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/email/lists/[id]/subscribers — remove subscribers from this list
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { subscriber_ids } = body;

    if (
      !subscriber_ids ||
      !Array.isArray(subscriber_ids) ||
      subscriber_ids.length === 0
    ) {
      return NextResponse.json(
        { error: "subscriber_ids[] is required" },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    const { error } = await supabase
      .from("subscriber_list_members")
      .delete()
      .eq("list_id", id)
      .in("subscriber_id", subscriber_ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update subscriber_count on the list
    const { count } = await supabase
      .from("subscriber_list_members")
      .select("*", { count: "exact", head: true })
      .eq("list_id", id);

    await supabase
      .from("email_lists")
      .update({ subscriber_count: count ?? 0, updated_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ removed: subscriber_ids.length });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
