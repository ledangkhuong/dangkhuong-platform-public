import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * ONE-TIME FIX: Correct paid_at timezone for Sepay webhook orders.
 * Sepay sent Vietnam local time (UTC+7) but it was stored as UTC,
 * causing all payment times to display +7h off.
 *
 * DELETE THIS FILE after running once.
 */
export async function POST(req: NextRequest) {
  // Auth check - admin only
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = await createAdminClient();

  // Find all orders confirmed via Sepay (have sepay_txn_id) with paid_at
  const { data: orders, error: fetchErr } = await admin
    .from("orders")
    .select("id, order_code, paid_at, sepay_txn_id")
    .not("sepay_txn_id", "is", null)
    .not("paid_at", "is", null);

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  let fixed = 0;
  const details: { order_code: string; old: string; new: string }[] = [];

  for (const order of orders ?? []) {
    if (!order.paid_at) continue;

    // Subtract 7 hours from the stored time
    const oldDate = new Date(order.paid_at);
    const newDate = new Date(oldDate.getTime() - 7 * 60 * 60 * 1000);
    const newISO = newDate.toISOString();

    const { error: updateErr } = await admin
      .from("orders")
      .update({ paid_at: newISO })
      .eq("id", order.id);

    if (!updateErr) {
      fixed++;
      details.push({
        order_code: order.order_code,
        old: order.paid_at,
        new: newISO,
      });
    }
  }

  return NextResponse.json({
    success: true,
    message: `Fixed ${fixed} orders`,
    total_found: (orders ?? []).length,
    fixed,
    details,
  });
}
