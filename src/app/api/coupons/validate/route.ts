/*
 * ─── SQL TO RUN IN SUPABASE ─────────────────────────────────────────────────
 *
 * -- Coupons table
 * CREATE TABLE coupons (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   code TEXT UNIQUE NOT NULL,
 *   discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
 *   discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
 *   max_uses INTEGER DEFAULT NULL,
 *   used_count INTEGER DEFAULT 0,
 *   min_order_amount NUMERIC DEFAULT 0,
 *   expires_at TIMESTAMPTZ DEFAULT NULL,
 *   is_active BOOLEAN DEFAULT true,
 *   created_at TIMESTAMPTZ DEFAULT now()
 * );
 *
 * -- Coupon usage tracking
 * CREATE TABLE coupon_usages (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
 *   user_id UUID NOT NULL,
 *   order_id UUID NOT NULL,
 *   created_at TIMESTAMPTZ DEFAULT now()
 * );
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 10 requests per minute per IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const rl = await rateLimit(`coupon-validate:${ip}`, 10, 60);
    if (!rl.allowed) {
      return Response.json(
        { valid: false, error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json(
        { valid: false, error: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    // Parse body
    let body: { code?: string; order_amount?: number };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { valid: false, error: "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }

    const { code, order_amount } = body;

    if (!code || typeof code !== "string") {
      return Response.json(
        { valid: false, error: "Vui lòng nhập mã giảm giá" },
        { status: 400 }
      );
    }

    if (typeof order_amount !== "number" || order_amount <= 0) {
      return Response.json(
        { valid: false, error: "Số tiền đơn hàng không hợp lệ" },
        { status: 400 }
      );
    }

    // Look up coupon (bypass RLS)
    const admin = await createAdminClient();
    const { data: coupon, error: couponError } = await admin
      .from("coupons")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .single();

    if (couponError || !coupon) {
      return Response.json(
        { valid: false, error: "Mã giảm giá không tồn tại" },
        { status: 200 }
      );
    }

    // Check is_active
    if (!coupon.is_active) {
      return Response.json(
        { valid: false, error: "Mã giảm giá đã bị vô hiệu hoá" },
        { status: 200 }
      );
    }

    // Check expiry
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return Response.json(
        { valid: false, error: "Mã giảm giá đã hết hạn" },
        { status: 200 }
      );
    }

    // Check usage limit
    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      return Response.json(
        { valid: false, error: "Mã giảm giá đã hết lượt sử dụng" },
        { status: 200 }
      );
    }

    // Check min order amount
    if (order_amount < (coupon.min_order_amount ?? 0)) {
      const minFormatted =
        Number(coupon.min_order_amount).toLocaleString("vi-VN") + "đ";
      return Response.json(
        {
          valid: false,
          error: `Đơn hàng tối thiểu ${minFormatted} để sử dụng mã này`,
        },
        { status: 200 }
      );
    }

    // Calculate discount
    let discount_amount: number;
    if (coupon.discount_type === "percent") {
      discount_amount = Math.round((order_amount * coupon.discount_value) / 100);
    } else {
      // fixed
      discount_amount = Math.round(Number(coupon.discount_value));
    }

    // Ensure discount does not exceed order amount
    discount_amount = Math.min(discount_amount, order_amount);
    const final_amount = order_amount - discount_amount;

    return Response.json({
      valid: true,
      discount_type: coupon.discount_type,
      discount_value: Number(coupon.discount_value),
      discount_amount,
      final_amount,
    });
  } catch (err) {
    console.error("[Coupon Validate] Error:", err);
    return Response.json(
      { valid: false, error: "Lỗi hệ thống. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
