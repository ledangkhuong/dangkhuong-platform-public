import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { calculateExpiryDate } from "@/lib/subscription";
import type { BillingPeriod } from "@/lib/subscription";
import { randomBytes } from "crypto";

// Generate a cryptographically random order code for subscriptions
function generateOrderCode(prefix: string = "SUB", length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const maxValid = 256 - (256 % chars.length);
  let result = prefix;
  while (result.length < prefix.length + length) {
    const bytes = randomBytes(length - (result.length - prefix.length));
    for (const byte of bytes) {
      if (byte < maxValid && result.length < prefix.length + length) {
        result += chars[byte % chars.length];
      }
    }
  }
  return result;
}

// ─── POST: Create subscription order ────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitResult = await rateLimit(`subscribe:${ip}`, 5, 60);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimitResult.retryAfterSec) },
        }
      );
    }

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    // Parse body
    let body: {
      plan_id?: string;
      customer_name?: string;
      customer_email?: string;
      customer_phone?: string;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }

    const { plan_id, customer_name, customer_email, customer_phone } = body;

    if (!plan_id) {
      return NextResponse.json(
        { error: "Thiếu plan_id" },
        { status: 400 }
      );
    }

    const admin = await createAdminClient();

    // Fetch plan
    const { data: plan, error: planError } = await admin
      .from("subscription_plans")
      .select("*")
      .eq("id", plan_id)
      .eq("is_active", true)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: "Gói đăng ký không tồn tại hoặc đã ngưng hoạt động" },
        { status: 404 }
      );
    }

    // Check for existing active subscription
    const { data: existingSub } = await admin
      .from("user_subscriptions")
      .select("*, subscription_plans(*)")
      .eq("user_id", user.id)
      .in("status", ["active", "cancelled"])
      .gte("current_period_end", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSub) {
      const existingPlan = existingSub.subscription_plans as Record<string, unknown> | null;
      const existingPrice = (existingPlan?.price as number) ?? 0;
      // Only allow upgrade (higher price plan)
      if (plan.price <= existingPrice) {
        return NextResponse.json(
          {
            error:
              "Bạn đang có gói đăng ký hoạt động. Chỉ có thể nâng cấp lên gói cao hơn.",
          },
          { status: 400 }
        );
      }
    }

    // Create order
    const orderCode = generateOrderCode();
    const amount = plan.price;

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        order_code: orderCode,
        user_id: user.id,
        product_id: null,
        amount,
        status: "pending",
        payment_method: "subscription",
        customer_name: customer_name || user.email,
        customer_email: customer_email || user.email,
        customer_phone: customer_phone || null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      console.error("[Subscribe] Order insert error:", orderError.message);
      return NextResponse.json(
        { error: "Không thể tạo đơn hàng. Vui lòng thử lại." },
        { status: 500 }
      );
    }

    // Create pending subscription
    const now = new Date();
    const periodEnd = calculateExpiryDate(now, plan.billing_period as BillingPeriod);

    const { error: subError } = await admin.from("user_subscriptions").insert({
      user_id: user.id,
      plan_id: plan.id,
      status: "pending",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      order_id: order.id,
      payment_method: "bank_transfer",
      auto_renew: false,
    });

    if (subError) {
      console.error("[Subscribe] Subscription insert error:", subError.message);
      // Cleanup the order
      await admin.from("orders").delete().eq("id", order.id);
      return NextResponse.json(
        { error: "Không thể tạo gói đăng ký. Vui lòng thử lại." },
        { status: 500 }
      );
    }

    // Payment info (same pattern as course purchase)
    const bankAccount = process.env.SEPAY_BANK_ACCOUNT;
    const bankCode = process.env.SEPAY_BANK_CODE;
    const hasSepay = bankAccount && bankCode && !bankAccount.includes("your-");

    const paymentInfo = {
      order_code: orderCode,
      amount: order.amount,
      bank_account: hasSepay ? bankAccount : null,
      bank_code: hasSepay ? bankCode : null,
      transfer_content: `DK${orderCode}`,
      qr_url: hasSepay
        ? `/api/qr?bank=${bankCode}&acc=${bankAccount}&amount=${order.amount}&des=DK${orderCode}`
        : null,
      manual: !hasSepay,
    };

    return NextResponse.json({
      success: true,
      order,
      plan: {
        name: plan.name,
        billing_period: plan.billing_period,
        tier_granted: plan.tier_granted,
      },
      paymentInfo,
    });
  } catch (err: unknown) {
    console.error(
      "[Subscribe] Error:",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      { error: "Không thể tạo đơn hàng. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
