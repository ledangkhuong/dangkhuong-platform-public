import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { vnDayKey, vnRangeToUtc } from "@/lib/vn-time";

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

    // Parse date range from query params. `from`/`to` are VN calendar days.
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") || vnDayKey(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = searchParams.get("to") || vnDayKey(Date.now());

    // Current VN day window [from 00:00, to 24:00) as UTC instants (half-open).
    const { startUtc, endUtc } = vnRangeToUtc(from, to);

    // Previous period of the same length, ending where the current one starts.
    const startMs = new Date(startUtc).getTime();
    const periodLength = new Date(endUtc).getTime() - startMs;
    const prevFrom = new Date(startMs - periodLength).toISOString();
    const prevTo = startUtc; // exclusive end = current window's start

    // Use admin client to bypass RLS for data queries
    const adminClient = await createAdminClient();

    // Current period: total revenue
    const { data: revenueData } = await adminClient
      .from("orders")
      .select("amount")
      .eq("status", "paid")
      .gte("paid_at", startUtc)
      .lt("paid_at", endUtc);

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
      .lt("paid_at", prevTo);

    const prevRevenue = (prevRevenueData || []).reduce(
      (sum, order) => sum + (order.amount || 0),
      0
    );
    const prevOrders = (prevRevenueData || []).length;

    // Current period: new users
    const { count: newUsers } = await adminClient
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startUtc)
      .lt("created_at", endUtc);

    // Previous period: new users
    const { count: prevUsers } = await adminClient
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", prevFrom)
      .lt("created_at", prevTo);

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
