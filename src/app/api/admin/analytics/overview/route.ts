import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "manager"].includes(profile.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse date range from query params
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const defaultTo = now.toISOString();
    const defaultFrom = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const to = searchParams.get("to") || defaultTo;
    const from = searchParams.get("from") || defaultFrom;

    // Calculate previous period of the same length
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const periodLength = toDate.getTime() - fromDate.getTime();

    const prevTo = fromDate.toISOString();
    const prevFrom = new Date(fromDate.getTime() - periodLength).toISOString();

    // Use admin client to bypass RLS for data queries
    const adminClient = await createAdminClient();

    // Current period: total revenue
    const { data: revenueData } = await adminClient
      .from("orders")
      .select("amount")
      .eq("status", "paid")
      .gte("paid_at", from)
      .lte("paid_at", to);

    const totalRevenue = (revenueData || []).reduce(
      (sum, order) => sum + (order.amount || 0),
      0
    );
    const totalOrders = (revenueData || []).length;

    // Previous period: revenue
    const { data: prevRevenueData } = await adminClient
      .from("orders")
      .select("amount")
      .eq("status", "paid")
      .gte("paid_at", prevFrom)
      .lte("paid_at", prevTo);

    const prevRevenue = (prevRevenueData || []).reduce(
      (sum, order) => sum + (order.amount || 0),
      0
    );
    const prevOrders = (prevRevenueData || []).length;

    // Current period: new users
    const { count: newUsers } = await adminClient
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", from)
      .lte("created_at", to);

    // Previous period: new users
    const { count: prevUsers } = await adminClient
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", prevFrom)
      .lte("created_at", prevTo);

    // Average order value
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const prevAvgOrderValue = prevOrders > 0 ? prevRevenue / prevOrders : 0;

    return NextResponse.json({
      totalRevenue,
      prevRevenue,
      totalOrders,
      prevOrders,
      newUsers: newUsers || 0,
      prevUsers: prevUsers || 0,
      avgOrderValue,
      prevAvgOrderValue,
    });
  } catch (error) {
    console.error("Analytics overview error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
