import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";
import { rateLimit } from "@/lib/rate-limit";
import { isPayOSConfigured } from "@/lib/payos";
import { getStickyAssignment } from "@/lib/sticky-assign";

// Generate a cryptographically random order code
// Format: DK + 12 random alphanumeric chars (e.g., "DKa3Bf9Kx2Mn")
// This gives 62^12 ≈ 3.2 × 10^21 possible codes - practically unguessable
function generateOrderCode(prefix: string = "DK", length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const maxValid = 256 - (256 % chars.length); // reject values >= this to avoid modulo bias
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

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    const rateLimitResult = await rateLimit(`orders:${ip}`, 10, 60);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
        { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfterSec) } }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { product_id, customer_name, customer_email, customer_phone, coupon_code } = body;

    if (!product_id) {
      return NextResponse.json({ error: "Thiếu product_id" }, { status: 400 });
    }

    // Validate product_id is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(product_id)) {
      return NextResponse.json({ error: "product_id không hợp lệ" }, { status: 400 });
    }

    // Validate customer_name if provided
    if (customer_name && (typeof customer_name !== "string" || customer_name.length > 200)) {
      return NextResponse.json({ error: "Tên khách hàng không hợp lệ (tối đa 200 ký tự)" }, { status: 400 });
    }

    // Validate customer_email if provided
    if (customer_email) {
      if (typeof customer_email !== "string" || customer_email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) {
        return NextResponse.json({ error: "Email không hợp lệ" }, { status: 400 });
      }
    }

    // Validate customer_phone if provided
    if (customer_phone) {
      if (typeof customer_phone !== "string" || customer_phone.length > 20 || !/^[\d+\s]+$/.test(customer_phone)) {
        return NextResponse.json({ error: "Số điện thoại không hợp lệ (chỉ chấp nhận số, dấu + và khoảng trắng, tối đa 20 ký tự)" }, { status: 400 });
      }
    }

    // Lấy thông tin sản phẩm (dùng admin client để tránh RLS issues)
    const admin = await createAdminClient();

    const { data: product, error: productError } = await admin
      .from("products").select("*").eq("id", product_id).single();

    if (productError || !product) {
      console.error("[Create Order] Product lookup error:", productError?.message);
      return NextResponse.json({
        error: "Không tìm thấy sản phẩm"
      }, { status: 404 });
    }

    // Nếu miễn phí → enroll ngay
    if (product.price === 0) {
      await admin.from("enrollments").upsert({
        user_id: user.id,
        product_id,
        source: "free"
      }, { onConflict: "user_id,product_id" });
      return NextResponse.json({ success: true, free: true });
    }

    const orderCode = generateOrderCode();
    const baseAmount = product.sale_price || product.price;

    if (!baseAmount || baseAmount <= 0) {
      return NextResponse.json({ error: "Sản phẩm không có giá hợp lệ" }, { status: 400 });
    }

    // ── Coupon discount ─────────────────────────────────────────
    let amount = baseAmount;
    let appliedCouponId: string | null = null;
    let appliedCouponCode: string | null = null;
    let appliedCouponUsedCount: number | null = null;

    if (coupon_code && typeof coupon_code === "string") {
      const normalizedCode = coupon_code.trim().toUpperCase();

      const { data: coupon, error: couponError } = await admin
        .from("coupons")
        .select("*")
        .eq("code", normalizedCode)
        .single();

      if (couponError || !coupon) {
        return NextResponse.json({ error: "Mã giảm giá không tồn tại" }, { status: 400 });
      }

      if (!coupon.is_active) {
        return NextResponse.json({ error: "Mã giảm giá đã bị vô hiệu hoá" }, { status: 400 });
      }

      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return NextResponse.json({ error: "Mã giảm giá đã hết hạn" }, { status: 400 });
      }

      if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
        return NextResponse.json({ error: "Mã giảm giá đã hết lượt sử dụng" }, { status: 400 });
      }

      if (baseAmount < (coupon.min_order_amount ?? 0)) {
        return NextResponse.json({ error: "Đơn hàng không đạt giá trị tối thiểu để sử dụng mã này" }, { status: 400 });
      }

      // Calculate discount
      let discountAmount: number;
      if (coupon.discount_type === "percent") {
        discountAmount = Math.round((baseAmount * coupon.discount_value) / 100);
      } else {
        // fixed
        discountAmount = Math.round(Number(coupon.discount_value));
      }

      discountAmount = Math.min(discountAmount, baseAmount);
      amount = Math.max(baseAmount - discountAmount, 0);
      appliedCouponId = coupon.id;
      appliedCouponCode = normalizedCode;
      appliedCouponUsedCount = coupon.used_count ?? 0;
    }

    // ── Reuse existing pending order for same user + product ──────
    // This prevents duplicate pending orders when customer clicks "Buy" multiple times
    const { data: existingOrder } = await admin
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .eq("product_id", product_id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existingOrder) {
      // If amount matches (same price/coupon), reuse the existing order
      // If amount changed (new coupon), cancel old and create new below
      if (existingOrder.amount === amount) {
        const bankAccount = process.env.SEPAY_BANK_ACCOUNT;
        const bankCode = process.env.SEPAY_BANK_CODE;
        const hasSepay = !!(bankAccount && bankCode && !bankAccount.includes("your-"));
        const hasPayOS = isPayOSConfigured();

        return NextResponse.json({
          success: true,
          order: existingOrder,
          paymentInfo: {
            order_code: existingOrder.order_code,
            amount: existingOrder.amount,
            bank_account: hasSepay ? bankAccount : null,
            bank_code: hasSepay ? bankCode : null,
            transfer_content: existingOrder.order_code,
            qr_url: hasSepay
              ? `/api/qr?bank=${bankCode}&acc=${bankAccount}&amount=${existingOrder.amount}&des=${existingOrder.order_code}`
              : null,
            manual: !hasSepay && !hasPayOS,
            sepay_available: hasSepay,
            payos_available: hasPayOS,
          },
        });
      }

      // Amount differs — cancel old pending order
      await admin
        .from("orders")
        .update({ status: "cancelled", note: "Replaced by new order with different amount", updated_at: new Date().toISOString() })
        .eq("id", existingOrder.id);
    }

    // Đọc affiliate ref_code từ cookie dk_ref
    let refCode = req.cookies.get("dk_ref")?.value?.toUpperCase() || null;

    // Prevent self-referral
    if (refCode) {
      const { data: affiliate } = await admin
        .from("affiliates")
        .select("user_id")
        .eq("ref_code", refCode)
        .eq("status", "active")
        .single();
      if (affiliate?.user_id === user.id) {
        refCode = null; // Don't allow self-referral
      }
    }

    // Sticky sale assignment — inherit assigned_to from the customer's CRM
    // contact (if any) so a buyer always reaches the same sale rep. Fail-soft.
    let stickyAssignedTo: string | null = null;
    try {
      stickyAssignedTo = await getStickyAssignment(admin, {
        email: customer_email || user.email || null,
        user_id: user.id,
      });
    } catch (stickyErr) {
      console.error(
        "[Create Order] Sticky-assign lookup failed:",
        stickyErr instanceof Error ? stickyErr.message : stickyErr
      );
    }

    // Tạo đơn hàng (kèm ref_code và coupon_code nếu có)
    const { data: order, error: orderError } = await admin.from("orders").insert({
      order_code: orderCode,
      user_id: user.id,
      product_id,
      amount,
      status: "pending",
      payment_method: "bank_transfer",
      customer_name: customer_name || user.email,
      customer_email: customer_email || user.email,
      customer_phone: customer_phone || null,
      ref_code: refCode,
      ...(appliedCouponCode ? { coupon_code: appliedCouponCode } : {}),
      ...(stickyAssignedTo ? { assigned_to: stickyAssignedTo } : {}),
    }).select().single();

    if (orderError) {
      console.error("[Create Order] Insert error:", orderError.message);
      return NextResponse.json({
        error: "Không thể tạo đơn hàng. Vui lòng thử lại."
      }, { status: 500 });
    }

    // Increment coupon used_count and record usage
    if (appliedCouponId && appliedCouponUsedCount !== null && order) {
      await Promise.all([
        admin
          .from("coupons")
          .update({ used_count: appliedCouponUsedCount + 1 })
          .eq("id", appliedCouponId),
        admin
          .from("coupon_usages")
          .insert({
            coupon_id: appliedCouponId,
            user_id: user.id,
            order_id: order.id,
          }),
      ]);
    }

    // Thông tin thanh toán
    const bankAccount = process.env.SEPAY_BANK_ACCOUNT;
    const bankCode = process.env.SEPAY_BANK_CODE;
    const hasSepay = !!(bankAccount && bankCode && !bankAccount.includes("your-"));
    const hasPayOS = isPayOSConfigured();

    const paymentInfo = {
      order_code: orderCode,
      amount: order.amount,
      bank_account: hasSepay ? bankAccount : null,
      bank_code: hasSepay ? bankCode : null,
      transfer_content: orderCode,
      qr_url: hasSepay
        ? `/api/qr?bank=${bankCode}&acc=${bankAccount}&amount=${order.amount}&des=${orderCode}`
        : null,
      manual: !hasSepay && !hasPayOS,
      sepay_available: hasSepay,
      payos_available: hasPayOS,
    };

    return NextResponse.json({ success: true, order, paymentInfo });
  } catch (err: unknown) {
    console.error("[Create Order] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Không thể tạo đơn hàng. Vui lòng thử lại." }, { status: 500 });
  }
}
