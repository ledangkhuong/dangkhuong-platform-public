import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/orders/check-status?order_code=XXX
 * Public endpoint — no auth required.
 * Landing pages poll this every few seconds to detect when SePay webhook
 * flips the order from "pending" → "paid".
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limit: 30 checks per minute per IP (public/unauthenticated endpoint)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = await rateLimit(`order-check:${ip}`, 30, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retryAfterSec: rl.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const orderCode = req.nextUrl.searchParams.get("order_code");
    if (!orderCode) {
      return NextResponse.json({ error: "order_code required" }, { status: 400 });
    }

    const admin = await createAdminClient();
    const { data, error } = await admin
      .from("orders")
      .select("status")
      .eq("order_code", orderCode)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ status: data.status });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
