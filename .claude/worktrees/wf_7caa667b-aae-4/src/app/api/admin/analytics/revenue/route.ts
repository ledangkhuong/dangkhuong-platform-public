import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  vnDayKey,
  vnMonthKey,
  vnRangeToUtc,
  vnDayKeysInRange,
  vnMonthKeysInRange,
} from "@/lib/vn-time";
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
    .select("paid_at, amount, revenue_source")
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

  // Group by day/month, splitting platform cash vs external grants.
  //   platform — revenue_source null/'platform' (real cash through the website)
  //   external — revenue_source 'external' (paid via FB/bank/cash, granted here)
  //   comp     — free access, contributes no revenue (still counted as an order)
  type Bucket = {
    revenue_platform: number;
    revenue_external: number;
    orders: number;
  };
  const grouped = new Map<string, Bucket>();

  // Pre-seed every VN day/month in the range so the chart shows the full period
  // (days/months with no revenue render as 0 rather than being skipped).
  const allKeys =
    groupBy === "month"
      ? vnMonthKeysInRange(from, to)
      : vnDayKeysInRange(from, to);
  for (const k of allKeys) {
    grouped.set(k, { revenue_platform: 0, revenue_external: 0, orders: 0 });
  }

  for (const order of orders || []) {
    // Bucket by VN day/month (00:00 → 24:00 Asia/Ho_Chi_Minh).
    const key =
      groupBy === "month" ? vnMonthKey(order.paid_at) : vnDayKey(order.paid_at);

    const e = grouped.get(key) || {
      revenue_platform: 0,
      revenue_external: 0,
      orders: 0,
    };
    const amt = order.amount || 0;
    const src = order.revenue_source ?? "platform";
    if (src === "external") e.revenue_external += amt;
    else if (src === "comp") {
      /* free access — no cash */
    } else e.revenue_platform += amt;
    e.orders += 1;
    grouped.set(key, e);
  }

  const result = Array.from(grouped.entries()).map(([date, d]) => ({
    date,
    // `revenue` = total cash (platform + external) for back-compat with any
    // consumer reading the single field; the split fields drive the chart.
    revenue: d.revenue_platform + d.revenue_external,
    revenue_platform: d.revenue_platform,
    revenue_external: d.revenue_external,
    orders: d.orders,
  }));

  return NextResponse.json(result);
}
