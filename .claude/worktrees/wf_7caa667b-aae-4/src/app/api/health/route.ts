import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/health
 * System health check — verifies all critical services.
 * Can be called by uptime monitors (UptimeRobot, BetterUptime, etc.)
 *
 * Returns 200 if all services healthy, 503 if any critical service is down.
 *
 * GET /api/health?check=orders
 * Returns stuck orders (pending > 10 min with no webhook response)
 */

export async function GET(req: NextRequest) {
  const check = req.nextUrl.searchParams.get("check");

  // Special check: stuck orders (requires CRON_SECRET auth)
  if (check === "orders") {
    const authHeader = req.headers.get("authorization");
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return checkStuckOrders();
  }

  // Basic health: only check database connectivity, expose no service config details
  let dbOk = false;
  try {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("profiles").select("id").limit(1).single();
    dbOk = !error || error.message.includes("rows");
  } catch {
    dbOk = false;
  }

  return NextResponse.json(
    {
      status: dbOk ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
    },
    { status: dbOk ? 200 : 503 }
  );
}

/** Check for stuck/problematic orders and return details */
async function checkStuckOrders() {
  try {
    const supabase = await createAdminClient();
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: stuckOrders } = await supabase
      .from("orders")
      .select("order_code, status, amount, created_at")
      .eq("status", "pending")
      .lt("created_at", tenMinAgo)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      count: stuckOrders?.length ?? 0,
      orders: stuckOrders ?? [],
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to check orders" }, { status: 500 });
  }
}
