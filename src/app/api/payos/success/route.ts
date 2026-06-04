import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/payos/success
 *
 * PayOS redirect URL sau khi thanh toán thành công.
 * Webhook là nguồn xác nhận chính. Route này chạy post-payment hooks
 * best-effort khi phát hiện order đã paid (giống Sepay):
 *   1. Nếu order_type là physical/mixed → check shipment chưa có
 *      → gọi createShipment(orderId) (đã idempotent bên trong).
 *   2. Gửi email confirmation nếu chưa gửi.
 *
 * Failure không block redirect (best-effort, admin xử lý thủ công).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("order_id");

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://dangkhuong.com";

  if (orderId) {
    try {
      const admin = await createAdminClient();

      const { data: order } = await admin
        .from("orders")
        .select(
          "id, status, order_type, order_code, amount, user_id, customer_email, customer_name, product_id, products(slug, title, name)",
        )
        .eq("id", orderId)
        .single();

      if (order) {
        const products = order.products as unknown as Record<string, unknown> | null;
        const slug = products?.slug as string | undefined;

        // If order is already paid (webhook was faster), run post-payment hooks
        if (order.status === "paid") {
          const orderType = (order as { order_type?: string | null }).order_type ?? null;
          const isPhysical = orderType === "physical" || orderType === "mixed";

          // 1) Best-effort shipment creation cho physical/mixed orders.
          //    createShipment đã idempotent (check shipments table), nhưng ta
          //    vẫn check trước để tránh import/call thừa.
          if (isPhysical) {
            try {
              const { data: existingShipment } = await admin
                .from("shipments")
                .select("id")
                .eq("order_id", order.id as string)
                .neq("status", "cancelled")
                .limit(1)
                .maybeSingle();

              if (!existingShipment) {
                const { createShipment } = await import("@/lib/actions/shipping");
                const res = await createShipment(order.id as string);
                if (!res.ok) {
                  console.warn(
                    `[PayOS Success] createShipment failed for ${order.order_code}: ${res.error}`,
                  );
                } else {
                  console.log(
                    `[PayOS Success] ✅ Shipment created for ${order.order_code}`,
                  );
                }
              }
            } catch (shipErr) {
              console.error("[PayOS Success] Shipment hook error (non-critical):", shipErr);
            }
          }

          // 2) Best-effort email confirmation.
          try {
            const { sendPurchaseConfirmation } = await import("@/lib/email/transactional");
            let email: string | null =
              (order as { customer_email?: string | null }).customer_email ?? null;
            let fullName: string | null =
              (order as { customer_name?: string | null }).customer_name ?? null;

            const userId = (order as { user_id?: string | null }).user_id ?? null;
            if (userId) {
              const { data: profile } = await admin
                .from("profiles")
                .select("full_name")
                .eq("id", userId)
                .single();
              if (profile?.full_name) fullName = profile.full_name as string;
              if (!email) {
                const { data: authUser } = await admin.auth.admin.getUserById(userId);
                if (authUser?.user?.email) email = authUser.user.email;
              }
            }

            if (email) {
              const productName =
                (products?.title as string) ||
                (products?.name as string) ||
                "Sản phẩm";
              await sendPurchaseConfirmation(
                email,
                fullName || "bạn",
                productName,
                (order as { amount: number }).amount,
                (order as { order_code: string }).order_code,
              ).catch((err) =>
                console.error("[PayOS Success] Email error (non-critical):", err),
              );
            }
          } catch (mailErr) {
            console.warn("[PayOS Success] Email confirmation failed (non-critical):", mailErr);
          }

          if (slug) {
            return NextResponse.redirect(`${baseUrl}/khoa-hoc/${slug}?payment=success`);
          }
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
