import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { calculateExpiryDate } from "@/lib/subscription";
import type { BillingPeriod } from "@/lib/subscription";

/**
 * POST: Confirm subscription payment
 *
 * Called after payment is confirmed (by webhook or manual admin action).
 * This endpoint is intended to be called by the sepay/payos webhooks
 * when an order with payment_method "subscription" is confirmed,
 * or by admin manually confirming the order.
 *
 * Security: requires either a valid internal webhook secret OR admin role.
 *
 * Body: { order_id: string }
 */
export async function POST(req: NextRequest) {
  try {
    // ── Auth guard: only internal webhooks or admins can call this ──
    const internalSecret = process.env.INTERNAL_WEBHOOK_SECRET;
    const authHeader = req.headers.get("authorization") || "";
    let isInternalCall = false;
    if (internalSecret) {
      const expected = Buffer.from(`Bearer ${internalSecret}`, "utf-8");
      const received = Buffer.from(authHeader, "utf-8");
      isInternalCall =
        expected.length === received.length &&
        timingSafeEqual(expected, received);
    }

    if (!isInternalCall) {
      // Fall back to admin auth check
      const supabaseAuth = await createClient();
      const {
        data: { user },
      } = await supabaseAuth.auth.getUser();
      if (!user) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
      const { data: profile } = await supabaseAuth
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (!profile || !["admin", "manager"].includes(profile.role)) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    }

    let body: { order_id?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }

    const { order_id } = body;
    if (!order_id) {
      return NextResponse.json(
        { error: "Thiếu order_id" },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // 1. Find the order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Không tìm thấy đơn hàng" },
        { status: 404 }
      );
    }

    // Only process subscription orders
    if (order.payment_method !== "subscription") {
      return NextResponse.json(
        { error: "Đơn hàng không phải gói đăng ký" },
        { status: 400 }
      );
    }

    // 2. Find the pending subscription for this order
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select("*, subscription_plans(*)")
      .eq("order_id", order_id)
      .eq("status", "pending")
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: "Không tìm thấy gói đăng ký chờ xác nhận" },
        { status: 404 }
      );
    }

    const plan = subscription.subscription_plans as Record<string, unknown> | null;
    const billingPeriod = (plan?.billing_period as BillingPeriod) || "monthly";
    const tierGranted = (plan?.tier_granted as string) || "member";

    // 3. Activate the subscription
    const now = new Date();
    const periodEnd = calculateExpiryDate(now, billingPeriod);

    const { error: activateError } = await supabase
      .from("user_subscriptions")
      .update({
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", subscription.id);

    if (activateError) {
      console.error("[Confirm Sub] Activate error:", activateError.message);
      return NextResponse.json(
        { error: "Không thể kích hoạt gói đăng ký" },
        { status: 500 }
      );
    }

    // 4. Cancel any previous active/cancelled subscription for this user
    //    (the new subscription replaces the old one)
    await supabase
      .from("user_subscriptions")
      .update({
        status: "expired",
        updated_at: now.toISOString(),
      })
      .eq("user_id", subscription.user_id)
      .neq("id", subscription.id)
      .in("status", ["active", "cancelled"]);

    // 5. Upgrade user profile tier
    const { error: tierError } = await supabase
      .from("profiles")
      .update({ tier: tierGranted })
      .eq("id", subscription.user_id);

    if (tierError) {
      console.error("[Confirm Sub] Tier upgrade error:", tierError.message);
    }

    // 6. Add XP for subscription purchase
    await supabase.from("xp_events").insert({
      user_id: subscription.user_id,
      action: "purchase",
      xp_amount: 500,
      meta: {
        order_id: order.id,
        subscription_id: subscription.id,
        plan_name: plan?.name,
      },
    });

    // 7. Audit log
    await logAudit({
      admin_id: "system",
      action: "order.confirm" as any,
      target_type: "subscription",
      target_id: subscription.id,
      details: {
        order_id: order.id,
        order_code: order.order_code,
        plan_name: plan?.name,
        billing_period: billingPeriod,
        amount: order.amount,
        source: "subscription_confirm",
      },
    });

    console.log(
      `[Confirm Sub] Activated subscription ${subscription.id} for user ${subscription.user_id} (plan: ${plan?.name})`
    );

    return NextResponse.json({
      success: true,
      subscription_id: subscription.id,
      tier_granted: tierGranted,
      period_end: periodEnd.toISOString(),
    });
  } catch (err) {
    console.error("[Confirm Sub] Error:", err);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
