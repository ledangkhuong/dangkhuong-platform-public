import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/payos/cancel
 *
 * PayOS redirect URL khi người dùng huỷ thanh toán.
 * Cập nhật ghi chú đơn hàng và redirect về trang khoá học.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("order_id");

  if (orderId) {
    try {
      const admin = await createAdminClient();

      // Fetch order to get product_id for redirect
      const { data: order } = await admin
        .from("orders")
        .select("id, product_id, status, products(slug)")
        .eq("id", orderId)
        .single();

      if (order && order.status === "pending") {
        await admin
          .from("orders")
          .update({
            note: "Nguoi dung huy thanh toan PayOS",
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id);
      }

      // Redirect to the product page if we know the slug
      const products = order?.products as unknown as Record<string, unknown> | null;
      if (products?.slug) {
        const baseUrl =
          process.env.NEXT_PUBLIC_SITE_URL || "https://dangkhuong.com";
        return NextResponse.redirect(`${baseUrl}/khoa-hoc/${products.slug}`);
      }
    } catch (err) {
      console.error("[PayOS Cancel] Error:", err);
    }
  }

  // Fallback: redirect to homepage
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://dangkhuong.com";
  return NextResponse.redirect(`${baseUrl}/khoa-hoc`);
}
