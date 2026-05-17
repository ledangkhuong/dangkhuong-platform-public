import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET /api/email/subscribers — list subscribers with pagination, filtering, search
export async function GET(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Role check
    const admin = await createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["admin", "manager"].includes(profile.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "";
    const listId = searchParams.get("list_id") || "";
    const sortBy = searchParams.get("sort_by") || "created_at";
    const sortOrder = searchParams.get("sort_order") || "desc";
    const offset = (page - 1) * limit;

    const allowedSortColumns = [
      "created_at",
      "updated_at",
      "email",
      "full_name",
      "subscribed_at",
    ];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : "created_at";
    const ascending = sortOrder === "asc";

    if (listId) {
      // Join with subscriber_list_members to filter by list
      let query = admin
        .from("subscriber_list_members")
        .select(
          "subscriber_id, subscribers!inner(id, email, full_name, phone, status, source, tags, metadata, user_id, subscribed_at, unsubscribed_at, created_at, updated_at)",
          { count: "exact" }
        )
        .eq("list_id", listId);

      if (search) {
        query = query.or(
          `email.ilike.%${search}%,full_name.ilike.%${search}%`,
          { referencedTable: "subscribers" }
        );
      }
      if (status) {
        query = query.eq("subscribers.status", status);
      }

      query = query
        .order(safeSortBy, { referencedTable: "subscribers", ascending })
        .range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) {
        console.error("Subscriber list query error:", error.message);
        return NextResponse.json({ error: "Failed to fetch subscribers" }, { status: 500 });
      }

      const total = count || 0;
      const subscribers = (data || []).map(
        (row: Record<string, unknown>) => row.subscribers
      );

      return NextResponse.json({
        subscribers,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    }

    // Standard query without list filter
    let query = admin
      .from("subscribers")
      .select("*", { count: "exact" });

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }
    if (status) {
      query = query.eq("status", status);
    }

    query = query
      .order(safeSortBy, { ascending })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) {
      console.error("Subscriber query error:", error.message);
      return NextResponse.json({ error: "Failed to fetch subscribers" }, { status: 500 });
    }

    const total = count || 0;

    // Fetch stats (total counts by status)
    const [
      { count: activeCount },
      { count: unsubscribedCount },
      { count: bouncedCount },
    ] = await Promise.all([
      admin.from("subscribers").select("id", { count: "exact", head: true }).eq("status", "active"),
      admin.from("subscribers").select("id", { count: "exact", head: true }).eq("status", "unsubscribed"),
      admin.from("subscribers").select("id", { count: "exact", head: true }).eq("status", "bounced"),
    ]);

    const stats = {
      total: (activeCount || 0) + (unsubscribedCount || 0) + (bouncedCount || 0),
      active: activeCount || 0,
      unsubscribed: unsubscribedCount || 0,
      bounced: bouncedCount || 0,
    };

    return NextResponse.json({
      subscribers: data || [],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats,
    });
  } catch (err) {
    console.error("GET /api/email/subscribers error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/email/subscribers — create a single subscriber
export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Role check
    const admin = await createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["admin", "manager"].includes(profile.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { email, full_name, phone, status, tags, list_ids } = body;

    // Validate email
    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check for duplicate
    const { data: existing } = await admin
      .from("subscribers")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "A subscriber with this email already exists" },
        { status: 409 }
      );
    }

    // Insert subscriber
    const subscriberData: Record<string, unknown> = {
      email: email.trim().toLowerCase(),
      full_name: full_name?.trim() || null,
      phone: phone?.trim() || null,
      status: status || "active",
      source: "manual",
      tags: tags || [],
      subscribed_at: new Date().toISOString(),
    };

    const { data: subscriber, error: insertError } = await admin
      .from("subscribers")
      .insert(subscriberData)
      .select()
      .single();

    if (insertError) {
      console.error("Subscriber insert error:", insertError.message);
      return NextResponse.json(
        { error: "Failed to create subscriber" },
        { status: 500 }
      );
    }

    // Add to lists if provided
    if (list_ids && Array.isArray(list_ids) && list_ids.length > 0) {
      const listMembers = list_ids.map((listId: string) => ({
        subscriber_id: subscriber.id,
        list_id: listId,
        added_at: new Date().toISOString(),
      }));

      const { error: listError } = await admin
        .from("subscriber_list_members")
        .insert(listMembers);

      if (listError) {
        console.error("Error adding subscriber to lists:", listError.message);
      }
    }

    return NextResponse.json({ subscriber }, { status: 201 });
  } catch (err) {
    console.error("POST /api/email/subscribers error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
