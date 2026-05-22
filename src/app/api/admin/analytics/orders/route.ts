import { createClient, createAdminClient } from "@/lib/supabase/server";
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

  // Parse query params
  const { searchParams } = new URL(req.url);
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const defaultTo = now.toISOString().split("T")[0];

  const from = searchParams.get("from") || defaultFrom;
  const to = searchParams.get("to") || defaultTo;

  // Query orders using admin client
  const adminClient = await createAdminClient();
  const { data: orders, error: ordersError } = await adminClient
    .from("orders")
    .select("*")
    .gte("created_at", `${from}T00:00:00.000Z`)
    .lte("created_at", `${to}T23:59:59.999Z`);

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
    const date = order.created_at.split("T")[0];
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
