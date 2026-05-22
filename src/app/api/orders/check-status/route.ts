import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/orders/check-status?order_code=XXX
 * Public endpoint — no auth required.
 * Landing pages poll this every few seconds to detect when SePay webhook
 * flips the order from "pending" → "paid".
 */
export async function GET(req: NextRequest) {
  try {
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
