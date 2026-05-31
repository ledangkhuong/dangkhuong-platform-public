/**
 * Server-side coupon validation & claiming for register routes.
 * Uses admin client (no user auth required at validation time).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface CouponResult {
  valid: boolean;
  error?: string;
  coupon_id?: string;
  discount_type?: "percent" | "fixed";
  discount_value?: number;
  discount_amount?: number;
  final_amount?: number;
}

/**
 * Validate a coupon code against the coupons table.
 * Does NOT claim — call claimCoupon() after order creation.
 */
export async function validateCoupon(
  admin: SupabaseClient,
  code: string,
  orderAmount: number,
): Promise<CouponResult> {
  if (!code || typeof code !== "string" || !code.trim()) {
    return { valid: false, error: "Mã giảm giá không hợp lệ" };
  }

  const { data: coupon, error } = await admin
    .from("coupons")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .single();

  if (error || !coupon) {
    return { valid: false, error: "Mã giảm giá không hợp lệ" };
  }

  if (!coupon.is_active) {
    return { valid: false, error: "Mã giảm giá không hợp lệ" };
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { valid: false, error: "Mã giảm giá đã hết hạn" };
  }

  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return { valid: false, error: "Mã giảm giá đã hết lượt sử dụng" };
  }

  if (orderAmount < (coupon.min_order_amount ?? 0)) {
    const min = Number(coupon.min_order_amount).toLocaleString("vi-VN") + "đ";
    return { valid: false, error: `Đơn hàng tối thiểu ${min} để dùng mã này` };
  }

  let discountAmount: number;
  if (coupon.discount_type === "percent") {
    discountAmount = Math.round((orderAmount * coupon.discount_value) / 100);
  } else {
    discountAmount = Math.round(Number(coupon.discount_value));
  }
  discountAmount = Math.min(discountAmount, orderAmount);

  return {
    valid: true,
    coupon_id: coupon.id,
    discount_type: coupon.discount_type,
    discount_value: Number(coupon.discount_value),
    discount_amount: discountAmount,
    final_amount: orderAmount - discountAmount,
  };
}

/**
 * Claim a coupon after order is created (increment used_count + log usage).
 */
export async function claimCoupon(
  admin: SupabaseClient,
  couponId: string,
  userId: string,
  orderId: string,
): Promise<void> {
  // Try atomic RPC first, fall back to manual update
  const { error: rpcError } = await admin.rpc("claim_coupon", {
    p_coupon_id: couponId,
    p_user_id: userId,
    p_order_id: orderId,
  });

  if (rpcError) {
    // Fallback: manual increment + insert
    await admin
      .from("coupons")
      .update({ used_count: admin.rpc("increment_used_count", { coupon_id: couponId }) as unknown as number })
      .eq("id", couponId)
      .catch(() => {
        // Last resort: raw increment
        admin
          .from("coupons")
          .select("used_count")
          .eq("id", couponId)
          .single()
          .then(({ data }) => {
            if (data) {
              admin
                .from("coupons")
                .update({ used_count: (data.used_count || 0) + 1 })
                .eq("id", couponId);
            }
          });
      });

    await admin.from("coupon_usages").insert({
      coupon_id: couponId,
      user_id: userId,
      order_id: orderId,
    }).catch(() => {});
  }
}
