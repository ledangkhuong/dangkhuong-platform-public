import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { verifyWebhookSignature } from "@/lib/payos";

/**
 * POST /api/payos/webhook
 *
 * PayOS gọi endpoint này khi thanh toán thành công/thất bại.
 * Xác thực webhook bằng HMAC signature, rồi xử lý đơn hàng tương tự SePay webhook.
 *
 * PayOS webhook payload:
 * {
 *   code: "00",       // "00" = success
 *   desc: string,
 *   data: {
 *     orderCode: number,
 *     amount: number,
 *     description: string,
 *     accountNumber: string,
 *     reference: string,
 *     transactionDateTime: string,
 *     currency: string,
 *     paymentLinkId: string,
 *     code: string,
 *     desc: string,
 *     counterAccountBankId: string,
 *     counterAccountBankName: string,
 *     counterAccountName: string,
 *     counterAccountNumber: string,
 *     virtualAccountName: string,
 *     virtualAccountNumber: string,
 *   },
 *   signature: string,
 * }
 */
export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    console.log("[PayOS Webhook] Received:", {
      code: body.code,
      orderCode: body.data?.orderCode,
      amount: body.data?.amount,
    });

    const { code, data, signature } = body;

    // 1. Verify webhook signature
    if (!data || !signature) {
      console.error("[PayOS] Missing data or signature");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    if (!verifyWebhookSignature(data, signature)) {
      console.error("[PayOS] Signature verification failed");
      logAudit({
        admin_id: "system",
        action: "webhook.auth_failed" as any,
        target_type: "webhook",
        target_id: "payos",
        details: {
          ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
          orderCode: data.orderCode,
        },
      }).catch((err) => console.error("[PayOS Webhook] Non-critical error:", err));
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 2. Only process successful payments
    if (code !== "00") {
      console.log(`[PayOS] Non-success code: ${code}, skipping`);
      return NextResponse.json({ success: true, message: "Non-success code" });
    }

    const { orderCode, amount: payosAmount, reference, transactionDateTime } = data;

    if (!orderCode) {
      console.warn("[PayOS] No orderCode in webhook data");
      return NextResponse.json({ success: true, message: "No orderCode" });
    }

    // 3. Find order by payos_order_code
    const supabase = await createAdminClient();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, products(*)")
      .eq("payos_order_code", orderCode)
      .single();

    if (orderError || !order) {
      console.error(`[PayOS] Order not found for payos_order_code: ${orderCode}`);
      return NextResponse.json({ success: true, message: "Order not found" });
    }

    console.log(`[PayOS] Found order ${order.order_code} (status: ${order.status})`);

    // Only process pending orders
    if (order.status !== "pending") {
      console.log(`[PayOS] Order ${order.order_code} status is '${order.status}', skipping`);
      return NextResponse.json({ success: true, message: `Order status is ${order.status}` });
    }

    // 4. Verify amount
    if (payosAmount < order.amount) {
      console.warn(`[PayOS] Amount mismatch: expected ${order.amount}, got ${payosAmount}`);
      await supabase.from("orders").update({
        note: `PayOS: thiếu tiền - cần ${order.amount}đ, nhận ${payosAmount}đ`,
        updated_at: new Date().toISOString(),
      }).eq("id", order.id);
      return NextResponse.json({ success: true, message: "Amount mismatch" });
    }

    // 5. Update order to PAID
    let paidAt: string;
    try {
      paidAt = transactionDateTime
        ? new Date(transactionDateTime).toISOString()
        : new Date().toISOString();
    } catch {
      paidAt = new Date().toISOString();
    }

    const { data: updatedOrder, error: updateErr } = await supabase
      .from("orders")
      .update({
        status: "paid",
        payment_method: "payos",
        paid_at: paidAt,
        note: `PayOS ref: ${reference || "N/A"}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("status", "pending") // Prevent race condition
      .select()
      .single();

    if (!updatedOrder || updateErr) {
      console.log(`[PayOS] Order ${order.order_code} already processed (race condition prevented)`);
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    // Audit log
    await logAudit({
      admin_id: "system",
      action: "order.confirm" as any,
      target_type: "order",
      target_id: order.id,
      details: {
        order_code: order.order_code,
        amount: payosAmount,
        source: "payos_webhook",
        payos_order_code: orderCode,
        reference,
      },
    });

    // 5b. Handle subscription orders
    if (order.payment_method === "subscription") {
      try {
        const confirmHeaders: Record<string, string> = { "Content-Type": "application/json" };
        if (process.env.INTERNAL_WEBHOOK_SECRET) {
          confirmHeaders["Authorization"] = `Bearer ${process.env.INTERNAL_WEBHOOK_SECRET}`;
        }
        const confirmRes = await fetch(new URL("/api/subscriptions/confirm", req.url).toString(), {
          method: "POST",
          headers: confirmHeaders,
          body: JSON.stringify({ order_id: order.id }),
        });
        if (!confirmRes.ok) {
          console.warn("[PayOS] Subscription confirm failed:", await confirmRes.text());
        } else {
          console.log(`[PayOS] ✅ Subscription activated for order ${order.order_code}`);
        }
      } catch (subErr) {
        console.error("[PayOS] Subscription confirm error:", subErr);
      }
    }

    // 6. Enroll user in course
    if (order.user_id && order.product_id) {
      await supabase.from("enrollments").upsert({
        user_id: order.user_id,
        product_id: order.product_id,
        order_id: order.id,
        source: "purchase",
      });

      // 7. Upgrade tier if applicable
      const products = order.products as Record<string, unknown> | null;
      if (products?.tier_required === "vip") {
        await supabase
          .from("profiles")
          .update({ tier: "vip" })
          .eq("id", order.user_id);
      } else if (products?.tier_required === "member") {
        await supabase
          .from("profiles")
          .update({ tier: "member" })
          .eq("id", order.user_id);
      }

      // 8. Add purchase XP
      await supabase.from("xp_events").insert({
        user_id: order.user_id,
        action: "purchase",
        xp_amount: 500,
        meta: { order_id: order.id, product_id: order.product_id },
      });

      // 9. Send purchase confirmation email
      try {
        const { sendPurchaseConfirmation } = await import("@/lib/email/transactional");
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", order.user_id)
          .single();
        const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id);
        if (authUser?.user?.email) {
          await sendPurchaseConfirmation(
            authUser.user.email,
            profile?.full_name || "ban",
            (products?.name as string) || "San pham",
            order.amount,
            order.order_code
          ).catch((err) => console.error("[PayOS Webhook] Non-critical error:", err));
        }
      } catch {
        console.warn("[PayOS] Email confirmation failed (non-critical)");
      }

      // 10. Send Zalo OA notification
      try {
        const { notifyPurchaseViaZalo } = await import("@/lib/zalo-notifications");
        const { data: zaloProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", order.user_id)
          .single();
        await notifyPurchaseViaZalo(
          order.user_id,
          zaloProfile?.full_name || "ban",
          (products?.name as string) || "San pham",
          order.amount,
          order.order_code
        );
      } catch {
        console.warn("[PayOS] Zalo notification failed (non-critical)");
      }
    }

    // 11. Affiliate conversion attribution
    if (order.ref_code) {
      try {
        const { data: affiliate } = await supabase
          .from("affiliates")
          .select("id, user_id, commission_rate, total_earned, total_conversions")
          .eq("ref_code", order.ref_code)
          .eq("status", "active")
          .single();

        if (affiliate && affiliate.user_id !== order.user_id) {
          const commissionAmount = Math.round(
            order.amount * (affiliate.commission_rate / 100)
          );
          await supabase.from("affiliate_conversions").insert({
            affiliate_id: affiliate.id,
            order_id: order.id,
            buyer_id: order.user_id,
            product_id: order.product_id,
            order_amount: order.amount,
            commission_rate: affiliate.commission_rate,
            commission_amount: commissionAmount,
            status: "pending",
          });

          // Update affiliate stats (total_earned & total_conversions)
          await supabase
            .from("affiliates")
            .update({
              total_earned: affiliate.total_earned + commissionAmount,
              total_conversions: affiliate.total_conversions + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", affiliate.id);

          // Send affiliate commission email
          try {
            const { sendAffiliateCommissionEmail } = await import("@/lib/email/transactional");
            const { data: affProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", affiliate.user_id)
              .single();
            const { data: affAuth } = await supabase.auth.admin.getUserById(
              affiliate.user_id
            );
            if (affAuth?.user?.email) {
              await sendAffiliateCommissionEmail(
                affAuth.user.email,
                affProfile?.full_name || "ban",
                (order.products as Record<string, unknown>)?.name as string || "San pham",
                commissionAmount
              ).catch((err) => console.error("[PayOS Webhook] Non-critical error:", err));
            }
          } catch {
            // Non-critical
          }
          console.log(
            `[PayOS] Affiliate ${order.ref_code}: +${commissionAmount}d hoa hong`
          );
        }
      } catch (affErr) {
        console.error("[PayOS] Affiliate attribution error:", affErr);
      }
    }

    console.log(
      `[PayOS] Order ${order.order_code} paid successfully: ${payosAmount}d`
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PayOS Webhook Error]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
