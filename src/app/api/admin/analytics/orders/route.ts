import { createClient, createAdminClient } from "@/lib/supabase/server";
import { vnDayKey, vnRangeToUtc } from "@/lib/vn-time";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
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

  // Parse query params. `from`/`to` are VN calendar days ("YYYY-MM-DD").
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || vnDayKey(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = searchParams.get("to") || vnDayKey(Date.now());

  // VN day window: [from 00:00, to 24:00) in Asia/Ho_Chi_Minh, as UTC instants.
  const { startUtc, endUtc } = vnRangeToUtc(from, to);

  // Query orders using admin client
  const adminClient = await createAdminClient();
  const { data: orders, error: ordersError } = await adminClient
    .from("orders")
    .select("*")
    .gte("created_at", startUtc)
    .lt("created_at", endUtc);

  if (ordersError) {
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }

  // Status breakdown
  const statuses = ["pending", "paid", "cancelled", "refunded"] as const;
  const statusBreakdown = statuses.map((status) => {
    const filtered = orders.filter((o) => o.status === status);
    const revenue = filtered.reduce(
      (sum, o) => sum + (o.amount || 0),
      0
    );
    return { status, count: filtered.length, revenue };
  });

  // Daily orders
  const dailyMap: Record<
    string,
    { paid: number; pending: number; cancelled: number; refunded: number; total: number }
  > = {};

  for (const order of orders) {
    const date = vnDayKey(order.created_at);
    if (!dailyMap[date]) {
      dailyMap[date] = { paid: 0, pending: 0, cancelled: 0, refunded: 0, total: 0 };
    }
    dailyMap[date][order.status as (typeof statuses)[number]] += 1;
    dailyMap[date].total += 1;
  }

  const dailyOrders = Object.entries(dailyMap)
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Payment methods breakdown
  const methodMap: Record<string, number> = {};
  for (const order of orders) {
    const method = order.payment_method || "unknown";
    methodMap[method] = (methodMap[method] || 0) + 1;
  }

  const paymentMethods = Object.entries(methodMap).map(([method, count]) => ({
    method,
    count,
  }));

  return NextResponse.json({
    statusBreakdown,
    dailyOrders,
    paymentMethods,
  });
}
