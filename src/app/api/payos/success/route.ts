import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/payos/success
 *
 * PayOS redirect URL sau khi thanh toán thành công.
 * KHÔNG xác nhận thanh toán ở đây (webhook xử lý).
 * Chỉ redirect user về trang thành công hoặc trang khoá học.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("order_id");

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://dangkhuong.com";

  if (orderId) {
    try {
      const admin = await createAdminClient();

      const { data: order } = await admin
        .from("orders")
        .select("id, status, product_id, products(slug)")
        .eq("id", orderId)
        .single();

      if (order) {
        const products = order.products as unknown as Record<string, unknown> | null;
        const slug = products?.slug as string | undefined;

        // If order is already paid (webhook was faster), redirect to course
        if (order.status === "paid" && slug) {
          return NextResponse.redirect(`${baseUrl}/khoa-hoc/${slug}?payment=success`);
        }

        // Order still pending — redirect to course page with pending indicator
        // The checkout UI polling will catch the status change
        if (slug) {
          return NextResponse.redirect(`${baseUrl}/khoa-hoc/${slug}?payment=pending`);
        }
      }
    } catch (err) {
      console.error("[PayOS Success] Error:", err);
    }
  }

  // Fallback redirect
  return NextResponse.redirect(`${baseUrl}/khoa-hoc?payment=success`);
}
