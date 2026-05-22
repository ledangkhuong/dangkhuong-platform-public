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

interface HealthCheck {
  name: string;
  status: "ok" | "warn" | "fail";
  message?: string;
  ms?: number;
}

export async function GET(req: NextRequest) {
  const check = req.nextUrl.searchParams.get("check");

  // Special check: stuck orders
  if (check === "orders") {
    return checkStuckOrders();
  }

  const checks: HealthCheck[] = [];
  const start = Date.now();

  // 1. Database connectivity
  try {
    const t0 = Date.now();
    const supabase = await createAdminClient();
    const { error } = await supabase.from("profiles").select("id").limit(1).single();
    const ms = Date.now() - t0;
    if (error && !error.message.includes("rows")) {
      checks.push({ name: "database", status: "fail", message: error.message, ms });
    } else {
      checks.push({ name: "database", status: ms > 3000 ? "warn" : "ok", ms });
    }
  } catch (err) {
    checks.push({ name: "database", status: "fail", message: err instanceof Error ? err.message : "Connection failed" });
  }

  // 2. SePay webhook configuration
  const sepayKey = process.env.SEPAY_API_KEY || "";
  const sepayAccount = process.env.SEPAY_BANK_ACCOUNT || "";
  const sepayCode = process.env.SEPAY_BANK_CODE || "";
  const sepayPlaceholder = !sepayKey || sepayKey.includes("your-");
  if (sepayPlaceholder) {
    checks.push({ name: "sepay_config", status: "fail", message: "SEPAY_API_KEY is placeholder or missing" });
  } else if (!sepayAccount || !sepayCode) {
    checks.push({ name: "sepay_config", status: "warn", message: "SEPAY_BANK_ACCOUNT or SEPAY_BANK_CODE missing" });
  } else {
    checks.push({ name: "sepay_config", status: "ok" });
  }

  // 3. Email service (Resend)
  const resendKey = process.env.RESEND_API_KEY || "";
  if (!resendKey || resendKey.includes("your-") || resendKey.includes("re_placeholder")) {
    checks.push({ name: "email_service", status: "warn", message: "RESEND_API_KEY not configured" });
  } else {
    checks.push({ name: "email_service", status: "ok" });
  }

  // 4. Supabase auth (check env vars)
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const sbServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!sbUrl || !sbServiceKey) {
    checks.push({ name: "supabase_auth", status: "fail", message: "Supabase env vars missing" });
  } else {
    checks.push({ name: "supabase_auth", status: "ok" });
  }

  // 5. Check for stuck orders (pending > 15 min)
  try {
    const supabase = await createAdminClient();
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("created_at", fifteenMinAgo);

    if ((count ?? 0) > 0) {
      checks.push({ name: "stuck_orders", status: "warn", message: `${count} orders pending > 15 min` });
    } else {
      checks.push({ name: "stuck_orders", status: "ok" });
    }
  } catch {
    checks.push({ name: "stuck_orders", status: "warn", message: "Could not check stuck orders" });
  }

  // 6. Products exist (check at least 1 published product)
  try {
    const supabase = await createAdminClient();
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("status", "published");

    if ((count ?? 0) === 0) {
      checks.push({ name: "products", status: "warn", message: "No published products found" });
    } else {
      checks.push({ name: "products", status: "ok", message: `${count} published` });
    }
  } catch {
    checks.push({ name: "products", status: "warn", message: "Could not check products" });
  }

  const totalMs = Date.now() - start;
  const hasFail = checks.some((c) => c.status === "fail");
  const hasWarn = checks.some((c) => c.status === "warn");

  return NextResponse.json(
    {
      status: hasFail ? "unhealthy" : hasWarn ? "degraded" : "healthy",
      timestamp: new Date().toISOString(),
      duration_ms: totalMs,
      checks,
    },
    { status: hasFail ? 503 : 200 }
  );
}

/** Check for stuck/problematic orders and return details */
async function checkStuckOrders() {
  try {
    const supabase = await createAdminClient();
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: stuckOrders } = await supabase
      .from("orders")
      .select("id, order_code, amount, customer_name, customer_email, created_at")
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
