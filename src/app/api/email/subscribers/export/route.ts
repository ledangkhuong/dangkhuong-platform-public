import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET /api/email/subscribers/export — export subscribers as CSV
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!["admin", "manager"].includes(profile?.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const admin = await createAdminClient();
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status") || "";
    const listId = searchParams.get("list_id") || "";

    let subscribers: Record<string, unknown>[] = [];

    if (listId) {
      // Filter by list
      let query = admin
        .from("subscriber_list_members")
        .select(
          "subscribers!inner(email, full_name, phone, status, source, subscribed_at)"
        )
        .eq("list_id", listId);

      if (status) {
        query = query.eq("subscribers.status", status);
      }

      const { data, error } = await query;
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });

      subscribers = (data || []).map(
        (row: Record<string, unknown>) =>
          row.subscribers as Record<string, unknown>
      );
    } else {
      // All subscribers
      let query = admin
        .from("subscribers")
        .select("email, full_name, phone, status, source, subscribed_at");

      if (status) {
        query = query.eq("status", status);
      }

      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });

      subscribers = data || [];
    }

    // Build CSV
    const csvHeader = "email,full_name,phone,status,source,subscribed_at";
    const csvRows = subscribers.map((s) =>
      [
        escapeCSV(String(s.email || "")),
        escapeCSV(String(s.full_name || "")),
        escapeCSV(String(s.phone || "")),
        escapeCSV(String(s.status || "")),
        escapeCSV(String(s.source || "")),
        escapeCSV(String(s.subscribed_at || "")),
      ].join(",")
    );

    const csv = [csvHeader, ...csvRows].join("\n");
    const timestamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="subscribers-${timestamp}.csv"`,
      },
    });
  } catch (err) {
    console.error("GET /api/email/subscribers/export error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Escape a value for CSV: wrap in quotes if it contains commas, quotes, or newlines.
 */
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
