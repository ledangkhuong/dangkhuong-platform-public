import { createClient, createAdminClient } from "@/lib/supabase/server";
import { vnDayKey, vnMonthKey, vnRangeToUtc } from "@/lib/vn-time";
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

  // `from`/`to` are VN calendar days ("YYYY-MM-DD").
  const from = searchParams.get("from") || vnDayKey(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = searchParams.get("to") || vnDayKey(Date.now());

  // VN day window: [from 00:00, to 24:00) in Asia/Ho_Chi_Minh, as UTC instants.
  const { startUtc, endUtc } = vnRangeToUtc(from, to);

  // Query orders with adminClient (bypasses RLS)
  const adminClient = await createAdminClient();

  const { data: orders, error: queryError } = await adminClient
    .from("orders")
    .select("paid_at, amount")
    .eq("status", "paid")
    .gte("paid_at", startUtc)
    .lt("paid_at", endUtc)
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
    // Bucket by VN day/month (00:00 → 24:00 Asia/Ho_Chi_Minh).
    const key =
      groupBy === "month" ? vnMonthKey(order.paid_at) : vnDayKey(order.paid_at);

    const existing = grouped.get(key) || { revenue: 0, orders: 0 };
    existing.revenue += order.amount || 0;
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
