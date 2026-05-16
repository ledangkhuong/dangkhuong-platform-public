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
  const searchParams = req.nextUrl.searchParams;
  const groupBy = searchParams.get("groupBy") || "day";

  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const from = searchParams.get("from") || defaultFrom.toISOString();
  const to = searchParams.get("to") || now.toISOString();

  // Query orders with adminClient (bypasses RLS)
  const adminClient = await createAdminClient();

  const { data: orders, error: queryError } = await adminClient
    .from("orders")
    .select("paid_at, total")
    .eq("status", "paid")
    .gte("paid_at", from)
    .lte("paid_at", to)
    .order("paid_at", { ascending: true });

  if (queryError) {
    return NextResponse.json(
      { error: "Failed to fetch revenue data" },
      { status: 500 }
    );
  }

  // Group results by day or month
  const grouped = new Map<string, { revenue: number; orders: number }>();

  for (const order of orders || []) {
    const date = new Date(order.paid_at);
    let key: string;

    if (groupBy === "month") {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      key = `${year}-${month}`;
    } else {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      key = `${year}-${month}-${day}`;
    }

    const existing = grouped.get(key) || { revenue: 0, orders: 0 };
    existing.revenue += order.total;
    existing.orders += 1;
    grouped.set(key, existing);
  }

  const result = Array.from(grouped.entries()).map(([date, data]) => ({
    date,
    revenue: data.revenue,
    orders: data.orders,
  }));

  return NextResponse.json(result);
}
